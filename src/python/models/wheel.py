"""
Wheel Model - Skateboard Wheel Specifications

Represents skateboard wheel specifications with focus on street skating
formulas and durometers (Spitfire Formula Four, Bones STF/SPF).
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class WheelFormula(str, Enum):
    """Premium wheel formulas used in street skating."""

    # Spitfire
    FORMULA_FOUR = "Formula Four"
    CONICAL = "Conical"
    CONICAL_FULL = "Conical Full"
    RADIAL = "Radial"
    RADIAL_FULL = "Radial Full"
    LOCK_INS = "Lock-Ins"
    TABLETS = "Tablets"
    CLASSIC = "Classic"

    # Bones
    STF = "STF"  # Street Tech Formula
    SPF = "SPF"  # Skatepark Formula
    ATF = "ATF"  # All-Terrain Formula

    # Other popular brands
    OG_CLASSIC = "OG Classic"
    SLAG = "SLAG"  # Slappy
    NANOCUBIC = "NanoCubics"

    # Generic
    STANDARD = "Standard"
    SOFT = "Soft Cruiser"


class Wheel(BaseModel):
    """
    Skateboard wheel with street skating specifications.

    Street skating preferences:
    - Size: 50mm - 56mm (52-54mm most popular for street)
    - Durometer: 99a - 101a (hard wheels for slides)
    - Formula: Spitfire F4, Bones STF (flatspot resistant)
    - Shape: Conical (lock into grinds), Classic (all-around)

    Key metrics:
    - Smaller wheels (50-52mm): Lighter, faster flip, slower roll
    - Larger wheels (54-56mm): Faster roll, smoother on rough ground
    - 99a: Slightly grippier, good for rough spots
    - 101a: Maximum slide, best for smooth spots
    """

    # Identity
    id: UUID = Field(default_factory=uuid4)
    sku: str = Field(..., description="Retailer-specific SKU")

    # Brand
    brand: str = Field(
        ..., description="Wheel brand - street favorites: Spitfire, Bones, OJ, SML"
    )

    # Physical Specifications
    diameter_mm: int = Field(
        ..., ge=48, le=60, description="Wheel diameter in mm (street: 50-56mm)"
    )
    durometer_a: int = Field(
        ..., ge=78, le=104, description="Wheel hardness in Shore A (street: 99a-101a)"
    )
    width_mm: Optional[Decimal] = Field(
        None, ge=20, le=40, description="Wheel width in mm"
    )
    contact_patch_mm: Optional[Decimal] = Field(
        None, ge=15, le=30, description="Contact patch width (riding surface)"
    )

    # Formula & Shape
    formula: WheelFormula = Field(
        default=WheelFormula.STANDARD, description="Wheel urethane formula"
    )
    shape: Optional[str] = Field(
        None, description="Wheel shape (Classic, Conical, Radial, Lock-Ins)"
    )

    # Set info
    set_size: int = Field(
        default=4, ge=1, le=4, description="Number of wheels in package (usually 4)"
    )

    # Pro/Team Model
    pro_model: Optional[str] = Field(None, description="Pro skater signature model")
    graphic_series: Optional[str] = Field(None, description="Graphic series name")

    # Riding Characteristics (derived from specs)
    @property
    def riding_style(self) -> str:
        """Determine riding style based on wheel specs."""
        if self.diameter_mm <= 52 and self.durometer_a >= 99:
            return "Technical Street"
        elif self.diameter_mm <= 54 and self.durometer_a >= 99:
            return "All-Around Street"
        elif self.diameter_mm >= 54 and self.durometer_a >= 99:
            return "Street/Park Hybrid"
        elif self.durometer_a < 90:
            return "Cruiser/Soft"
        else:
            return "General Skateboarding"

    @property
    def slide_rating(self) -> str:
        """Estimate slide characteristics."""
        if self.durometer_a >= 101:
            return "Maximum Slide"
        elif self.durometer_a >= 99:
            return "High Slide"
        elif self.durometer_a >= 95:
            return "Medium Slide"
        else:
            return "Grip"

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("brand")
    @classmethod
    def canonicalize_brand(cls, v: str) -> str:
        """Normalize wheel brand names."""
        brand_map = {
            "spitfire": "Spitfire",
            "spitfire wheels": "Spitfire",
            "bones": "Bones",
            "bones wheels": "Bones",
            "bones bearings": "Bones",
            "oj": "OJ",
            "oj wheels": "OJ",
            "oj team": "OJ",
            "sml": "SML",
            "sml wheels": "SML",
            "sml.": "SML",
            "ricta": "Ricta",
            "ricta wheels": "Ricta",
            "wayward": "Wayward",
            "wayward wheels": "Wayward",
            "way wheels": "Wayward",
            "pig": "Pig",
            "pig wheels": "Pig",
            "mob": "Mob",
            "blank": "Blank",
        }
        return brand_map.get(v.lower().strip(), v.title())

    @field_validator("formula", mode="before")
    @classmethod
    def normalize_formula(cls, v):
        """Normalize formula names."""
        if isinstance(v, WheelFormula):
            return v
        formula_map = {
            "formula four": WheelFormula.FORMULA_FOUR,
            "f4": WheelFormula.FORMULA_FOUR,
            "stf": WheelFormula.STF,
            "street tech formula": WheelFormula.STF,
            "spf": WheelFormula.SPF,
            "skatepark formula": WheelFormula.SPF,
            "atf": WheelFormula.ATF,
            "all terrain": WheelFormula.ATF,
            "conical": WheelFormula.CONICAL,
            "conical full": WheelFormula.CONICAL_FULL,
            "radial": WheelFormula.RADIAL,
            "radial full": WheelFormula.RADIAL_FULL,
            "lock-ins": WheelFormula.LOCK_INS,
            "lockins": WheelFormula.LOCK_INS,
            "tablets": WheelFormula.TABLETS,
            "classic": WheelFormula.CLASSIC,
            "og": WheelFormula.OG_CLASSIC,
            "og classic": WheelFormula.OG_CLASSIC,
        }
        if isinstance(v, str):
            return formula_map.get(v.lower().strip(), WheelFormula.STANDARD)
        return v

    class Config:
        json_encoders = {Decimal: str, UUID: str, datetime: lambda v: v.isoformat()}
