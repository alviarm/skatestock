"""
CompleteProduct Model - Unified E-commerce Product

Aggregates all skate product types into a unified e-commerce product model
with pricing, availability, and retailer information.
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, field_validator


class AvailabilityStatus(str, Enum):
    """Product availability states."""

    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    PRE_ORDER = "pre_order"
    BACKORDER = "backorder"
    DISCONTINUED = "discontinued"


class RetailerSource(str, Enum):
    """Retailer sources for product data."""

    AMAZON = "Amazon"
    TACTICS = "Tactics"
    CCS = "CCS"
    SKATE_WAREHOUSE = "Skate Warehouse"
    LOCAL_SHOP = "Local Shop"
    SEASONS = "Seasons"
    PREMIER = "Premier"
    LABOR = "Labor"
    NJ_SKATE_SHOP = "NJ Skate Shop"
    BLACK_SHEEP = "Black Sheep"


class ProductCategory(str, Enum):
    """Product categories for skate equipment."""

    DECK = "deck"
    TRUCK = "truck"
    WHEEL = "wheel"
    BEARING = "bearing"
    HARDWARE = "hardware"
