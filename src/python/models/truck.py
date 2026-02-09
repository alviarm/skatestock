"""
Truck Model - Skateboard Truck Specifications

Represents skateboard truck specifications with focus on street skating
preferences (Independent, Thunder, Venture).
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class TruckGeometry(str, Enum):
    """Truck geometry types affecting turning characteristics."""

    LOW = "low"  # Lower center of gravity, more stable
    MID = "mid"  # Balanced, standard street setup
    HIGH = "high"  # More turn, better for carving


class Truck(BaseModel):
    """
    Skateboard truck with street skating specifications.

    Street skating favorites:
    - Independent: Stage 11, durable, great grind
    - Thunder: Hollow lights, responsive turn
    - Venture: Light, stable for ledges
    - Ace: Classic feel, surfy turn
    """

    # Identity
    id: UUID = Field(default_factory=uuid4)
    sku: str = Field(..., description="Retailer-specific SKU")

    # Brand & Model
    brand: str = Field(
        ...,
        description="Truck brand - street staples: Independent, Thunder, Venture, Ace",
    )
    model_line: Optional[str] = Field(
        None, description="Model line (e.g., 'Stage 11', 'Team', 'Titanium')"
    )

    # Size Specifications
    size_class: str = Field(
        ..., description="Size class (129mm, 139mm, 144mm, 149mm, 159mm, 169mm)"
    )
    axle_width_mm: Optional[int] = Field(
        None, ge=100, le=250, description="Axle width in millimeters"
    )
    hanger_width_mm: Optional[int] = Field(
        None, ge=100, le=200, description="Hanger width in millimeters"
    )

    # Deck width compatibility mapping
    # 129mm = 7.75" deck
    # 139mm = 8.0" deck
    # 144mm = 8.25" deck
    # 149mm = 8.5" deck
    # 159mm = 8.75"+ deck

    # Physical Characteristics
    geometry: TruckGeometry = Field(
        default=TruckGeometry.MID, description="Truck geometry/height"
    )
    hollow_light: bool = Field(
        default=False, description="Hollow axle and kingpin for weight savings"
    )
    forged_baseplate: bool = Field(
        default=False, description="Forged aluminum baseplate (lighter/stronger)"
    )
    titanium_axle: bool = Field(
        default=False, description="Titanium axle (premium lightweight)"
    )

    # Weight (important for street skaters)
    weight_grams: Optional[Decimal] = Field(
        None, ge=200, le=600, description="Single truck weight in grams"
    )

    # Hardware
    kingpin_style: Optional[str] = Field(
        None, description="Standard or inverted kingpin"
    )
    bushing_hardness: Optional[str] = Field(
        None, description="Stock bushing durometer (e.g., '90a')"
    )

    # Color/Finish
    color: Optional[str] = Field(None, description="Truck color/finish")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("brand")
    @classmethod
    def canonicalize_brand(cls, v: str) -> str:
        """Normalize truck brand names."""
        brand_map = {
            "independent": "Independent",
            "independent truck company": "Independent",
            "indy": "Independent",
            "thunder": "Thunder",
            "thunder trucks": "Thunder",
            "venture": "Venture",
            "venture trucks": "Venture",
            "ace": "Ace",
            "ace trucks": "Ace",
            "krux": "Krux",
            "royal": "Royal",
            "destructo": "Destructo",
            "silver": "Silver",
            "theeve": "Theeve",
        }
        return brand_map.get(v.lower().strip(), v.title())

    @field_validator("size_class")
    @classmethod
    def normalize_size(cls, v: str) -> str:
        """Normalize truck size to standard format."""
        size_map = {
            "129": "129mm",
            "139": "139mm",
            "144": "144mm",
            "149": "149mm",
            "159": "159mm",
            "169": "169mm",
            "215": "215mm",
            "low": "129mm",
            "mid": "139mm",
            "high": "149mm",
        }
        normalized = v.lower().strip().replace(" ", "")
        return size_map.get(normalized, v)

    @property
    def deck_compatibility(self) -> str:
        """Return recommended deck width for this truck size."""
        compatibility_map = {
            "129mm": '7.5" - 7.75"',
            "139mm": '7.875" - 8.125"',
            "144mm": '8.125" - 8.25"',
            "149mm": '8.25" - 8.5"',
            "159mm": '8.5" - 8.75"',
            "169mm": '8.75" - 9.0"',
            "215mm": '10.0"+',
        }
        return compatibility_map.get(self.size_class, "Unknown")

    class Config:
        json_encoders = {Decimal: str, UUID: str, datetime: lambda v: v.isoformat()}
