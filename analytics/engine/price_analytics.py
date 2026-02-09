"""
Price Analytics Engine for SkateStock
Time-series analysis, discount pattern detection, and trend forecasting
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from decimal import Decimal
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
import psycopg2
from psycopg2.extras import RealDictCursor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PriceAnalyticsEngine:
    """
    Analytics engine for pricing trends and discount pattern detection

    Features:
    - Time-series price trend analysis
    - Discount pattern detection (flash sales, seasonal, clearance)
    - Price forecasting using ML models
    - Statistical anomaly detection
    """

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.conn = None

    def connect(self):
        """Connect to PostgreSQL database"""
        self.conn = psycopg2.connect(self.database_url)
        logger.info("Connected to analytics database")

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            self.conn = None

    def get_price_history(
        self,
        product_id: Optional[str] = None,
        source: Optional[str] = None,
        days: int = 30,
    ) -> pd.DataFrame:
        """
        Retrieve price history for analysis

        Args:
            product_id: Specific product ID (optional)
            source: Filter by source shop (optional)
            days: Number of days of history to retrieve

        Returns:
            DataFrame with price history
        """
        query = """
            SELECT 
                ph.product_id,
                p.title,
                p.brand,
                p.category,
                ph.source,
                ph.original_price,
                ph.sale_price,
                ph.discount_percentage,
                ph.availability,
                ph.recorded_at
            FROM price_history ph
            JOIN products p ON ph.product_id = p.product_id
            WHERE ph.recorded_at >= NOW() - INTERVAL '%s days'
        """
        params = [days]

        if product_id:
            query += " AND ph.product_id = %s"
            params.append(product_id)

        if source:
            query += " AND ph.source = %s"
            params.append(source)

        query += " ORDER BY ph.recorded_at DESC"

        df = pd.read_sql(query, self.conn, params=params)
        df["recorded_at"] = pd.to_datetime(df["recorded_at"])

        return df

    def detect_discount_patterns(
        self, product_id: Optional[str] = None, min_discount_pct: float = 10.0
    ) -> List[Dict[str, Any]]:
        """
        Detect discount patterns in price history

        Pattern Types:
        - flash_sale: Short duration (1-3 days), high discount
        - seasonal: Regular pattern (weekly/monthly)
        - clearance: Sustained discount, decreasing over time
        - price_error: Extreme discount (>80%)

        Returns:
            List of detected patterns with confidence scores
        """
        df = self.get_price_history(product_id=product_id, days=90)

        if df.empty:
            return []

        patterns = []

        # Group by product
        for pid, group in df.groupby("product_id"):
            group = group.sort_values("recorded_at")

            # Calculate metrics
            discounts = group["discount_percentage"].dropna()
            if len(discounts) < 2:
                continue

            avg_discount = discounts.mean()
            max_discount = discounts.max()
            std_discount = discounts.std()

            # Detect flash sale (short duration, high discount)
            if max_discount >= 30:
                flash_sale_periods = group[group["discount_percentage"] >= 30]
                if len(flash_sale_periods) <= 3:  # Short duration
                    patterns.append(
                        {
                            "product_id": pid,
                            "pattern_type": "flash_sale",
                            "discount_percentage": float(max_discount),
                            "confidence": 0.85,
                            "features": {
                                "duration_days": len(flash_sale_periods),
                                "avg_discount": float(avg_discount),
                            },
                        }
                    )

            # Detect seasonal pattern (regular intervals)
            if len(discounts) >= 4:
                # Check for weekly pattern
                group["day_of_week"] = group["recorded_at"].dt.dayofweek
                weekly_discounts = group.groupby("day_of_week")[
                    "discount_percentage"
                ].mean()

                if weekly_discounts.std() > 5:  # Significant variation by day
                    best_day = weekly_discounts.idxmax()
                    patterns.append(
                        {
                            "product_id": pid,
                            "pattern_type": "seasonal_weekly",
                            "discount_percentage": float(weekly_discounts.max()),
                            "confidence": 0.75,
                            "features": {
                                "best_day_of_week": int(best_day),
                                "day_name": [
                                    "Mon",
                                    "Tue",
                                    "Wed",
                                    "Thu",
                                    "Fri",
                                    "Sat",
                                    "Sun",
                                ][best_day],
                                "weekly_variation": float(weekly_discounts.std()),
                            },
                        }
                    )

            # Detect clearance (sustained discount)
            sustained_discounts = group[
                group["discount_percentage"] >= min_discount_pct
            ]
            if len(sustained_discounts) >= 7:  # Week or more
                # Check if discount is decreasing (clearance pattern)
                prices = sustained_discounts["sale_price"].values
                if len(prices) >= 3:
                    slope = np.polyfit(range(len(prices)), prices, 1)[0]
                    if slope < 0:  # Decreasing price
                        patterns.append(
                            {
                                "product_id": pid,
                                "pattern_type": "clearance",
                                "discount_percentage": float(
                                    sustained_discounts["discount_percentage"].iloc[-1]
                                ),
                                "confidence": 0.80,
                                "features": {
                                    "duration_days": len(sustained_discounts),
                                    "price_trend": (
                                        "decreasing" if slope < 0 else "stable"
                                    ),
                                    "total_discount_change": float(
                                        prices[0] - prices[-1]
                                    ),
                                },
                            }
                        )

            # Detect price error (extreme discount)
            if max_discount >= 80:
                patterns.append(
                    {
                        "product_id": pid,
                        "pattern_type": "price_error_suspected",
                        "discount_percentage": float(max_discount),
                        "confidence": 0.90,
                        "features": {
                            "is_likely_error": True,
                            "recommendation": "manual_review",
                        },
                    }
                )

        return patterns

    def forecast_price(self, product_id: str, days_ahead: int = 7) -> Dict[str, Any]:
        """
        Forecast future price using time-series analysis

        Uses polynomial regression on price history

        Args:
            product_id: Product to forecast
            days_ahead: Number of days to forecast

        Returns:
            Forecast results with confidence intervals
        """
        df = self.get_price_history(product_id=product_id, days=60)

        if len(df) < 5:
            return {
                "product_id": product_id,
                "forecast_available": False,
                "reason": "Insufficient data points",
            }

        df = df.sort_values("recorded_at")

        # Prepare data
        df["days_since_start"] = (df["recorded_at"] - df["recorded_at"].min()).dt.days
        X = df["days_since_start"].values.reshape(-1, 1)
        y = df["sale_price"].fillna(df["original_price"]).values

        # Fit polynomial regression
        poly_features = PolynomialFeatures(degree=min(2, len(df) - 1))
        X_poly = poly_features.fit_transform(X)

        model = LinearRegression()
        model.fit(X_poly, y)

        # Forecast
        future_days = np.array(
            [[df["days_since_start"].max() + i] for i in range(1, days_ahead + 1)]
        )
        future_days_poly = poly_features.transform(future_days)
        predictions = model.predict(future_days_poly)

        # Calculate confidence interval (simple std-based)
        residuals = y - model.predict(X_poly)
        std_residual = np.std(residuals)

        forecast_dates = [
            df["recorded_at"].max() + timedelta(days=i)
            for i in range(1, days_ahead + 1)
        ]

        return {
            "product_id": product_id,
            "forecast_available": True,
            "current_price": float(y[-1]),
            "forecast": [
                {
                    "date": d.isoformat(),
                    "predicted_price": round(float(p), 2),
                    "lower_bound": round(float(p) - 1.96 * std_residual, 2),
                    "upper_bound": round(float(p) + 1.96 * std_residual, 2),
                }
                for d, p in zip(forecast_dates, predictions)
            ],
            "trend": "increasing" if model.coef_[-1] > 0 else "decreasing",
            "confidence_score": max(0, 1 - (std_residual / np.mean(y))),
        }

    def get_market_insights(self, days: int = 30) -> Dict[str, Any]:
        """
        Generate market-wide pricing insights

        Returns:
            Summary statistics and trends across all products
        """
        df = self.get_price_history(days=days)

        if df.empty:
            return {"error": "No data available"}

        insights = {
            "period": f"{days} days",
            "total_products": df["product_id"].nunique(),
            "products_with_discounts": df[df["discount_percentage"] > 0][
                "product_id"
            ].nunique(),
            "avg_discount": float(df["discount_percentage"].mean()),
            "max_discount": float(df["discount_percentage"].max()),
            "discount_distribution": {
                "no_discount": int((df["discount_percentage"] == 0).sum()),
                "light (1-20%)": int(
                    (
                        (df["discount_percentage"] > 0)
                        & (df["discount_percentage"] <= 20)
                    ).sum()
                ),
                "moderate (21-40%)": int(
                    (
                        (df["discount_percentage"] > 20)
                        & (df["discount_percentage"] <= 40)
                    ).sum()
                ),
                "heavy (41-60%)": int(
                    (
                        (df["discount_percentage"] > 40)
                        & (df["discount_percentage"] <= 60)
                    ).sum()
                ),
                "extreme (60%+)": int((df["discount_percentage"] > 60).sum()),
            },
            "top_discounted_brands": df[df["discount_percentage"] > 0]
            .groupby("brand")["discount_percentage"]
            .mean()
            .sort_values(ascending=False)
            .head(5)
            .to_dict(),
            "category_discounts": df[df["discount_percentage"] > 0]
            .groupby("category")["discount_percentage"]
            .mean()
            .sort_values(ascending=False)
            .to_dict(),
        }

        return insights

    def detect_anomalies(
        self, product_id: Optional[str] = None, z_threshold: float = 2.5
    ) -> List[Dict[str, Any]]:
        """
        Detect price anomalies using statistical methods

        Args:
            product_id: Specific product (optional, all products if None)
            z_threshold: Z-score threshold for anomaly detection

        Returns:
            List of detected anomalies
        """
        df = self.get_price_history(product_id=product_id, days=30)

        if df.empty:
            return []

        anomalies = []

        for pid, group in df.groupby("product_id"):
            prices = group["sale_price"].dropna()
            if len(prices) < 3:
                continue

            # Calculate Z-scores
            z_scores = np.abs(stats.zscore(prices))
            anomaly_mask = z_scores > z_threshold

            if anomaly_mask.any():
                anomaly_rows = group[anomaly_mask]
                for _, row in anomaly_rows.iterrows():
                    anomalies.append(
                        {
                            "product_id": pid,
                            "title": row["title"],
                            "anomaly_type": "price_outlier",
                            "price": float(row["sale_price"]),
                            "z_score": float(z_scores[anomaly_mask].iloc[0]),
                            "timestamp": row["recorded_at"].isoformat(),
                            "severity": (
                                "high"
                                if z_scores[anomaly_mask].iloc[0] > 3
                                else "medium"
                            ),
                        }
                    )

        return anomalies


class AvailabilityPredictor:
    """
    Predict product availability using historical patterns
    """

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.conn = psycopg2.connect(database_url)

    def predict_availability(
        self, product_id: str, days_ahead: int = 7
    ) -> Dict[str, Any]:
        """
        Predict future availability based on historical patterns

        Uses simple heuristic-based prediction:
        - Recent out-of-stock events
        - Stock level trends
        - Product category patterns
        """
        query = """
            SELECT 
                availability,
                stock_quantity,
                recorded_at
            FROM price_history
            WHERE product_id = %s
            AND recorded_at >= NOW() - INTERVAL '30 days'
            ORDER BY recorded_at DESC
        """

        df = pd.read_sql(query, self.conn, params=[product_id])

        if df.empty:
            return {
                "product_id": product_id,
                "predicted_availability": "unknown",
                "confidence": 0.0,
            }

        df["recorded_at"] = pd.to_datetime(df["recorded_at"])

        # Calculate metrics
        recent_oos = (df["availability"] == "out_of_stock").sum()
        total_records = len(df)
        oos_rate = recent_oos / total_records if total_records > 0 else 0

        # Predict based on patterns
        if oos_rate > 0.5:
            prediction = "out_of_stock"
            confidence = min(0.9, oos_rate)
        elif oos_rate > 0.2:
            prediction = "low_stock"
            confidence = 0.6
        else:
            prediction = "in_stock"
            confidence = 0.8

        return {
            "product_id": product_id,
            "predicted_availability": prediction,
            "confidence": round(confidence, 2),
            "features": {
                "recent_oos_rate": round(oos_rate, 2),
                "total_records": total_records,
                "last_availability": (
                    df["availability"].iloc[0] if not df.empty else "unknown"
                ),
            },
        }


if __name__ == "__main__":
    # Example usage
    import os

    db_url = os.getenv(
        "DATABASE_URL",
        "postgresql://skatestock:skatestock_dev_password@localhost:5432/skatestock",
    )

    engine = PriceAnalyticsEngine(db_url)
    engine.connect()

    # Get market insights
    insights = engine.get_market_insights(days=30)
    print("Market Insights:", json.dumps(insights, indent=2, default=str))

    # Detect discount patterns
    patterns = engine.detect_discount_patterns(min_discount_pct=20)
    print(f"\nDetected {len(patterns)} discount patterns")

    engine.close()
