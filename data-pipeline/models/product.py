"""
Product Data Models for SkateStock Data Pipeline
Pydantic models with type hints for product data validation
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
import uuid


class ProductCategory(str, Enum):
    """Skateboarding product categories"""

    DECKS = "decks"
    TRUCKS = "trucks"
    WHEELS = "wheels"
    BEARINGS = "bearings"
    HARDWARE = "hardware"
    SHOES = "shoes"
    APPAREL = "apparel"
    ACCESSORIES = "accessories"
    UNKNOWN = "unknown"


class ProductBrand(str, Enum):
    """Major skateboarding brands"""

    BAKER = "Baker"
    THRASHER = "Thrasher"
    INDEPENDENT = "Independent"
    SPITFIRE = "Spitfire"
    VANS = "Vans"
    NIKE_SB = "Nike SB"
    ADIDAS_SKATE = "Adidas Skateboarding"
    CONS = "Converse CONS"
    EMERICA = "Emerica"
    ES = "eS"
    ETNIES = "Etnies"
    FALLEN = "Fallen"
    LAKAI = "Lakai"
    NEW_BALANCE = "New Balance Numeric"
    DC_SHOES = "DC Shoes"
    SUPREME = "Supreme"
    PALACE = "Palace"
    FTC = "FTC"
    HUF = "HUF"
    STUSSY = "Stüssy"
    UNKNOWN = "Unknown"


class ShopSource(str, Enum):
    """Data source shops"""

    SEASONS = "seasons_skateshop"
    PREMIER = "premier_store"
    LABOR = "labor_skateshop"
    NJ = "nj_skateshop"
    BLACKSHEEP = "blacksheep_skateshop"
    TACTICS = "tactics"
    CCS = "ccs"
    SKATE_WAREHOUSE = "skate_warehouse"
    ZUMIEZ = "zumiez"


class PricePoint(BaseModel):
    """Price information for a product"""

    currency: str = Field(default="USD", description="ISO 4217 currency code")
    original_price: Optional[Decimal] = Field(
        None, description="MSRP or original price"
    )
    sale_price: Optional[Decimal] = Field(None, description="Current sale price")
    discount_percentage: Optional[float] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = None

    @validator("discount_percentage", always=True)
    def calculate_discount(cls, v, values):
        if v is not None:
            return v
        if values.get("original_price") and values.get("sale_price"):
            original = float(values["original_price"])
            sale = float(values["sale_price"])
            if original > 0:
                return round((original - sale) / original * 100, 2)
        return None


class ProductAvailability(str, Enum):
    """Product availability status"""

    IN_STOCK = "in_stock"
    OUT_OF_STOCK = "out_of_stock"
    LOW_STOCK = "low_stock"
    PREORDER = "preorder"
    BACKORDER = "backorder"
    UNKNOWN = "unknown"


class ProductDimensions(BaseModel):
    """Physical product dimensions"""

    width: Optional[float] = None  # inches
    length: Optional[float] = None  # inches
    weight: Optional[float] = None  # pounds
    wheel_size: Optional[int] = None  # mm
    truck_size: Optional[str] = None  # e.g., "139", "149"


class RawProductEvent(BaseModel):
    """
    Raw product event from scrapers before normalization
    Used as Kafka message schema
    """

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_timestamp: datetime = Field(default_factory=datetime.utcnow)
    source: ShopSource
    raw_data: Dict[str, Any]

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat(), Decimal: lambda v: str(v)}


class Product(BaseModel):
    """
    Normalized product model
    This is the canonical representation after ETL processing
    """

    # Identifiers
    product_id: str = Field(..., description="Unique product identifier")
    source_product_id: Optional[str] = Field(
        None, description="Original ID from source"
    )
    sku: Optional[str] = None

    # Basic Info
    title: str
    description: Optional[str] = None
    brand: ProductBrand = ProductBrand.UNKNOWN
    category: ProductCategory = ProductCategory.UNKNOWN

    # Pricing
    price: PricePoint

    # Media
    image_url: Optional[str] = None
    additional_images: List[str] = Field(default_factory=list)

    # Source & Linking
    source: ShopSource
    product_url: str

    # Availability
    availability: ProductAvailability = ProductAvailability.UNKNOWN
    stock_quantity: Optional[int] = None

    # Metadata
    dimensions: Optional[ProductDimensions] = None
    color: Optional[str] = None
    size: Optional[str] = None

    # Timestamps
    scraped_at: datetime
    normalized_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    # Data Quality
    confidence_score: float = Field(default=1.0, ge=0, le=1)
    validation_errors: List[str] = Field(default_factory=list)

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat(), Decimal: lambda v: str(v)}


class ProductPriceHistory(BaseModel):
    """Price history record for trend analysis"""

    product_id: str
    timestamp: datetime
    original_price: Optional[Decimal]
    sale_price: Optional[Decimal]
    availability: ProductAvailability
    source: ShopSource

    class Config:
        json_encoders = {datetime: lambda v: v.isoformat(), Decimal: lambda v: str(v)}


class DiscountPattern(BaseModel):
    """Detected discount pattern for analytics"""

    product_id: str
    pattern_type: str  # e.g., "flash_sale", "seasonal", "clearance"
    discount_percentage: float
    start_date: datetime
    end_date: Optional[datetime] = None
    confidence: float
    detected_at: datetime = Field(default_factory=datetime.utcnow)


class AvailabilityForecast(BaseModel):
    """ML-based availability prediction"""

    product_id: str
    predicted_availability: ProductAvailability
    confidence: float
    prediction_date: datetime
    features_used: Dict[str, Any]


# Avro Schema Definitions for Kafka
PRODUCT_EVENT_AVRO_SCHEMA = {
    "type": "record",
    "name": "ProductEvent",
    "namespace": "com.skatestock.events",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "event_timestamp", "type": "string"},
        {"name": "source", "type": "string"},
        {"name": "product_id", "type": "string"},
        {"name": "title", "type": "string"},
        {"name": "brand", "type": ["null", "string"], "default": None},
        {"name": "category", "type": "string"},
        {"name": "original_price", "type": ["null", "string"], "default": None},
        {"name": "sale_price", "type": ["null", "string"], "default": None},
        {"name": "currency", "type": "string", "default": "USD"},
        {"name": "image_url", "type": ["null", "string"], "default": None},
        {"name": "product_url", "type": "string"},
        {"name": "availability", "type": "string", "default": "unknown"},
        {"name": "scraped_at", "type": "string"},
        {"name": "confidence_score", "type": "double", "default": 1.0},
    ],
}

DEAD_LETTER_EVENT_AVRO_SCHEMA = {
    "type": "record",
    "name": "DeadLetterEvent",
    "namespace": "com.skatestock.errors",
    "fields": [
        {"name": "event_id", "type": "string"},
        {"name": "original_event", "type": "string"},
        {"name": "error_message", "type": "string"},
        {"name": "error_type", "type": "string"},
        {"name": "failed_at", "type": "string"},
        {"name": "retry_count", "type": "int", "default": 0},
        {"name": "source", "type": "string"},
    ],
}
