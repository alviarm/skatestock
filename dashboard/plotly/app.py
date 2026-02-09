#!/usr/bin/env python3
"""
SkateStock BI Dashboard

Interactive Plotly Dash dashboard for e-commerce analytics:
- Real-time price trend charts
- Discount heatmaps by brand/category
- Availability alerts panel
- Data freshness indicators

Supports: 5,000+ products from 5+ sources
"""

import os
from datetime import datetime, timedelta

import dash
from dash import dcc, html, Input, Output
import dash_bootstrap_components as dbc
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import pandas as pd
from sqlalchemy import create_engine, text

# ==========================================
# CONFIGURATION
# ==========================================

DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "skatestock")
DB_USER = os.getenv("POSTGRES_USER", "skatestock")
DB_PASS = os.getenv("POSTGRES_PASSWORD", "skatestock_dev_password")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# ==========================================
# DATA ACCESS
# ==========================================


def get_engine():
    return create_engine(DATABASE_URL)


def get_price_trends(days=30):
    """Fetch price trends data"""
    query = """
    SELECT 
        date,
        c.display_name as category,
        s.display_name as shop,
        avg_sale_price,
        avg_discount_percentage,
        product_count
    FROM price_trends pt
    LEFT JOIN product_categories c ON pt.category_id = c.id
    LEFT JOIN shops s ON pt.shop_id = s.id
    WHERE date >= CURRENT_DATE - INTERVAL '%s days'
    ORDER BY date DESC
    """
    engine = get_engine()
    return pd.read_sql(query, engine, params=(days,))


def get_product_metrics():
    """Fetch current product metrics"""
    query = """
    SELECT 
        COUNT(*) as total_products,
        COUNT(DISTINCT shop_id) as active_shops,
        COUNT(*) FILTER (WHERE discount_percentage > 0) as discounted,
        AVG(discount_percentage) FILTER (WHERE discount_percentage > 0) as avg_discount,
        MAX(discount_percentage) as max_discount
    FROM products
    WHERE is_active = true
    """
    engine = get_engine()
    return pd.read_sql(query, engine).iloc[0]


def get_discounts_by_category():
    """Fetch discounts grouped by category"""
    query = """
    SELECT 
        COALESCE(c.display_name, 'Unknown') as category,
        COUNT(*) as product_count,
        AVG(discount_percentage) as avg_discount,
        MAX(discount_percentage) as max_discount
    FROM products p
    LEFT JOIN product_categories c ON p.category_id = c.id
    WHERE p.is_active = true AND p.discount_percentage > 0
    GROUP BY c.display_name
    ORDER BY avg_discount DESC
    """
    engine = get_engine()
    return pd.read_sql(query, engine)


def get_recent_products(limit=20):
    """Fetch recently added products"""
    query = """
    SELECT 
        p.title,
        p.sale_price,
        p.discount_percentage,
        s.display_name as shop,
        p.created_at
    FROM products p
    JOIN shops s ON p.shop_id = s.id
    WHERE p.is_active = true
    ORDER BY p.created_at DESC
    LIMIT %s
    """
    engine = get_engine()
    return pd.read_sql(query, engine, params=(limit,))


def get_pipeline_metrics():
    """Fetch pipeline performance metrics"""
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
    engine = get_engine()
    return pd.read_sql(query, engine)


# ==========================================
# DASHBOARD LAYOUT
# ==========================================

app = dash.Dash(__name__, external_stylesheets=[dbc.themes.DARKLY])
app.title = "SkateStock Analytics Dashboard"

