#!/usr/bin/env python3
"""
SkateStock BI Dashboard
Interactive Plotly Dash application for e-commerce data visualization.

Features:
- Real-time price trend charts
- Discount heatmaps by brand/category
- Availability alerts panel
- Data freshness indicators
- Performance metrics
"""

import os
from datetime import datetime, timedelta
from typing import Dict, List

import dash
from dash import dcc, html, Input, Output
import dash_bootstrap_components as dbc
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
from sqlalchemy import create_engine, text
from redis import Redis

# ==========================================
# CONFIGURATION
# ==========================================

DB_URL = f"postgresql://{os.getenv('POSTGRES_USER', 'skatestock')}:{os.getenv('POSTGRES_PASSWORD', 'skatestock_dev_password')}@{os.getenv('POSTGRES_HOST', 'localhost')}:{os.getenv('POSTGRES_PORT', '5432')}/{os.getenv('POSTGRES_DB', 'skatestock')}"

redis_client = Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", "6379")),
    decode_responses=True,
)

engine = create_engine(DB_URL)

# ==========================================
# DATA FETCHING
# ==========================================


def get_price_trends(days: int = 30) -> pd.DataFrame:
    """Fetch price trends for visualization"""
    query = """
    SELECT 
        date,
        category_id,
        brand_id,
        shop_id,
        avg_original_price,
        avg_sale_price,
        avg_discount_percentage,
        product_count
    FROM price_trends
    WHERE date >= CURRENT_DATE - INTERVAL '%s days'
    ORDER BY date DESC
    """
    with engine.connect() as conn:
        return pd.read_sql(query, conn, params=(days,))


def get_products_summary() -> Dict:
    """Get product summary statistics"""
    query = """
    SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT shop_id) as shops,
        AVG(discount_percentage) as avg_discount,
        MAX(discount_percentage) as max_discount,
        COUNT(*) FILTER (WHERE discount_percentage > 0) as on_sale
    FROM products
    WHERE is_active = true
    """
    with engine.connect() as conn:
        result = conn.execute(text(query))
        row = result.fetchone()
    return {
        "total": row.total,
        "shops": row.shops,
        "avg_discount": f"{row.avg_discount:.1f}%" if row.avg_discount else "0%",
        "max_discount": f"{row.max_discount:.0f}%" if row.max_discount else "0%",
        "on_sale": row.on_sale,
    }


def get_discounts_by_category() -> pd.DataFrame:
    """Get discounts grouped by category"""
    query = """
    SELECT 
        COALESCE(c.name, 'Unknown') as category,
        COUNT(*) as product_count,
        AVG(p.discount_percentage) as avg_discount,
        MAX(p.discount_percentage) as max_discount
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE p.is_active = true
    GROUP BY c.name
    ORDER BY avg_discount DESC
    """
    with engine.connect() as conn:
        return pd.read_sql(query, conn)


def get_discounts_by_shop() -> pd.DataFrame:
    """Get discounts grouped by shop"""
    query = """
    SELECT 
        s.display_name as shop,
        COUNT(*) as product_count,
        AVG(p.discount_percentage) as avg_discount,
        MAX(p.discount_percentage) as max_discount,
        COUNT(*) FILTER (WHERE p.discount_percentage > 0) as sale_items
    FROM products p
    JOIN shops s ON p.shop_id = s.id
    WHERE p.is_active = true
    GROUP BY s.display_name
    ORDER BY sale_items DESC
    """
    with engine.connect() as conn:
        return pd.read_sql(query, conn)


def get_recent_alerts(limit: int = 10) -> List[Dict]:
    """Get recent alerts"""
    query = """
    SELECT 
        a.alert_type,
        a.severity,
        a.message,
        a.triggered_at,
        p.title as product_title
    FROM alerts a
    LEFT JOIN products p ON a.product_id = p.id
    ORDER BY a.triggered_at DESC
    LIMIT %s
    """
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params=(limit,))
    return df.to_dict("records")


def get_pipeline_metrics() -> pd.DataFrame:
    """Get pipeline performance metrics"""
    query = """
    SELECT 
        metric_name,
        metric_value,
        metric_unit,
        labels,
        recorded_at
    FROM pipeline_metrics
    WHERE recorded_at >= CURRENT_DATE - INTERVAL '1 day'
    ORDER BY recorded_at DESC
    LIMIT 100
    """
    with engine.connect() as conn:
        return pd.read_sql(query, conn)


