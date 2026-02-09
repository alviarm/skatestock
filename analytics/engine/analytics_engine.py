#!/usr/bin/env python3
"""
SkateStock Analytics Engine

Production-ready data mining and analytics engine for e-commerce intelligence.
Features:
- Time-series price trend analysis
- Discount pattern detection
- Availability forecasting
- Performance metrics aggregation

Supports: 5,000+ products daily from 5+ sources
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text
from redis import Redis
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression
import schedule
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("skatestock-analytics")


# ==========================================
# CONFIGURATION
# ==========================================


@dataclass
class Config:
    """Application configuration"""

    # Database
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "skatestock")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "skatestock")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "skatestock_dev_password")

    # Redis
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))

    # Analytics
    ANALYTICS_INTERVAL_MINUTES: int = int(os.getenv("ANYTICS_INTERVAL_MINUTES", "15"))

    @property
    def database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


# ==========================================
# DATA ACCESS LAYER
# ==========================================


class DataRepository:
    """Repository for database operations"""

    def __init__(self, config: Config):
        self.config = config
        self.engine = create_engine(config.database_url)
        self.redis = Redis(
            host=config.REDIS_HOST, port=config.REDIS_PORT, decode_responses=True
        )

    def get_price_history(self, days: int = 30) -> pd.DataFrame:
        """Fetch price history for trend analysis"""
        query = """
        SELECT 
            ph.id,
            ph.product_id,
            p.title,
            p.shop_id,
            s.name as shop_name,
            p.brand_id,
            b.name as brand_name,
            p.category_id,
            c.name as category_name,
            ph.original_price,
            ph.sale_price,
            ph.currency,
            ph.recorded_at
        FROM price_history ph
        JOIN products p ON ph.product_id = p.id
        JOIN shops s ON p.shop_id = s.id
        LEFT JOIN brands b ON p.brand_id = b.id
        LEFT JOIN product_categories c ON p.category_id = c.id
        WHERE ph.recorded_at >= CURRENT_DATE - INTERVAL '%s days'
        ORDER BY ph.recorded_at DESC
        """

        with self.engine.connect() as conn:
            df = pd.read_sql(query, conn, params=(days,))

        return df

    def get_current_products(self) -> pd.DataFrame:
        """Fetch current product catalog"""
        query = """
        SELECT 
            p.id,
            p.external_id,
            p.shop_id,
            s.name as shop_name,
            p.title,
            p.original_price,
            p.sale_price,
            p.discount_percentage,
            p.availability_status,
            p.category_id,
            c.name as category_name,
            p.brand_id,
            b.name as brand_name,
            p.last_seen_at,
            p.created_at
        FROM products p
        JOIN shops s ON p.shop_id = s.id
        LEFT JOIN product_categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.is_active = true
        """

        with self.engine.connect() as conn:
            df = pd.read_sql(query, conn)

        return df

    def get_product_metrics(self) -> Dict:
        """Get aggregated product metrics"""
        query = """
        SELECT 
            COUNT(*) as total_products,
            COUNT(DISTINCT shop_id) as active_shops,
            COUNT(*) FILTER (WHERE discount_percentage > 0) as discounted_products,
            AVG(discount_percentage) FILTER (WHERE discount_percentage > 0) as avg_discount,
            MAX(discount_percentage) as max_discount,
            COUNT(*) FILTER (WHERE availability_status = 'in_stock') as in_stock,
            COUNT(*) FILTER (WHERE availability_status = 'out_of_stock') as out_of_stock
        FROM products
        WHERE is_active = true
        """

        with self.engine.connect() as conn:
            result = conn.execute(text(query))
            row = result.fetchone()

        return {
            "total_products": row.total_products,
            "active_shops": row.active_shops,
            "discounted_products": row.discounted_products,
            "avg_discount": float(row.avg_discount) if row.avg_discount else 0,
            "max_discount": float(row.max_discount) if row.max_discount else 0,
            "in_stock": row.in_stock,
            "out_of_stock": row.out_of_stock,
        }

    def save_price_trends(self, trends_df: pd.DataFrame):
        """Save aggregated price trends"""
        query = """
        INSERT INTO price_trends 
        (category_id, brand_id, shop_id, date, avg_original_price, avg_sale_price, avg_discount_percentage, product_count)
        VALUES (:category_id, :brand_id, :shop_id, :date, :avg_original_price, :avg_sale_price, :avg_discount_percentage, :product_count)
        ON CONFLICT (category_id, brand_id, shop_id, date) 
        DO UPDATE SET
            avg_original_price = EXCLUDED.avg_original_price,
            avg_sale_price = EXCLUDED.avg_sale_price,
            avg_discount_percentage = EXCLUDED.avg_discount_percentage,
            product_count = EXCLUDED.product_count
        """

        with self.engine.connect() as conn:
            conn.execute(text(query), trends_df.to_dict("records"))
            conn.commit()

    def save_discount_pattern(self, pattern: Dict):
        """Save detected discount pattern"""
        query = """
        INSERT INTO discount_patterns 
        (product_id, pattern_type, confidence_score, start_date, end_date, price_before, price_after)
        VALUES (:product_id, :pattern_type, :confidence_score, :start_date, :end_date, :price_before, :price_after)
        """

        with self.engine.connect() as conn:
            conn.execute(text(query), pattern)
            conn.commit()

    def save_pipeline_metric(
        self, metric_name: str, value: float, unit: str, labels: Dict = None
    ):
        """Save pipeline performance metric"""
        query = """
        INSERT INTO pipeline_metrics (metric_name, metric_value, metric_unit, labels)
        VALUES (:metric_name, :metric_value, :metric_unit, :labels)
        """

        with self.engine.connect() as conn:
            conn.execute(
                text(query),
                {
                    "metric_name": metric_name,
                    "metric_value": value,
                    "metric_unit": unit,
                    "labels": json.dumps(labels) if labels else None,
                },
            )
            conn.commit()


# ==========================================
# ANALYTICS MODULES
# ==========================================


class PriceTrendAnalyzer:
    """Analyze price trends over time"""

    def __init__(self, repository: DataRepository):
        self.repository = repository

    def calculate_trends(self, days: int = 30) -> pd.DataFrame:
        """Calculate price trends by category, brand, and shop"""
        df = self.repository.get_price_history(days)

        if df.empty:
            logger.warning("No price history data available")
            return pd.DataFrame()

        # Group by dimensions
        trends = (
            df.groupby(
                [df["recorded_at"].dt.date, "category_id", "brand_id", "shop_id"]
            )
            .agg(
                {"original_price": "mean", "sale_price": "mean", "product_id": "count"}
            )
            .reset_index()
        )

        trends.columns = [
            "date",
            "category_id",
            "brand_id",
            "shop_id",
            "avg_original_price",
            "avg_sale_price",
            "product_count",
        ]

        # Calculate discount percentage
        trends["avg_discount_percentage"] = (
            (trends["avg_original_price"] - trends["avg_sale_price"])
            / trends["avg_original_price"]
            * 100
        ).fillna(0)

        return trends

    def detect_price_anomalies(self, product_id: int) -> List[Dict]:
        """Detect anomalous price changes for a product"""
        query = f"""
        SELECT sale_price, recorded_at
        FROM price_history
        WHERE product_id = {product_id}
        ORDER BY recorded_at
        """

        with self.repository.engine.connect() as conn:
            df = pd.read_sql(query, conn)

        if len(df) < 10:
            return []

        # Use Isolation Forest for anomaly detection
        prices = df["sale_price"].values.reshape(-1, 1)

        clf = IsolationForest(contamination=0.1, random_state=42)
        predictions = clf.fit_predict(prices)

        anomalies = []
        for idx, pred in enumerate(predictions):
            if pred == -1:  # Anomaly
                anomalies.append(
                    {
                        "product_id": product_id,
                        "price": float(prices[idx][0]),
                        "recorded_at": df.iloc[idx]["recorded_at"],
                        "anomaly_score": float(
                            clf.score_samples(prices[idx].reshape(1, -1))[0]
                        ),
                    }
                )

        return anomalies


class DiscountPatternDetector:
    """Detect discount patterns and flash sales"""

    def __init__(self, repository: DataRepository):
        self.repository = repository

    def detect_flash_sales(self, min_discount: float = 30.0) -> List[Dict]:
        """Detect flash sale patterns (sudden large discounts)"""
        df = self.repository.get_price_history(days=7)

        if df.empty:
            return []

        patterns = []

        # Group by product
        for product_id, group in df.groupby("product_id"):
            group = group.sort_values("recorded_at")

            if len(group) < 2:
                continue

            # Calculate price changes
            group["price_change"] = group["sale_price"].pct_change() * 100
            group["discount"] = (
                (group["original_price"] - group["sale_price"])
                / group["original_price"]
                * 100
            )

            # Detect flash sales (sudden drops followed by recovery)
            for i in range(1, len(group)):
                current = group.iloc[i]
                previous = group.iloc[i - 1]

                # Flash sale: discount > min_discount and sudden drop
                if (
                    current["discount"] >= min_discount
                    and current["price_change"] <= -20
                ):

                    patterns.append(
                        {
                            "product_id": product_id,
                            "pattern_type": "flash_sale",
                            "confidence_score": min(current["discount"] / 100, 1.0),
                            "start_date": current["recorded_at"].date(),
                            "end_date": None,
                            "price_before": float(previous["sale_price"]),
                            "price_after": float(current["sale_price"]),
                        }
                    )

        return patterns

    def detect_gradual_discounts(self) -> List[Dict]:
        """Detect gradual discount patterns"""
        df = self.repository.get_price_history(days=30)

        if df.empty:
            return []

        patterns = []

        for product_id, group in df.groupby("product_id"):
            group = group.sort_values("recorded_at")

            if len(group) < 5:
                continue

            # Fit linear regression to detect trends
            x = np.arange(len(group)).reshape(-1, 1)
            y = group["sale_price"].values

            model = LinearRegression()
            model.fit(x, y)

            slope = model.coef_[0]

            # Negative slope indicates gradual discount
            if slope < -1:  # Price dropping by more than $1 per period
                patterns.append(
                    {
                        "product_id": product_id,
                        "pattern_type": "gradual_discount",
                        "confidence_score": min(abs(slope) / 10, 1.0),
                        "start_date": group.iloc[0]["recorded_at"].date(),
                        "end_date": group.iloc[-1]["recorded_at"].date(),
                        "price_before": float(group.iloc[0]["sale_price"]),
                        "price_after": float(group.iloc[-1]["sale_price"]),
                    }
                )

        return patterns


class AvailabilityForecaster:
    """Forecast product availability using simple heuristics"""

    def __init__(self, repository: DataRepository):
        self.repository = repository

    def forecast_availability(self, days_ahead: int = 7) -> List[Dict]:
        """Forecast product availability"""
        # Get products with stock history
        query = """
        SELECT 
            p.id as product_id,
            p.availability_status,
            p.last_seen_at,
            COUNT(ph.id) as price_changes
        FROM products p
        LEFT JOIN price_history ph ON p.id = ph.product_id
        WHERE p.is_active = true
        GROUP BY p.id, p.availability_status, p.last_seen_at
        """

        with self.repository.engine.connect() as conn:
            df = pd.read_sql(query, conn)

        forecasts = []

        for _, row in df.iterrows():
            product_id = row["product_id"]
            current_status = row["availability_status"]

            # Simple heuristic: products with recent activity likely stay in stock
            days_since_seen = (datetime.now() - row["last_seen_at"]).days
            price_changes = row["price_changes"]

            if current_status == "in_stock":
                if days_since_seen > 7:
                    confidence = 0.6
                    predicted = "out_of_stock"
                else:
                    confidence = 0.85
                    predicted = "in_stock"
            else:
                confidence = 0.7
                predicted = "out_of_stock"

            for day in range(1, days_ahead + 1):
                forecast_date = datetime.now().date() + timedelta(days=day)

                forecasts.append(
                    {
                        "product_id": product_id,
                        "forecast_date": forecast_date,
                        "predicted_status": predicted,
                        "confidence_score": confidence,
                        "model_version": "v1.0-heuristic",
                    }
                )

        return forecasts


# ==========================================
# MAIN ENGINE
# ==========================================


class AnalyticsEngine:
    """Main analytics orchestrator"""

    def __init__(self):
        self.config = Config()
        self.repository = DataRepository(self.config)
        self.trend_analyzer = PriceTrendAnalyzer(self.repository)
        self.pattern_detector = DiscountPatternDetector(self.repository)
        self.availability_forecaster = AvailabilityForecaster(self.repository)

    def run_analytics_cycle(self):
        """Run a complete analytics cycle"""
        logger.info("Starting analytics cycle")
        start_time = time.time()

        try:
            # 1. Calculate price trends
            logger.info("Calculating price trends...")
            trends = self.trend_analyzer.calculate_trends(days=30)
            if not trends.empty:
                self.repository.save_price_trends(trends)
                logger.info(f"Saved {len(trends)} trend records")

            # 2. Detect discount patterns
            logger.info("Detecting discount patterns...")

            flash_sales = self.pattern_detector.detect_flash_sales()
            for pattern in flash_sales[:100]:  # Limit to top 100
                self.repository.save_discount_pattern(pattern)
            logger.info(f"Detected {len(flash_sales)} flash sales")

            gradual_discounts = self.pattern_detector.detect_gradual_discounts()
            for pattern in gradual_discounts[:100]:
                self.repository.save_discount_pattern(pattern)
            logger.info(f"Detected {len(gradual_discounts)} gradual discounts")

            # 3. Forecast availability
            logger.info("Forecasting availability...")
            forecasts = self.availability_forecaster.forecast_availability()
            logger.info(f"Generated {len(forecasts)} forecasts")

            # 4. Record metrics
            metrics = self.repository.get_product_metrics()
            self.repository.save_pipeline_metric(
                "analytics_cycle_products_analyzed", metrics["total_products"], "count"
            )

            cycle_duration = time.time() - start_time
            self.repository.save_pipeline_metric(
                "analytics_cycle_duration", cycle_duration, "seconds"
            )

            logger.info(f"Analytics cycle completed in {cycle_duration:.2f}s")

        except Exception as e:
            logger.error(f"Analytics cycle failed: {e}", exc_info=True)
            raise

    def run_continuous(self):
        """Run analytics continuously"""
        logger.info(
            f"Starting continuous analytics (interval: {self.config.ANALYTICS_INTERVAL_MINUTES}min)"
        )

        # Schedule regular runs
        schedule.every(self.config.ANALYTICS_INTERVAL_MINUTES).minutes.do(
            self.run_analytics_cycle
        )

        # Run immediately on startup
        self.run_analytics_cycle()

        # Keep running
        while True:
            schedule.run_pending()
            time.sleep(1)


# ==========================================
# ENTRY POINT
# ==========================================

if __name__ == "__main__":
    engine = AnalyticsEngine()
    engine.run_continuous()