app.layout = dbc.Container(
    [
        # Header
        dbc.Row(
            [
                dbc.Col(
                    [
                        html.H1("SkateStock Analytics", className="text-primary mb-2"),
                        html.P(
                            "E-commerce Data Intelligence Platform | 5,000+ Products Daily",
                            className="text-muted",
                        ),
                    ],
                    width=12,
                )
            ],
            className="mb-4 mt-4",
        ),
        # KPI Cards
        dbc.Row(
            [
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardBody(
                                    [
                                        html.H4(
                                            id="kpi-total-products",
                                            className="card-title text-info",
                                        ),
                                        html.P(
                                            "Total Products",
                                            className="card-text text-muted",
                                        ),
                                    ]
                                )
                            ],
                            className="shadow",
                        )
                    ],
                    width=3,
                ),
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardBody(
                                    [
                                        html.H4(
                                            id="kpi-discounted",
                                            className="card-title text-success",
                                        ),
                                        html.P(
                                            "On Sale", className="card-text text-muted"
                                        ),
                                    ]
                                )
                            ],
                            className="shadow",
                        )
                    ],
                    width=3,
                ),
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardBody(
                                    [
                                        html.H4(
                                            id="kpi-avg-discount",
                                            className="card-title text-warning",
                                        ),
                                        html.P(
                                            "Avg Discount",
                                            className="card-text text-muted",
                                        ),
                                    ]
                                )
                            ],
                            className="shadow",
                        )
                    ],
                    width=3,
                ),
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardBody(
                                    [
                                        html.H4(
                                            id="kpi-active-shops",
                                            className="card-title text-primary",
                                        ),
                                        html.P(
                                            "Active Shops",
                                            className="card-text text-muted",
                                        ),
                                    ]
                                )
                            ],
                            className="shadow",
                        )
                    ],
                    width=3,
                ),
            ],
            className="mb-4",
        ),
        # Main Charts Row
        dbc.Row(
            [
                # Price Trends
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardHeader("Price Trends Over Time"),
                                dbc.CardBody(
                                    [
                                        dcc.Graph(
                                            id="price-trends-chart",
                                            style={"height": "400px"},
                                        )
                                    ]
                                ),
                            ],
                            className="shadow mb-4",
                        )
                    ],
                    width=8,
                ),
                # Discount Heatmap
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardHeader("Discounts by Category"),
                                dbc.CardBody(
                                    [
                                        dcc.Graph(
                                            id="discount-heatmap",
                                            style={"height": "400px"},
                                        )
                                    ]
                                ),
                            ],
                            className="shadow mb-4",
                        )
                    ],
                    width=4,
                ),
            ]
        ),
        # Second Row
        dbc.Row(
            [
                # Recent Products
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardHeader("Recently Added Products"),
                                dbc.CardBody([html.Div(id="recent-products-table")]),
                            ],
                            className="shadow mb-4",
                        )
                    ],
                    width=6,
                ),
                # Pipeline Metrics
                dbc.Col(
                    [
                        dbc.Card(
                            [
                                dbc.CardHeader("Pipeline Performance"),
                                dbc.CardBody(
                                    [
                                        dcc.Graph(
                                            id="pipeline-metrics-chart",
                                            style={"height": "300px"},
                                        )
                                    ]
                                ),
                            ],
                            className="shadow mb-4",
                        )
                    ],
                    width=6,
                ),
            ]
        ),
        # Refresh Interval
        dcc.Interval(
            id="interval-component", interval=30000, n_intervals=0
        ),  # 30 seconds
        # Footer
        html.Hr(),
        html.P(
            [
                "SkateStock Data Intelligence Platform | ",
                html.Span(id="last-updated", className="text-muted"),
            ],
            className="text-center text-muted",
        ),
    ],
    fluid=True,
)

# ==========================================
# CALLBACKS
# ==========================================


@app.callback(
    [
        Output("kpi-total-products", "children"),
        Output("kpi-discounted", "children"),
        Output("kpi-avg-discount", "children"),
        Output("kpi-active-shops", "children"),
        Output("last-updated", "children"),
    ],
    [Input("interval-component", "n_intervals")],
)
def update_kpis(n):
    try:
        metrics = get_product_metrics()
        return (
            f"{metrics['total_products']:,}",
            f"{metrics['discounted']:,}",
            f"{metrics['avg_discount']:.1f}%",
            f"{int(metrics['active_shops'])}",
        ), f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    except Exception as e:
        return "N/A", "N/A", "N/A", "N/A", f"Error: {str(e)}"