# ==========================================
# DASHBOARD LAYOUT
# ==========================================

app = dash.Dash(__name__, external_stylesheets=[dbc.themes.DARKLY])
app.title = "SkateStock BI Dashboard"
server = app.server


def create_kpi_card(
    title: str, value: str, subtitle: str = None, color: str = "primary"
):
    """Create a KPI card component"""
    return dbc.Card(
        dbc.CardBody(
            [
                html.H6(title, className="card-subtitle text-muted"),
                html.H3(value, className=f"card-title text-{color}"),
                html.Small(subtitle, className="text-muted") if subtitle else None,
            ]
        ),
        className="mb-4 shadow",
    )


app.layout = dbc.Container(
    [
        # Header
        dbc.Row(
            [
                dbc.Col(
                    [
                        html.H1(
                            [
                                html.Span("Skate", style={"color": "#dc3545"}),
                                html.Span("Stock"),
                            ],
                            className="mt-4 mb-2",
                        ),
                        html.P(
                            "E-commerce Data Intelligence Platform",
                            className="text-muted",
                        ),
                        html.P(id="last-updated", className="text-muted small"),
                    ]
                )
            ]
        ),
        # KPI Cards
        dbc.Row(
            [
                dbc.Col(
                    create_kpi_card("Total Products", "0", "Across 5 shops", "info"),
                    width=3,
                    id="kpi-total",
                ),
                dbc.Col(
                    create_kpi_card("On Sale", "0", "Active discounts", "success"),
                    width=3,
                    id="kpi-sale",
                ),
                dbc.Col(
                    create_kpi_card(
                        "Avg Discount", "0%", "Store-wide average", "warning"
                    ),
                    width=3,
                    id="kpi-avg",
                ),
                dbc.Col(
                    create_kpi_card(
                        "Max Discount", "0%", "Best deal available", "danger"
                    ),
                    width=3,
                    id="kpi-max",
                ),
            ],
            className="mb-4",
        ),
        # Charts Row 1
        dbc.Row(
            [
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardHeader("Discounts by Category"),
                                dbc.CardBody(
                                    dcc.Graph(
                                        id="chart-category",
                                        config={"displayModeBar": False},
                                    )
                                ),
                            ],
                            className="shadow mb-4",
                        )
                    ],
                    width=6,
                ),
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardHeader("Shop Comparison"),
                                dbc.CardBody(
                                    dcc.Graph(
                                        id="chart-shop",
                                        config={"displayModeBar": False},
                                    )
                                ),
                            ],
                            className="shadow mb-4",
                        )
                    ],
                    width=6,
                ),
            ]
        ),
        # Charts Row 2
        dbc.Row(
            [
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardHeader("Price Trends Over Time"),
                                dbc.CardBody(
                                    dcc.Graph(
                                        id="chart-trends",
                                        config={"displayModeBar": True},
                                    )
                                ),
                            ],
                            className="shadow mb-4",
                        )
                    ],
                    width=8,
                ),
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardHeader("Recent Alerts"),
                                dbc.CardBody(id="alerts-panel"),
                            ],
                            className="shadow mb-4",
                        )
                    ],
                    width=4,
                ),
            ]
        ),
        # Footer
        dbc.Row(
            [
                dbc.Col(
                    [
                        html.Hr(),
                        html.P(
                            [
                                "SkateStock Data Intelligence Platform | ",
                                html.A("Documentation", href="#"),
                                " | ",
                                html.A(
                                    "GitHub",
                                    href="https://github.com/alviarm/skatestock",
                                ),
                            ],
                            className="text-muted text-center small",
                        ),
                    ]
                )
            ]
        ),
        # Auto-refresh interval
        dcc.Interval(
            id="interval-component", interval=30000, n_intervals=0
        ),  # 30 seconds
    ],
    fluid=True,
    className="dbc",
)

# ==========================================
# CALLBACKS
# ==========================================


