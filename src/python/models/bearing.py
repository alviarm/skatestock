"""
Bearing Model - Skateboard Bearing Specifications

Represents skateboard bearing specifications with focus on street skating
favorites (Bones Reds, Bronson G3).
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class ShieldType(str, Enum):
    """Bearing shield types for protection and maintenance."""

    RUBBER_SHIELD = "Rubber Shield"  # Removable for cleaning
    METAL_SHIELD = "Metal Shield"  # More durable, harder to clean
    CERAMIC_SHIELD = "Ceramic Shield"  # Premium option
    NONE = "None"  # Open bearings (not recommended)


class Bearing(BaseModel):
    """
    Skateboard bearing with street skating specifications.

    Street skating favorites:
    - Bones Reds: Industry standard, affordable quality
    - Bones Super Reds: Premium version
    - Bones Swiss: Top tier
    - Bronson G3: Popular alternative
    - Bronson Raw: No shield design

    Key specs:
    - ABEC rating: Marketing term (ABEC-7 vs ABEC-9 vs Skate Rated)
    - Material: Steel vs Ceramic
    - Shield: Rubber (cleanable) vs Metal (durable)
    """

    # Identity
    id: UUID = Field(default_factory=uuid4)
    sku: str = Field(..., description="Retailer-specific SKU")

    # Brand & Model
    brand: str = Field(
        ..., description="Bearing brand - street favorites: Bones, Bronson, Shake Junt"
    )
    model: str = Field(
        ..., description="Bearing model (Reds, Super Reds, Swiss, G3, RAW, etc.)"
    )

    # Specifications
    abec_rating: Optional[str] = Field(
        None, description="ABEC rating (3, 5, 7, 9) - mostly marketing"
    )
    skate_rated: bool = Field(
        default=False, description="Bones 'Skate Rated' - designed for impact vs ABEC"
    )
    ceramic: bool = Field(
        default=False, description="Ceramic balls (lighter, harder, rust-proof)"
    )

    # Shield Configuration
    shield_type: ShieldType = Field(
        default=ShieldType.RUBBER_SHIELD, description="Bearing shield type"
    )
    removable_shields: bool = Field(
        default=True, description="Whether shields can be removed for cleaning"
    )

    # Construction
    ball_material: str = Field(default="Steel", description="Material of bearing balls")
    race_material: Optional[str] = Field(None, description="Material of bearing races")
    lubricant: Optional[str] = Field(None, description="Pre-lubricated with")

    # Packaging
    set_size: int = Field(
        default=8,
        ge=1,
        le=8,
        description="Number of bearings in set (usually 8 for skateboard)",
    )
    includes_spacers: bool = Field(
        default=False, description="Whether spacers are included"
    )
    includes_washers: bool = Field(
        default=False, description="Whether speed washers are included"
    )

    # Performance indicators
    precision_grade: Optional[str] = Field(
        None, description="Precision grade (if specified by manufacturer)"
    )

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("brand")
    @classmethod
    def canonicalize_brand(cls, v: str) -> str:
        """Normalize bearing brand names."""
        brand_map = {
            "bones": "Bones",
            "bones bearings": "Bones",
            "bones swiss": "Bones",
            "bronson": "Bronson",
            "bronson speed co": "Bronson",
            "bronson speed company": "Bronson",
            "shake junt": "Shake Junt",
            "shakejunt": "Shake Junt",
            "sj": "Shake Junt",
            "andale": "Andalé",
            "andale bearings": "Andalé",
            "modus": "Modus",
            "modus bearings": "Modus",
            "independent": "Independent",
            "indy": "Independent",
            "independent bearings": "Independent",
            "mob": "Mob",
            "zero": "Zero",
            "toy machine": "Toy Machine",
        }
        return brand_map.get(v.lower().strip(), v.title())

    @field_validator("model")
    @classmethod
    def canonicalize_model(cls, v: str, info) -> str:
        """Normalize bearing model names."""
        brand = info.data.get("brand", "").lower()
        v_lower = v.lower().strip()

        # Bones models
        if brand == "bones":
            if "swiss" in v_lower and "ceramic" in v_lower:
                return "Swiss Ceramic"
            elif "swiss" in v_lower:
                return "Swiss"
            elif "super reds" in v_lower or "super" in v_lower:
                return "Super Reds"
            elif "reds" in v_lower:
                return "Reds"
            elif "big balls" in v_lower:
                return "Big Balls"

        # Bronson models
        if brand == "bronson":
            if "g3" in v_lower or "g-3" in v_lower:
                return "G3"
            elif "raw" in v_lower:
                return "RAW"
            elif "ceramic" in v_lower:
                return "Ceramic"

        # Andalé models
        if brand in ["andalé", "andale"]:
            if "pro" in v_lower:
                return "Pro Rated"
            elif " daewon " in v_lower:
                return "Daewon Song Pro"
            elif "tiago" in v_lower:
                return "Tiago Pro"

        return v.title()

    @property
    def quality_tier(self) -> str:
        """Determine quality tier based on specs."""
        if self.ceramic or "swiss" in self.model.lower():
            return "Premium"
        elif "super" in self.model.lower() or "g3" in self.model.lower():
            return "High-End"
        elif self.model.lower() in ["reds", "raw"]:
            return "Mid-Range"
        else:
            return "Standard"

    @property
    def maintenance_ease(self) -> str:
        """Determine how easy bearings are to maintain."""
        if self.shield_type == ShieldType.RUBBER_SHIELD and self.removable_shields:
            return "Easy (removable shields)"
        elif self.shield_type == ShieldType.METAL_SHIELD:
            return "Moderate (metal shields)"
        elif self.shield_type == ShieldType.NONE:
            return "High maintenance (open)"
        else:
            return "Standard"

    class Config:
        json_encoders = {Decimal: str, UUID: str, datetime: lambda v: v.isoformat()}