@app.callback(
    Output("price-trends-chart", "figure"), [Input("interval-component", "n_intervals")]
)
def update_price_trends(n):
    try:
        df = get_price_trends(days=30)

        if df.empty:
            return go.Figure().update_layout(title="No data available")

        fig = px.line(
            df,
            x="date",
            y="avg_sale_price",
            color="shop",
            title="Average Sale Price by Shop",
            labels={"avg_sale_price": "Price ($)", "date": "Date"},
        )
        fig.update_layout(template="plotly_dark")
        return fig
    except Exception as e:
        return go.Figure().update_layout(title=f"Error: {str(e)}")


@app.callback(
    Output("discount-heatmap", "figure"), [Input("interval-component", "n_intervals")]
)
def update_discount_heatmap(n):
    try:
        df = get_discounts_by_category()

        if df.empty:
            return go.Figure().update_layout(title="No discount data")

        fig = px.bar(
            df,
            x="category",
            y="avg_discount",
            color="max_discount",
            title="Average Discount by Category",
            labels={"avg_discount": "Avg Discount %", "category": ""},
        )
        fig.update_layout(template="plotly_dark", xaxis_tickangle=-45)
        return fig
    except Exception as e:
        return go.Figure().update_layout(title=f"Error: {str(e)}")


@app.callback(
    Output("recent-products-table", "children"),
    [Input("interval-component", "n_intervals")],
)
def update_recent_products(n):
    try:
        df = get_recent_products(limit=10)

        if df.empty:
            return html.P("No recent products")

        table_header = [
            html.Thead(
                html.Tr(
                    [
                        html.Th("Product"),
                        html.Th("Shop"),
                        html.Th("Price"),
                        html.Th("Discount"),
                    ]
                )
            )
        ]

        table_body = [
            html.Tbody(
                [
                    html.Tr(
                        [
                            html.Td(
                                row["title"][:40] + "..."
                                if len(row["title"]) > 40
                                else row["title"]
                            ),
                            html.Td(row["shop"]),
                            html.Td(
                                f"${row['sale_price']:.2f}"
                                if pd.notna(row["sale_price"])
                                else "N/A"
                            ),
                            html.Td(
                                f"{row['discount_percentage']:.0f}%"
                                if pd.notna(row["discount_percentage"])
                                and row["discount_percentage"] > 0
                                else "-"
                            ),
                        ]
                    )
                    for _, row in df.iterrows()
                ]
            )
        ]

        return dbc.Table(
            table_header + table_body,
            striped=True,
            bordered=True,
            hover=True,
            size="sm",
        )
    except Exception as e:
        return html.P(f"Error: {str(e)}")


@app.callback(
    Output("pipeline-metrics-chart", "figure"),
    [Input("interval-component", "n_intervals")],
)
def update_pipeline_metrics(n):
    try:
        df = get_pipeline_metrics()

        if df.empty:
            return go.Figure().update_layout(title="No metrics available")

        # Filter for latency metrics
        latency_df = df[df["metric_name"].str.contains("latency", case=False)]

        if latency_df.empty:
            return go.Figure().update_layout(title="No latency data")

        fig = px.scatter(
            latency_df,
            x="recorded_at",
            y="metric_value",
            color="metric_name",
            title="Processing Latency Over Time",
            labels={"metric_value": "Latency (ms)", "recorded_at": "Time"},
        )
        fig.update_layout(template="plotly_dark")
        return fig
    except Exception as e:
        return go.Figure().update_layout(title=f"Error: {str(e)}")


# ==========================================
# ENTRY POINT
# ==========================================

if __name__ == "__main__":
    app.run_server(host="0.0.0.0", port=8050, debug=False)