@app.callback(
    [
        Output("kpi-total", "children"),
        Output("kpi-sale", "children"),
        Output("kpi-avg", "children"),
        Output("kpi-max", "children"),
        Output("last-updated", "children"),
    ],
    Input("interval-component", "n_intervals"),
)
def update_kpis(n):
    """Update KPI cards"""
    summary = get_products_summary()

    updated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    return (
        create_kpi_card(
            "Total Products",
            f"{summary['total']:,}",
            f"Across {summary['shops']} shops",
            "info",
        ),
        create_kpi_card(
            "On Sale", f"{summary['on_sale']:,}", "Active discounts", "success"
        ),
        create_kpi_card(
            "Avg Discount", summary["avg_discount"], "Store-wide average", "warning"
        ),
        create_kpi_card(
            "Max Discount", summary["max_discount"], "Best deal available", "danger"
        ),
        f"Last updated: {updated}",
    )


@app.callback(
    Output("chart-category", "figure"), Input("interval-component", "n_intervals")
)
def update_category_chart(n):
    """Update category discount chart"""
    df = get_discounts_by_category()

    if df.empty:
        return go.Figure().update_layout(title="No data available")

    fig = px.bar(
        df,
        x="category",
        y="avg_discount",
        color="avg_discount",
        color_continuous_scale="RdYlGn",
        title="Average Discount by Category",
        labels={"avg_discount": "Avg Discount %", "category": "Category"},
    )
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=40, r=40, t=40, b=40),
    )
    return fig


@app.callback(
    Output("chart-shop", "figure"), Input("interval-component", "n_intervals")
)
def update_shop_chart(n):
    """Update shop comparison chart"""
    df = get_discounts_by_shop()

    if df.empty:
        return go.Figure().update_layout(title="No data available")

    fig = go.Figure(
        data=[
            go.Bar(
                name="Total Products",
                x=df["shop"],
                y=df["product_count"],
                marker_color="steelblue",
            ),
            go.Bar(
                name="Sale Items",
                x=df["shop"],
                y=df["sale_items"],
                marker_color="crimson",
            ),
        ]
    )
    fig.update_layout(
        barmode="group",
        title="Products by Shop",
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=40, r=40, t=40, b=40),
    )
    return fig


@app.callback(
    Output("chart-trends", "figure"), Input("interval-component", "n_intervals")
)
def update_trends_chart(n):
    """Update price trends chart"""
    df = get_price_trends(days=30)

    if df.empty:
        return go.Figure().update_layout(title="No trend data available")

    fig = go.Figure()

    # Group by shop
    for shop_id in df["shop_id"].unique():
        shop_data = df[df["shop_id"] == shop_id].sort_values("date")
        fig.add_trace(
            go.Scatter(
                x=shop_data["date"],
                y=shop_data["avg_discount_percentage"],
                mode="lines+markers",
                name=f"Shop {shop_id}",
                line=dict(width=2),
            )
        )

    fig.update_layout(
        title="Average Discount Trends (30 Days)",
        xaxis_title="Date",
        yaxis_title="Avg Discount %",
        template="plotly_dark",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        hovermode="x unified",
    )
    return fig


@app.callback(
    Output("alerts-panel", "children"), Input("interval-component", "n_intervals")
)
def update_alerts(n):
    """Update alerts panel"""
    alerts = get_recent_alerts(limit=10)

    if not alerts:
        return html.P("No recent alerts", className="text-muted")

    alert_items = []
    for alert in alerts:
        color = (
            "danger"
            if alert["severity"] == "critical"
            else "warning" if alert["severity"] == "warning" else "info"
        )
        alert_items.append(
            dbc.Alert(
                [
                    html.Strong(alert["alert_type"].replace("_", " ").title()),
                    html.Br(),
                    html.Small(alert["message"]),
                    html.Br(),
                    html.Small(
                        alert["triggered_at"].strftime("%Y-%m-%d %H:%M"),
                        className="text-muted",
                    ),
                ],
                color=color,
                className="py-2 mb-2",
            )
        )

    return alert_items


# ==========================================
# ENTRY POINT
# ==========================================

if __name__ == "__main__":
    app.run_server(
        host="0.0.0.0",
        port=8050,
        debug=os.getenv("DASH_DEBUG", "false").lower() == "true",
    )
