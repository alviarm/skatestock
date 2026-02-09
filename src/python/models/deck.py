"""
Deck Model - Skateboard Deck Specifications

Represents street skating deck specifications with domain-specific attributes
for brands popular in the street skating community.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class ConcaveType(str, Enum):
    """Deck concave profiles for different skating styles."""

    MILD = "mild"  # Better for beginners, stable
    MEDIUM = "medium"  # Standard street skating concave
    STEEP = "steep"  # Aggressive flick, popular for technical tricks
    FULL = "full"  # Maximum concave, old school feel


class Deck(BaseModel):
    """
    Skateboard deck with street skating specifications.

    Typical street skating setups:
    - Width: 7.75" - 8.5" (8.0-8.25" most popular)
    - Length: 31" - 32.5"
    - Concave: Medium to Steep for flip tricks
    """

    # Identity
    id: UUID = Field(default_factory=uuid4)
    sku: str = Field(..., description="Retailer-specific SKU")

    # Physical Specifications
    width_inches: Decimal = Field(
        ...,
        ge=Decimal("7.0"),
        le=Decimal("10.0"),
        description="Deck width in inches (street: 7.75-8.5)",
    )
    length_inches: Decimal = Field(
        ..., ge=Decimal("28.0"), le=Decimal("35.0"), description="Deck length in inches"
    )
    wheelbase_inches: Optional[Decimal] = Field(
        None,
        ge=Decimal("12.0"),
        le=Decimal("16.0"),
        description="Distance between truck mounting holes",
    )
    concave_type: ConcaveType = Field(
        default=ConcaveType.MEDIUM, description="Deck concave profile"
    )

    # Brand & Model Info
    brand: str = Field(
        ...,
        description="Deck brand - street favorites: Baker, Deathwish, Palace, FA, Hockey",
    )
    pro_model: Optional[str] = Field(
        None, description="Pro skater name if signature model"
    )
    series: Optional[str] = Field(
        None, description="Product line (e.g., 'OG Logo', 'Pro Model', 'Team')"
    )

    # Features
    griptape_included: bool = Field(
        default=False, description="Whether griptape comes with the deck"
    )
    graphic_name: Optional[str] = Field(None, description="Name of the deck graphic")
    is_limited_edition: bool = Field(
        default=False, description="Limited release or collaboration deck"
    )

    # Construction
    ply_count: int = Field(default=7, ge=5, le=9, description="Number of wood plies")
    woodshop: Optional[str] = Field(
        None, description="Manufacturer (PS Stix, BBS, Dwindle, etc.)"
    )

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("brand")
    @classmethod
    def canonicalize_brand(cls, v: str) -> str:
        """Normalize brand names to canonical forms."""
        brand_map = {
            "baker skateboards": "Baker",
            "baker": "Baker",
            "deathwish skateboards": "Deathwish",
            "deathwish": "Deathwish",
            "palace skateboards": "Palace",
            "palace": "Palace",
            "fa world entertainment": "FA",
            "fa": "FA",
            "hockey": "Hockey",
            "real skateboards": "Real",
            "real": "Real",
            "anti hero": "Anti-Hero",
            "antihero": "Anti-Hero",
            "girl skateboards": "Girl",
            "girl": "Girl",
            "chocolate": "Chocolate",
            "flip skateboards": "Flip",
            "flip": "Flip",
            "polar skate co": "Polar",
            "polar": "Polar",
            "alltimers": "Alltimers",
            "quasi": "Quasi",
            "fucking awesome": "FA",
        }
        return brand_map.get(v.lower().strip(), v.title())

    class Config:
        json_encoders = {Decimal: str, UUID: str, datetime: lambda v: v.isoformat()}


class DeckPricing(BaseModel):
    """Pricing information specific to deck products."""

    deck_id: UUID
    retailer: str
    price: Decimal
    msrp: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = None
    in_stock: bool = True
    stock_quantity: Optional[int] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("discount_percentage", mode="before")
    @classmethod
    def calculate_discount(cls, v, values):
        """Calculate discount percentage if not provided."""
        if v is not None:
            return v
        if "price" in values.data and "msrp" in values.data and values.data["msrp"]:
            msrp = values.data["msrp"]
            price = values.data["price"]
            if msrp > 0:
                return ((msrp - price) / msrp * 100).quantize(Decimal("0.01"))
        return None
