#!/usr/bin/env python3
"""
SkateStock Demo Data Generator
Generates high-fidelity mock data for 5 distinct retailer personalities

Requirements: pip install psycopg2-binary tqdm python-dotenv

Examples:
    # Generate 5000 products and seed via API
    python generate_demo_data.py --days 7 --products-per-day 800
    
    # Generate and insert directly to database
    python generate_demo_data.py --direct-to-db --days 30
    
    # Generate SQL file only
    python generate_demo_data.py --days 7 --output-sql demo_data.sql
    
    # Generate with price history
    python generate_demo_data.py --direct-to-db --price-history-days 30
    
    # Seed shops and categories only
    python generate_demo_data.py --seed-shops --seed-categories
"""

import argparse
import json
import os
import random
import re
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
import uuid

# Optional imports - fail gracefully if not available
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    requests = None

try:
    import psycopg2
    from psycopg2.extras import execute_values
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False
    psycopg2 = None
    execute_values = None

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False
    tqdm = None

try:
    from dotenv import load_dotenv
    load_dotenv()
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False

# ============================================================================
# PRODUCT CATALOG - Expanded with more brands and categories
# ============================================================================

SKATE_PRODUCTS = {
    "decks": [
        ("Baker Brand Logo Deck", "Baker", 55.00, 65.00),
        ("Thrasher Flame Deck", "Thrasher", 60.00, 70.00),
        ("Palace Tri-Ferg Deck", "Palace", 65.00, 75.00),
        ("Supreme Box Logo Deck", "Supreme", 70.00, 88.00),
        ("Anti-Hero Classic Eagle", "Anti-Hero", 58.00, 68.00),
        ("Girl OG Logo Deck", "Girl", 55.00, 65.00),
        ("Chocolate Chunk Deck", "Chocolate", 56.00, 66.00),
        ("Real Oval Deck", "Real", 54.00, 64.00),
        ("Santa Cruz Classic Dot", "Santa Cruz", 55.00, 65.00),
        ("Blind OG Reaper Deck", "Blind", 50.00, 60.00),
        ("Element Section Deck", "Element", 52.00, 62.00),
        ("Element Featherlight Deck", "Element", 58.00, 68.00),
        ("Toy Machine Monster Deck", "Toy Machine", 54.00, 64.00),
        ("Zero Single Skull Deck", "Zero", 56.00, 66.00),
        ("Almost Mullen Uber Deck", "Almost", 60.00, 70.00),
        ("Enjoi Panda Deck", "Enjoi", 55.00, 65.00),
    ],
    "trucks": [
        ("Independent Stage 11 139", "Independent", 45.00, 55.00),
        ("Independent Stage 11 149", "Independent", 48.00, 58.00),
        ("Thunder Hollow Lights 147", "Thunder", 52.00, 62.00),
        ("Thunder Hollow Lights 151", "Thunder", 54.00, 64.00),
        ("Venture V-Hollow 5.2", "Venture", 50.00, 60.00),
        ("Venture V-Hollow 5.6", "Venture", 52.00, 62.00),
        ("Ace AF1 Low 33", "Ace", 55.00, 65.00),
        ("Ace AF1 Low 44", "Ace", 57.00, 67.00),
        ("Tensor Magnesium 5.5", "Tensor", 58.00, 68.00),
        ("Independent Forged Titanium 139", "Independent", 65.00, 75.00),
    ],
    "wheels": [
        ("Spitfire Formula Four Classic 52mm", "Spitfire", 35.00, 42.00),
        ("Spitfire Formula Four Classic 54mm", "Spitfire", 36.00, 43.00),
        ("Spitfire Formula Four Conical 53mm", "Spitfire", 38.00, 45.00),
        ("Bones STF V5 52mm", "Bones", 36.00, 44.00),
        ("Bones STF V5 54mm", "Bones", 38.00, 46.00),
        ("Bones SPF P5 56mm", "Bones", 40.00, 48.00),
        ("OJ Elite Hardline 52mm", "OJ", 32.00, 38.00),
        ("OJ Elite Hardline 54mm", "OJ", 34.00, 40.00),
        ("Slime Balls Vomits 97A", "Slime Balls", 35.00, 42.00),
        ("Ricta Clouds 86A", "Ricta", 38.00, 45.00),
        ("Ricta Clouds 92A", "Ricta", 38.00, 45.00),
        ("Santa Cruz Slimeballs 97A", "Santa Cruz", 34.00, 40.00),
    ],
    "bearings": [
        ("Bones Reds Bearings", "Bones", 18.00, 25.00),
        ("Bones Super Reds Bearings", "Bones", 35.00, 45.00),
        ("Bones Swiss Bearings", "Bones", 55.00, 70.00),
        ("Bones Ceramic Super Reds", "Bones", 85.00, 100.00),
        ("Spitfire Burners Bearings", "Spitfire", 20.00, 28.00),
        ("Spitfire Cheapshots Bearings", "Spitfire", 12.00, 18.00),
        ("Bronson Raw Bearings", "Bronson", 25.00, 35.00),
        ("Bronson G3 Bearings", "Bronson", 30.00, 40.00),
        ("Andale Swiss Bearings", "Andale", 40.00, 50.00),
        ("Modus Blacks Bearings", "Modus", 22.00, 30.00),
    ],
    "hardware": [
        ("Diamond Supply Hardware 7/8\"", "Diamond", 4.00, 6.00),
        ("Diamond Supply Hardware 1\"", "Diamond", 5.00, 7.00),
        ("Shortys Silverados Hardware", "Shortys", 6.00, 8.00),
        ("Independent Hardware 1\"", "Independent", 5.00, 7.00),
        ("Thunder Hardware 7/8\"", "Thunder", 4.50, 6.50),
        ("Element Hardware 1\"", "Element", 5.00, 7.00),
        ("Allen Hardware Set 7/8\"", "Generic", 3.00, 5.00),
        ("Phillips Hardware Set 1\"", "Generic", 3.00, 5.00),
    ],
    "grip_tape": [
        ("Mob Grip Standard", "Mob", 6.00, 9.00),
        ("Mob Grip M-80", "Mob", 7.00, 10.00),
        ("Mob Grip Perforated", "Mob", 7.50, 11.00),
        ("Jessup Grip Standard", "Jessup", 5.00, 8.00),
        ("Jessup Grip Ultra", "Jessup", 6.00, 9.00),
        ("Grizzly Grip Bear Cutout", "Grizzly", 10.00, 14.00),
        ("Grizzly Grip Stamp", "Grizzly", 9.00, 13.00),
        ("Black Diamond Grip", "Black Diamond", 5.00, 8.00),
        ("Shake Junt Grip", "Shake Junt", 8.00, 12.00),
    ],
    "wax": [
        ("Shortys Curb Candy Wax", "Shortys", 3.00, 5.00),
        ("Shortys Curb Candy XL", "Shortys", 5.00, 8.00),
        ("Skate Mental Wax Bar", "Skate Mental", 4.00, 6.00),
        ("Baker Brand Logo Wax", "Baker", 4.50, 7.00),
        ("Primitive Pen Wax", "Primitive", 6.00, 9.00),
        ("Santa Cruz Slimeballs Wax", "Santa Cruz", 4.00, 6.00),
        ("Element Wax Bar", "Element", 3.50, 5.50),
    ],
    "shoes": [
        ("Vans Old Skool Pro Black/White", "Vans", 70.00, 85.00),
        ("Vans Slip-On Pro Checkerboard", "Vans", 65.00, 80.00),
        ("Vans Era Pro Navy", "Vans", 70.00, 85.00),
        ("Nike SB Dunk Low Black", "Nike SB", 100.00, 120.00),
        ("Nike SB Dunk Low Panda", "Nike SB", 110.00, 130.00),
        ("Nike SB Janoski Black", "Nike SB", 85.00, 100.00),
        ("Nike SB Nyjah Free", "Nike SB", 95.00, 110.00),
        ("Adidas Busenitz Black/White", "Adidas", 80.00, 95.00),
        ("Adidas Tyshawn Black/Gold", "Adidas", 95.00, 110.00),
        ("Adidas 3ST.004", "Adidas", 85.00, 100.00),
        ("Converse CONS One Star Pro", "Converse", 75.00, 90.00),
        ("Converse CONS Louie Lopez Pro", "Converse", 80.00, 95.00),
        ("Lakai Manchester Black", "Lakai", 75.00, 85.00),
        ("Lakai Cambridge White/Navy", "Lakai", 80.00, 90.00),
        ("Emerica Reynolds G6", "Emerica", 80.00, 95.00),
        ("Emerica Wino Standard", "Emerica", 65.00, 75.00),
        ("DC Lynx OG", "DC", 90.00, 110.00),
        ("DC Kalis Vulc", "DC", 75.00, 90.00),
    ],
    "apparel": [
        ("Thrasher Flame Logo Hoodie", "Thrasher", 60.00, 75.00),
        ("Thrasher Skate Mag Hoodie", "Thrasher", 65.00, 80.00),
        ("Thrasher Flame T-Shirt", "Thrasher", 28.00, 35.00),
        ("Thrasher Skate Mag Tee", "Thrasher", 26.00, 32.00),
        ("Vans Classic Tee Black", "Vans", 25.00, 32.00),
        ("Vans Off The Wall Tee", "Vans", 25.00, 32.00),
        ("Baker Logo Hoodie Black", "Baker", 65.00, 80.00),
        ("Baker Logo Tee White", "Baker", 28.00, 35.00),
        ("Supreme Box Logo Tee", "Supreme", 38.00, 50.00),
        ("Stussy Basic Tee Black", "Stussy", 35.00, 45.00),
        ("Stussy Stock Logo Tee", "Stussy", 38.00, 48.00),
        ("HUF Plantlife Socks", "HUF", 12.00, 15.00),
        ("HUF Domestic Sock", "HUF", 14.00, 18.00),
        ("Nike SB Beanie Black", "Nike SB", 25.00, 32.00),
        ("Nike SB Beanie Grey", "Nike SB", 25.00, 32.00),
        ("Independent Truck Cap Black", "Independent", 28.00, 35.00),
        ("Independent Truck Snapback", "Independent", 30.00, 38.00),
        ("Thrasher 5-Panel Hat", "Thrasher", 32.00, 40.00),
    ],
}

# Retailer personalities
RETAILER_PERSONALITIES = {
    "seasons_skateshop": {
        "name": "Seasons Skate Shop",
        "display_name": "Seasons Skate Shop",
        "base_url": "https://seasonsskateshop.com",
        "location": "New York, NY",
        "discount_frequency": 0.3,
        "discount_depth": (0.15, 0.35),
        "stockout_rate": 0.1,
        "price_volatility": 0.05,
        "data_quality": "high",
    },
    "premier_store": {
        "name": "Premier Store",
        "display_name": "Premier Store",
        "base_url": "https://thepremierstore.com",
        "location": "Michigan",
        "discount_frequency": 0.4,
        "discount_depth": (0.20, 0.50),
        "stockout_rate": 0.15,
        "price_volatility": 0.08,
        "data_quality": "medium",
    },
    "labor_skateshop": {
        "name": "Labor Skate Shop",
        "display_name": "Labor Skate Shop",
        "base_url": "https://laborskateshop.com",
        "location": "New York, NY",
        "discount_frequency": 0.2,
        "discount_depth": (0.10, 0.25),
        "stockout_rate": 0.05,
        "price_volatility": 0.03,
        "data_quality": "high",
    },
    "nj_skateshop": {
        "name": "NJ Skate Shop",
        "display_name": "NJ Skate Shop",
        "base_url": "https://njskateshop.com",
        "location": "New Jersey",
        "discount_frequency": 0.5,
        "discount_depth": (0.30, 0.60),
        "stockout_rate": 0.2,
        "price_volatility": 0.12,
        "data_quality": "low",
    },
    "blacksheep_skateshop": {
        "name": "Black Sheep Skate Shop",
        "display_name": "Black Sheep Skate Shop",
        "base_url": "https://blacksheepskateshop.com",
        "location": "North Carolina",
        "discount_frequency": 0.35,
        "discount_depth": (0.15, 0.40),
        "stockout_rate": 0.08,
        "price_volatility": 0.06,
        "data_quality": "high",
    },
}

# Category mapping for database
CATEGORY_MAP = {
    "decks": "decks",
    "trucks": "trucks",
    "wheels": "wheels",
    "bearings": "bearings",
    "hardware": "hardware",
    "grip_tape": "grip_tape",
    "wax": "wax",
    "shoes": "shoes",
    "apparel": "apparel",
}


# ============================================================================
# DATABASE CONNECTION
# ============================================================================

def get_db_connection(db_url: Optional[str] = None):
    """Get a PostgreSQL database connection."""
    if not HAS_PSYCOPG2:
        raise ImportError("psycopg2-binary is required for database operations. "
                         "Install with: pip install psycopg2-binary")
    
    # Get connection string from args, environment, or default
    conn_str = db_url or os.getenv("DATABASE_URL") or "postgresql://localhost:5432/skatestock"
    
    try:
        conn = psycopg2.connect(conn_str)
        conn.autocommit = False
        return conn
    except psycopg2.Error as e:
        print(f"❌ Failed to connect to database: {e}")
        print(f"   Connection string: {conn_str}")
        raise


# ============================================================================
# VALIDATION
# ============================================================================

class DataValidator:
    """Validates generated product data against schema constraints."""
    
    REQUIRED_FIELDS = ["event_id", "source", "title", "sale_price", "category"]
    VALID_CATEGORIES = list(SKATE_PRODUCTS.keys())
    VALID_AVAILABILITY = ["in_stock", "out_of_stock", "low_stock", "pre_order"]
    
    @classmethod
    def validate_product(cls, product: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Validate a single product. Returns (is_valid, list of errors)."""
        errors = []
        
        # Check required fields
        for field in cls.REQUIRED_FIELDS:
            if field not in product or product[field] is None:
                errors.append(f"Missing required field: {field}")
        
        # Validate price ranges
        try:
            sale_price = float(product.get("sale_price", 0))
            if sale_price < 0:
                errors.append(f"Invalid sale_price: {sale_price} (must be >= 0)")
            if sale_price > 10000:
                errors.append(f"Suspicious sale_price: {sale_price} (seems too high)")
        except (ValueError, TypeError):
            errors.append(f"Invalid sale_price format: {product.get('sale_price')}")
        
        # Validate original_price if present
        if product.get("original_price"):
            try:
                orig_price = float(product["original_price"])
                if orig_price < 0:
                    errors.append(f"Invalid original_price: {orig_price}")
            except (ValueError, TypeError):
                errors.append(f"Invalid original_price format: {product['original_price']}")
        
        # Validate category
        if product.get("category") and product["category"] not in cls.VALID_CATEGORIES:
            errors.append(f"Invalid category: {product['category']}")
        
        # Validate availability
        if product.get("availability") and product["availability"] not in cls.VALID_AVAILABILITY:
            errors.append(f"Invalid availability: {product['availability']}")
        
        # Validate discount percentage
        discount = product.get("discount_percentage")
        if discount is not None:
            try:
                d = float(discount)
                if d < 0 or d > 100:
                    errors.append(f"Invalid discount_percentage: {d} (must be 0-100)")
            except (ValueError, TypeError):
                errors.append(f"Invalid discount_percentage format: {discount}")
        
        return len(errors) == 0, errors
    
    @classmethod
    def validate_products(cls, products: List[Dict[str, Any]]) -> Tuple[int, List[str]]:
        """Validate multiple products. Returns (valid_count, all_errors)."""
        all_errors = []
        valid_count = 0
        
        for i, product in enumerate(products):
            is_valid, errors = cls.validate_product(product)
            if is_valid:
                valid_count += 1
            else:
                for error in errors:
                    all_errors.append(f"Product {i}: {error}")
        
        return valid_count, all_errors


# ============================================================================
# RETAILER SIMULATOR
# ============================================================================

class RetailerSimulator:
    """Simulates product data for a specific retailer personality"""

    def __init__(self, retailer_id: str, personality: Dict[str, Any], seed: int = None):
        self.retailer_id = retailer_id
        self.personality = personality
        self.rng = random.Random(seed)

    def generate_product(
        self, category: str, base_product: tuple, timestamp: datetime
    ) -> Dict[str, Any]:
        """Generate a single product with retailer-specific variations"""
        name, brand, base_price, msrp = base_product

        # Apply retailer personality
        discount_freq = self.personality["discount_frequency"]
        discount_range = self.personality["discount_depth"]
        stockout_rate = self.personality["stockout_rate"]
        volatility = self.personality["price_volatility"]

        # Decide if this product is on sale
        is_on_sale = self.rng.random() < discount_freq

        if is_on_sale:
            discount_pct = self.rng.uniform(*discount_range)
            sale_price = round(base_price * (1 - discount_pct), 2)
        else:
            sale_price = base_price
            discount_pct = 0

        # Add price volatility (random fluctuation)
        sale_price = round(
            sale_price * (1 + self.rng.uniform(-volatility, volatility)), 2
        )

        # Determine availability
        availability = "in_stock"
        stock_qty = self.rng.randint(1, 50)
        if self.rng.random() < stockout_rate:
            availability = "out_of_stock"
            stock_qty = 0
        elif self.rng.random() < 0.3:
            availability = "low_stock"
            stock_qty = self.rng.randint(1, 5)

        # Data quality issues for certain retailers
        if self.personality["data_quality"] == "low":
            # Random typos, missing fields
            if self.rng.random() < 0.1:
                name = name.replace("e", "3", 1)  # Leet speak typo
            if self.rng.random() < 0.05:
                brand = None  # Missing brand

        # Generate variant info
        color = self._generate_color(category)
        size = self._generate_size(category)
        
        # Add variant info to name if applicable
        if color and self.rng.random() < 0.3:
            name = f"{name} - {color}"
        if size and self.rng.random() < 0.3:
            name = f"{name} ({size})"

        product = {
            "event_id": str(uuid.uuid4()),
            "event_timestamp": int(timestamp.timestamp() * 1000),
            "source": self.retailer_id,
            "source_product_id": f"{self.retailer_id}_{self.rng.randint(10000, 99999)}",
            "title": name,
            "brand": brand,
            "category": category,
            "original_price": str(msrp),
            "sale_price": str(sale_price),
            "currency": "USD",
            "discount_percentage": round(discount_pct * 100, 2) if is_on_sale else None,
            "image_url": f"https://example.com/images/{self.rng.randint(1000, 9999)}.jpg",
            "product_url": f"https://{self.retailer_id.replace('_', '')}.com/products/{self.rng.randint(1000, 9999)}",
            "availability": availability,
            "stock_quantity": stock_qty,
            "color": color,
            "size": size,
            "scraped_at": int(timestamp.timestamp() * 1000),
            "raw_attributes": {},
        }

        return product
    
    def _generate_color(self, category: str) -> Optional[str]:
        """Generate realistic colors based on category."""
        colors = {
            "decks": ["Black", "White", "Natural", "Blue", "Red", "Green", "Yellow", "Purple", None],
            "trucks": ["Silver", "Black", "Raw", "Gold", "Blue", "Red", None],
            "wheels": ["White", "Black", "Red", "Blue", "Green", "Orange", "Clear", "Swirl", None],
            "bearings": [None],  # Bearings don't have colors usually
            "hardware": ["Black", "Silver", "Gold", "Rainbow", "Blue", "Red", None],
            "grip_tape": ["Black", "Clear", "Graphic", "Neon", None],
            "wax": ["White", "Pink", "Blue", "Green", "Yellow", "Orange", None],
            "shoes": ["Black/White", "Black/Black", "White/White", "Navy/White", "Grey/Black", 
                     "Red/White", "Brown/Gum", "Olive/Black", None],
            "apparel": ["Black", "White", "Grey", "Navy", "Red", "Green", "Yellow", "Pink", None],
        }
        return self.rng.choice(colors.get(category, [None]))
    
    def _generate_size(self, category: str) -> Optional[str]:
        """Generate realistic sizes based on category."""
        sizes = {
            "decks": ["7.75", "7.875", "8.0", "8.125", "8.25", "8.375", "8.5", "8.75", "9.0"],
            "trucks": ["129 (7.6-7.9)", "139 (8.0-8.2)", "144 (8.25)", "149 (8.5)", "159 (8.75-9.0)"],
            "wheels": ["50mm", "51mm", "52mm", "53mm", "54mm", "55mm", "56mm", "58mm", "60mm"],
            "bearings": [None],
            "hardware": ["7/8\"", "1\"", "1 1/8\"", "1 1/4\""],
            "grip_tape": ["9\" x 33\"", "10\" x 33\"", "9\" x 36\""],
            "wax": ["Small", "Medium", "Large"],
            "shoes": ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13"],
            "apparel": ["XS", "S", "M", "L", "XL", "XXL"],
        }
        return self.rng.choice(sizes.get(category, [None]))


# ============================================================================
# DEMO DATA GENERATOR
# ============================================================================

class DemoDataGenerator:
    """Main class for generating demo data."""
    
    def __init__(self, seed: int = 42, chaos_mode: bool = False):
        self.rng = random.Random(seed)
        self.chaos_mode = chaos_mode
        self.seed = seed
        self.stats = {
            "total_products": 0,
            "total_price_history": 0,
            "by_shop": {},
            "by_category": {},
            "db_rows_inserted": 0,
        }
    
    def generate_demo_dataset(
        self,
        days: int = 7,
        products_per_day: int = 800,
    ) -> List[Dict[str, Any]]:
        """Generate complete demo dataset across all retailers."""
        all_products = []
        base_date = datetime.now() - timedelta(days=days)

        # Create simulators for each retailer
        simulators = {
            rid: RetailerSimulator(rid, personality, seed=self.seed + i)
            for i, (rid, personality) in enumerate(RETAILER_PERSONALITIES.items())
        }

        products_per_retailer = products_per_day // len(RETAILER_PERSONALITIES)
        total_iterations = days * len(RETAILER_PERSONALITIES)
        
        # Progress bar wrapper
        progress_iter = tqdm(range(days), desc="Generating products") if HAS_TQDM else range(days)

        for day in progress_iter:
            current_date = base_date + timedelta(days=day)

            for retailer_id, simulator in simulators.items():
                # Generate products for this retailer on this day
                daily_products = []

                # Distribute across categories
                categories = list(SKATE_PRODUCTS.keys())
                products_per_category = products_per_retailer // len(categories)

                for category in categories:
                    category_products = SKATE_PRODUCTS[category]

                    for _ in range(products_per_category):
                        # Pick a random product from this category
                        base_product = self.rng.choice(category_products)

                        # Generate timestamp throughout the day
                        hour = self.rng.randint(0, 23)
                        minute = self.rng.randint(0, 59)
                        timestamp = current_date.replace(hour=hour, minute=minute)

                        product = simulator.generate_product(
                            category, base_product, timestamp
                        )
                        daily_products.append(product)

                # Chaos mode: add duplicates
                if self.chaos_mode and self.rng.random() < 0.2:
                    # Duplicate 5% of products
                    duplicates = self.rng.sample(daily_products, len(daily_products) // 20)
                    for dup in duplicates:
                        dup_copy = dup.copy()
                        dup_copy["event_id"] = str(uuid.uuid4())
                        dup_copy["event_timestamp"] += self.rng.randint(1000, 60000)
                        daily_products.append(dup_copy)

                all_products.extend(daily_products)

        # Sort by timestamp
        all_products.sort(key=lambda x: x["event_timestamp"])
        
        # Update stats
        self.stats["total_products"] = len(all_products)
        for p in all_products:
            shop = p["source"]
            cat = p["category"]
            self.stats["by_shop"][shop] = self.stats["by_shop"].get(shop, 0) + 1
            self.stats["by_category"][cat] = self.stats["by_category"].get(cat, 0) + 1

        return all_products
    
    def generate_price_history(
        self,
        products: List[Dict[str, Any]],
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        """Generate price history for each product."""
        price_history = []
        base_date = datetime.now() - timedelta(days=days)
        
        progress_desc = f"Generating {days} days of price history"
        product_iter = tqdm(products, desc=progress_desc) if HAS_TQDM else products
        
        for product in product_iter:
            # Get base price
            try:
                base_price = float(product["sale_price"])
            except (ValueError, TypeError):
                continue
            
            current_price = base_price
            product_id = product.get("event_id", str(uuid.uuid4()))
            
            # Generate daily price points
            for day in range(days):
                date = base_date + timedelta(days=day)
                
                # Random walk with constraints (±10% change max)
                change_pct = self.rng.uniform(-0.10, 0.10)
                current_price = round(current_price * (1 + change_pct), 2)
                
                # Keep within reasonable bounds (50% - 150% of base)
                current_price = max(base_price * 0.5, min(base_price * 1.5, current_price))
                current_price = round(current_price, 2)
                
                # Determine event type
                if day == 0:
                    event_type = "price_check"
                elif change_pct < -0.05:
                    event_type = "sale_started"
                elif change_pct > 0.05:
                    event_type = "sale_ended"
                else:
                    event_type = "price_check"
                
                history_record = {
                    "id": str(uuid.uuid4()),
                    "product_event_id": product_id,
                    "original_price_cents": int(float(product["original_price"]) * 100) if product.get("original_price") else None,
                    "sale_price_cents": int(current_price * 100),
                    "in_stock": product.get("availability") == "in_stock",
                    "recorded_at": date.isoformat(),
                    "event_type": event_type,
                }
                price_history.append(history_record)
        
        self.stats["total_price_history"] = len(price_history)
        return price_history
    
    def generate_analytics_data(
        self,
        products: List[Dict[str, Any]],
        days: int = 30,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Generate analytics data for price trends and discount patterns."""
        analytics = {
            "price_trends": [],
            "discount_patterns": [],
            "metrics": [],
        }
        
        base_date = datetime.now() - timedelta(days=days)
        
        # Group products by category
        by_category = {}
        for p in products:
            cat = p["category"]
            if cat not in by_category:
                by_category[cat] = []
            by_category[cat].append(p)
        
        # Generate price trends per category per day
        for category, cat_products in by_category.items():
            for day in range(days):
                date = base_date + timedelta(days=day)
                prices = [float(p["sale_price"]) for p in cat_products 
                         if p.get("sale_price")]
                
                if prices:
                    avg_price = sum(prices) / len(prices)
                    min_price = min(prices)
                    max_price = max(prices)
                    
                    # Calculate volatility (std dev)
                    variance = sum((p - avg_price) ** 2 for p in prices) / len(prices)
                    volatility = variance ** 0.5
                    
                    # Determine trend direction (mock logic)
                    if day > 0:
                        prev_day_prices = [p * (1 + self.rng.uniform(-0.05, 0.05)) for p in prices]
                        prev_avg = sum(prev_day_prices) / len(prev_day_prices)
                        if avg_price > prev_avg * 1.02:
                            trend = "rising"
                        elif avg_price < prev_avg * 0.98:
                            trend = "falling"
                        else:
                            trend = "stable"
                    else:
                        trend = "stable"
                    
                    analytics["price_trends"].append({
                        "id": str(uuid.uuid4()),
                        "category": category,
                        "date": date.date().isoformat(),
                        "avg_price_cents": int(avg_price * 100),
                        "min_price_cents": int(min_price * 100),
                        "max_price_cents": int(max_price * 100),
                        "price_volatility": round(volatility, 4),
                        "trend_direction": trend,
                    })
        
        # Generate discount patterns per retailer
        for retailer_id, personality in RETAILER_PERSONALITIES.items():
            for category in by_category.keys():
                pattern_types = ["flash_sale", "seasonal", "clearance", "weekend_deal", "member_exclusive"]
                frequencies = ["weekly", "monthly", "quarterly", "daily"]
                
                analytics["discount_patterns"].append({
                    "id": str(uuid.uuid4()),
                    "shop_name": retailer_id,
                    "category": category,
                    "pattern_type": self.rng.choice(pattern_types),
                    "avg_discount_percentage": round(self.rng.uniform(*personality["discount_depth"]) * 100, 2),
                    "frequency": self.rng.choice(frequencies),
                    "typical_start_day": self.rng.randint(0, 6),
                    "typical_duration_days": self.rng.randint(1, 7),
                })
        
        # Generate pipeline performance metrics
        metric_names = [
            ("products_scraped", "count"),
            ("scrape_duration_ms", "ms"),
            ("api_response_time", "ms"),
            ("success_rate", "percent"),
            ("error_count", "count"),
        ]
        
        for day in range(days):
            date = base_date + timedelta(days=day)
            for metric_name, unit in metric_names:
                if "rate" in metric_name or "percent" in unit:
                    value = self.rng.uniform(85.0, 99.9)
                elif "time" in metric_name or "ms" in unit:
                    value = self.rng.uniform(50.0, 500.0)
                else:
                    value = float(self.rng.randint(100, 5000))
                
                analytics["metrics"].append({
                    "id": str(uuid.uuid4()),
                    "metric_name": metric_name,
                    "metric_value": round(value, 4),
                    "unit": unit,
                    "tags": json.dumps({"source": "generator"}),
                    "recorded_at": date.isoformat(),
                })
        
        return analytics


# ============================================================================
# DATABASE OPERATIONS
# ============================================================================

class DatabaseSeeder:
    """Handles database seeding operations."""
    
    def __init__(self, db_url: Optional[str] = None):
        self.db_url = db_url
        self.conn = None
        self.rows_inserted = 0
    
    def connect(self):
        """Establish database connection."""
        self.conn = get_db_connection(self.db_url)
        return self
    
    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            self.conn = None
    
    def seed_shops(self) -> int:
        """Seed the shops table. Returns number of shops inserted."""
        if not self.conn:
            raise RuntimeError("Not connected to database")
        
        cursor = self.conn.cursor()
        inserted = 0
        
        for retailer_id, personality in RETAILER_PERSONALITIES.items():
            try:
                cursor.execute("""
                    INSERT INTO shops (name, display_name, base_url, location, scrape_frequency_minutes)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (name) DO UPDATE SET
                        display_name = EXCLUDED.display_name,
                        base_url = EXCLUDED.base_url,
                        location = EXCLUDED.location,
                        updated_at = NOW()
                    RETURNING id
                """, (
                    retailer_id.replace("_skateshop", "").replace("_store", ""),
                    personality["display_name"],
                    personality["base_url"],
                    personality["location"],
                    60
                ))
                self.conn.commit()
                inserted += 1
            except psycopg2.Error as e:
                print(f"⚠️  Error inserting shop {retailer_id}: {e}")
                self.conn.rollback()
        
        cursor.close()
        self.rows_inserted += inserted
        return inserted
    
    def seed_categories(self) -> int:
        """Seed the categories table. Returns number of categories inserted."""
        if not self.conn:
            raise RuntimeError("Not connected to database")
        
        cursor = self.conn.cursor()
        inserted = 0
        
        category_display = {
            "decks": "Decks",
            "trucks": "Trucks", 
            "wheels": "Wheels",
            "bearings": "Bearings",
            "hardware": "Hardware",
            "grip_tape": "Grip Tape",
            "wax": "Wax",
            "shoes": "Shoes",
            "apparel": "Apparel",
        }
        
        for i, (cat_key, display_name) in enumerate(category_display.items()):
            try:
                cursor.execute("""
                    INSERT INTO categories (name, display_name, sort_order)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (name) DO UPDATE SET
                        display_name = EXCLUDED.display_name,
                        sort_order = EXCLUDED.sort_order
                    RETURNING id
                """, (cat_key, display_name, i + 1))
                self.conn.commit()
                inserted += 1
            except psycopg2.Error as e:
                print(f"⚠️  Error inserting category {cat_key}: {e}")
                self.conn.rollback()
        
        cursor.close()
        self.rows_inserted += inserted
        return inserted
    
    def seed_brands(self) -> int:
        """Seed the brands table with brands from products."""
        if not self.conn:
            raise RuntimeError("Not connected to database")
        
        cursor = self.conn.cursor()
        inserted = 0
        
        # Extract unique brands from products
        brands = set()
        for category_products in SKATE_PRODUCTS.values():
            for _, brand, _, _ in category_products:
                if brand:
                    brands.add(brand)
        
        skater_owned_brands = {
            "Baker", "Independent", "Spitfire", "Thrasher", "Anti-Hero",
            "Thunder", "Bones", "Bronson", "Andale", "Modus",
            "Mob", "Jessup", "Shake Junt", "Black Diamond",
            "Shortys", "Skate Mental", "Diamond",
        }
        
        for brand in sorted(brands):
            try:
                cursor.execute("""
                    INSERT INTO brands (name, display_name, is_skater_owned)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (name) DO UPDATE SET
                        display_name = EXCLUDED.display_name,
                        is_skater_owned = EXCLUDED.is_skater_owned
                    RETURNING id
                """, (
                    brand.lower(),
                    brand,
                    brand in skater_owned_brands
                ))
                self.conn.commit()
                inserted += 1
            except psycopg2.Error as e:
                print(f"⚠️  Error inserting brand {brand}: {e}")
                self.conn.rollback()
        
        cursor.close()
        self.rows_inserted += inserted
        return inserted
    
    def insert_products(self, products: List[Dict[str, Any]], batch_size: int = 100) -> int:
        """Insert products directly to database."""
        if not self.conn:
            raise RuntimeError("Not connected to database")
        
        cursor = self.conn.cursor()
        inserted = 0
        
        # Get shop and category mappings
        cursor.execute("SELECT id, name FROM shops")
        shop_map = {name: str(shop_id) for shop_id, name in cursor.fetchall()}
        
        cursor.execute("SELECT id, name FROM categories")
        cat_map = {name: str(cat_id) for cat_id, name in cursor.fetchall()}
        
        cursor.execute("SELECT id, name FROM brands")
        brand_map = {name.lower(): str(brand_id) for brand_id, name in cursor.fetchall()}
        
        # Process in batches
        progress_iter = tqdm(range(0, len(products), batch_size), desc="Inserting products") if HAS_TQDM else range(0, len(products), batch_size)
        
        for i in progress_iter:
            batch = products[i:i + batch_size]
            values = []
            
            for p in batch:
                # Map source to shop_id
                shop_name = p["source"].replace("_skateshop", "").replace("_store", "")
                shop_id = shop_map.get(shop_name)
                
                if not shop_id:
                    continue
                
                # Map category
                cat_name = CATEGORY_MAP.get(p["category"], p["category"])
                cat_id = cat_map.get(cat_name)
                
                # Map brand
                brand_name = p.get("brand", "").lower() if p.get("brand") else None
                brand_id = brand_map.get(brand_name) if brand_name else None
                
                try:
                    original_price_cents = int(float(p.get("original_price", 0)) * 100) if p.get("original_price") else None
                    sale_price_cents = int(float(p["sale_price"]) * 100)
                except (ValueError, TypeError):
                    continue
                
                values.append((
                    shop_id,
                    cat_id,
                    brand_id,
                    p["source_product_id"],
                    p["title"][:500],  # Truncate to fit VARCHAR(500)
                    p["product_url"],
                    p.get("image_url"),
                    original_price_cents,
                    sale_price_cents,
                    p.get("availability") == "in_stock",
                    p.get("stock_quantity"),
                    p.get("availability", "unknown"),
                    json.dumps({"color": p.get("color"), "size": p.get("size")}),
                    p.get("discount_percentage"),
                    datetime.fromtimestamp(p["event_timestamp"] / 1000),
                ))
            
            if not values:
                continue
            
            try:
                execute_values(cursor, """
                    INSERT INTO products (
                        shop_id, category_id, brand_id, external_id, title,
                        product_url, image_url, original_price_cents, sale_price_cents,
                        in_stock, stock_quantity, availability_status, attributes,
                        discount_percentage, last_scraped_at
                    ) VALUES %s
                    ON CONFLICT (shop_id, external_id) DO UPDATE SET
                        category_id = EXCLUDED.category_id,
                        brand_id = EXCLUDED.brand_id,
                        title = EXCLUDED.title,
                        product_url = EXCLUDED.product_url,
                        image_url = EXCLUDED.image_url,
                        original_price_cents = EXCLUDED.original_price_cents,
                        sale_price_cents = EXCLUDED.sale_price_cents,
                        in_stock = EXCLUDED.in_stock,
                        stock_quantity = EXCLUDED.stock_quantity,
                        availability_status = EXCLUDED.availability_status,
                        attributes = EXCLUDED.attributes,
                        discount_percentage = EXCLUDED.discount_percentage,
                        last_scraped_at = EXCLUDED.last_scraped_at,
                        updated_at = NOW()
                """, values)
                self.conn.commit()
                inserted += len(values)
            except psycopg2.Error as e:
                print(f"⚠️  Error inserting batch: {e}")
                self.conn.rollback()
        
        cursor.close()
        self.rows_inserted += inserted
        return inserted
    
    def __enter__(self):
        return self.connect()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()


# ============================================================================
# SQL EXPORT
# ============================================================================

def escape_sql_string(value: Any) -> str:
    """Escape a string value for SQL insertion."""
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (datetime,)):
        return f"'{value.isoformat()}'"
    
    # String escaping
    s = str(value)
    s = s.replace("'", "''")  # Escape single quotes
    s = s.replace("\\", "\\\\")  # Escape backslashes
    return f"'{s}'"


def generate_sql_inserts(
    products: List[Dict[str, Any]],
    price_history: Optional[List[Dict[str, Any]]] = None,
    analytics: Optional[Dict[str, List[Dict[str, Any]]]] = None,
) -> str:
    """Generate SQL INSERT statements for products and related data."""
    lines = []
    lines.append("-- SkateStock Demo Data SQL Export")
    lines.append(f"-- Generated: {datetime.now().isoformat()}")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")
    
    # Insert products
    lines.append("-- Products")
    for p in products:
        values = {
            "id": str(uuid.uuid4()),
            "shop_id": "(SELECT id FROM shops WHERE name = " + escape_sql_string(p["source"].replace("_skateshop", "").replace("_store", "")) + ")",
            "category_id": "(SELECT id FROM categories WHERE name = " + escape_sql_string(CATEGORY_MAP.get(p["category"], p["category"])) + ")",
            "external_id": escape_sql_string(p["source_product_id"]),
            "title": escape_sql_string(p["title"][:500]),
            "product_url": escape_sql_string(p["product_url"]),
            "image_url": escape_sql_string(p.get("image_url")),
            "original_price_cents": int(float(p.get("original_price", 0)) * 100) if p.get("original_price") else "NULL",
            "sale_price_cents": int(float(p["sale_price"]) * 100),
            "in_stock": escape_sql_string(p.get("availability") == "in_stock"),
            "stock_quantity": p.get("stock_quantity") or "NULL",
            "availability_status": escape_sql_string(p.get("availability", "unknown")),
            "attributes": escape_sql_string(json.dumps({"color": p.get("color"), "size": p.get("size")})),
            "discount_percentage": p.get("discount_percentage") or "NULL",
            "last_scraped_at": escape_sql_string(datetime.fromtimestamp(p["event_timestamp"] / 1000)),
        }
        
        # For shop_id and category_id subqueries, we need special handling
        sql = f"""INSERT INTO products (id, shop_id, category_id, external_id, title, product_url, image_url,
            original_price_cents, sale_price_cents, in_stock, stock_quantity, availability_status,
            attributes, discount_percentage, last_scraped_at)
        SELECT 
            {values['id']},
            {values['shop_id']},
            {values['category_id']},
            {values['external_id']},
            {values['title']},
            {values['product_url']},
            {values['image_url']},
            {values['original_price_cents']},
            {values['sale_price_cents']},
            {values['in_stock']},
            {values['stock_quantity']},
            {values['availability_status']},
            {values['attributes']},
            {values['discount_percentage']},
            {values['last_scraped_at']}
        ON CONFLICT (shop_id, external_id) DO UPDATE SET
            title = EXCLUDED.title,
            sale_price_cents = EXCLUDED.sale_price_cents,
            updated_at = NOW();"""
        
        lines.append(sql)
    
    # Insert price history if provided
    if price_history:
        lines.append("")
        lines.append("-- Price History")
        for h in price_history:
            sql = f"""INSERT INTO price_history (id, product_id, original_price_cents, sale_price_cents, in_stock, recorded_at, event_type)
            VALUES (
                {escape_sql_string(h['id'])},
                (SELECT id FROM products WHERE external_id = {escape_sql_string(h.get('product_event_id', ''))} LIMIT 1),
                {h.get('original_price_cents') or 'NULL'},
                {h['sale_price_cents']},
                {escape_sql_string(h.get('in_stock', True))},
                {escape_sql_string(h['recorded_at'])},
                {escape_sql_string(h.get('event_type', 'price_check'))}
            );"""
            lines.append(sql)
    
    lines.append("")
    lines.append("COMMIT;")
    
    return "\n".join(lines)


# ============================================================================
# API SEEDING (Original functionality)
# ============================================================================

def seed_database_api(
    products: List[Dict[str, Any]],
    api_url: str = "http://localhost:8000",
):
    """Seed the database via API."""
    if not HAS_REQUESTS:
        print("❌ requests library not available. Install with: pip install requests")
        return
    
    print(f"🌱 Seeding {len(products)} products via API...")

    # Batch insert via API
    batch_size = 100
    progress_iter = tqdm(range(0, len(products), batch_size), desc="API seeding") if HAS_TQDM else range(0, len(products), batch_size)
    
    for i in progress_iter:
        batch = products[i : i + batch_size]
        try:
            response = requests.post(
                f"{api_url}/demo/bulk-insert",
                json={"products": batch},
                timeout=30,
            )
            if response.status_code == 200:
                if not HAS_TQDM:
                    print(f"  ✅ Batch {i//batch_size + 1}/{(len(products)-1)//batch_size + 1} inserted")
            else:
                print(f"  ⚠️  Batch {i//batch_size + 1} failed: {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"  ❌ Cannot connect to API at {api_url}")
            print("  💡 Is the stack running? Run 'make demo' first")
            break
        except Exception as e:
            print(f"  ❌ Error: {e}")

    print("✅ API seeding complete")


# ============================================================================
# MAIN
# ============================================================================

def print_summary(stats: Dict[str, Any]):
    """Print generation summary."""
    print("\n" + "=" * 60)
    print("📊 GENERATION SUMMARY")
    print("=" * 60)
    print(f"Total Products Generated:     {stats['total_products']:,}")
    print(f"Total Price History Records:  {stats['total_price_history']:,}")
    print(f"Total Database Rows Inserted: {stats['db_rows_inserted']:,}")
    print("\nBy Shop:")
    for shop, count in sorted(stats['by_shop'].items()):
        shop_name = RETAILER_PERSONALITIES.get(shop, {}).get("name", shop)
        print(f"  • {shop_name}: {count:,} products")
    print("\nBy Category:")
    for cat, count in sorted(stats['by_category'].items()):
        print(f"  • {cat}: {count:,} products")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Generate demo data for SkateStock",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Generate 5000 products and seed via API
    python generate_demo_data.py --days 7 --products-per-day 800
    
    # Generate and insert directly to database
    python generate_demo_data.py --direct-to-db --days 30
    
    # Generate SQL file only
    python generate_demo_data.py --days 7 --output-sql demo_data.sql
    
    # Generate with price history
    python generate_demo_data.py --direct-to-db --price-history-days 30
    
    # Seed shops and categories only
    python generate_demo_data.py --seed-shops --seed-categories
        """
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Number of days of data (default: 7)",
    )
    parser.add_argument(
        "--products-per-day",
        type=int,
        default=800,
        help="Products per day (default: 800)",
    )
    parser.add_argument(
        "--chaos",
        action="store_true",
        help="Enable chaos mode (duplicates, stockouts, data issues)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducibility (default: 42)",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Output JSON file (optional)",
    )
    parser.add_argument(
        "--output-sql",
        type=str,
        help="Output SQL file (optional)",
    )
    parser.add_argument(
        "--no-seed-db",
        action="store_true",
        help="Skip database seeding, just output to file",
    )
    parser.add_argument(
        "--api-url",
        type=str,
        default="http://localhost:8000",
        help="API base URL",
    )
    parser.add_argument(
        "--direct-to-db",
        action="store_true",
        help="Insert directly to PostgreSQL database",
    )
    parser.add_argument(
        "--db-url",
        type=str,
        help="PostgreSQL connection URL (or use DATABASE_URL env var)",
    )
    parser.add_argument(
        "--seed-shops",
        action="store_true",
        help="Seed shops table",
    )
    parser.add_argument(
        "--seed-categories",
        action="store_true",
        help="Seed categories table",
    )
    parser.add_argument(
        "--price-history-days",
        type=int,
        default=0,
        help="Generate price history for N days (default: 0, disabled)",
    )
    parser.add_argument(
        "--generate-analytics",
        action="store_true",
        help="Generate analytics data (price trends, discount patterns, metrics)",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        default=True,
        help="Validate generated data (default: True)",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=100,
        help="Batch size for database inserts (default: 100)",
    )

    args = parser.parse_args()

    print("🛹 SkateStock Demo Data Generator")
    print(f"   Days: {args.days}")
    print(f"   Products per day: {args.products_per_day}")
    print(f"   Chaos mode: {'ON' if args.chaos else 'OFF'}")
    print(f"   Seed: {args.seed}")
    print(f"   Direct to DB: {'ON' if args.direct_to_db else 'OFF'}")
    if args.price_history_days:
        print(f"   Price History: {args.price_history_days} days")
    print()

    # Handle shop/category seeding only
    if args.seed_shops or args.seed_categories:
        if not HAS_PSYCOPG2:
            print("❌ psycopg2-binary is required for database operations.")
            print("   Install with: pip install psycopg2-binary")
            return 1
        
        with DatabaseSeeder(args.db_url) as seeder:
            if args.seed_shops:
                count = seeder.seed_shops()
                print(f"✅ Seeded {count} shops")
            if args.seed_categories:
                count = seeder.seed_categories()
                print(f"✅ Seeded {count} categories")
            # Also seed brands
            count = seeder.seed_brands()
            print(f"✅ Seeded {count} brands")
        return 0

    # Initialize generator
    generator = DemoDataGenerator(seed=args.seed, chaos_mode=args.chaos)
    
    # Generate products
    products = generator.generate_demo_dataset(
        days=args.days,
        products_per_day=args.products_per_day,
    )
    
    print(f"📊 Generated {len(products)} product events")
    print()
    
    # Validate data
    if args.validate:
        print("🔍 Validating generated data...")
        valid_count, errors = DataValidator.validate_products(products)
        if errors:
            print(f"  ⚠️  {len(errors)} validation errors found:")
            for error in errors[:10]:  # Show first 10
                print(f"    - {error}")
            if len(errors) > 10:
                print(f"    ... and {len(errors) - 10} more")
        else:
            print(f"  ✅ All {valid_count} products validated successfully")
        print()
    
    # Generate price history if requested
    price_history = None
    if args.price_history_days > 0:
        print(f"📈 Generating price history ({args.price_history_days} days)...")
        price_history = generator.generate_price_history(products, days=args.price_history_days)
        print(f"  ✅ Generated {len(price_history)} price history records")
        print()
    
    # Generate analytics if requested
    analytics = None
    if args.generate_analytics:
        print("📊 Generating analytics data...")
        analytics = generator.generate_analytics_data(products, days=args.days)
        print(f"  ✅ Generated {len(analytics['price_trends'])} price trends")
        print(f"  ✅ Generated {len(analytics['discount_patterns'])} discount patterns")
        print(f"  ✅ Generated {len(analytics['metrics'])} metrics")
        print()
    
    # Save to JSON file if requested
    if args.output:
        output_data = {
            "products": products,
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "days": args.days,
                "products_per_day": args.products_per_day,
                "total_products": len(products),
            }
        }
        if price_history:
            output_data["price_history"] = price_history
        if analytics:
            output_data["analytics"] = analytics
            
        with open(args.output, "w") as f:
            json.dump(output_data, f, indent=2, default=str)
        print(f"💾 Saved to {args.output}")
    
    # Save to SQL file if requested
    if args.output_sql:
        sql = generate_sql_inserts(products, price_history, analytics)
        with open(args.output_sql, "w") as f:
            f.write(sql)
        print(f"💾 Saved SQL to {args.output_sql}")
    
    # Insert directly to database
    if args.direct_to_db:
        if not HAS_PSYCOPG2:
            print("❌ psycopg2-binary is required for database operations.")
            print("   Install with: pip install psycopg2-binary")
            return 1
        
        print("🗄️  Inserting directly to database...")
        with DatabaseSeeder(args.db_url) as seeder:
            # First seed shops and categories if they don't exist
            seeder.seed_shops()
            seeder.seed_categories()
            seeder.seed_brands()
            
            # Then insert products
            count = seeder.insert_products(products, batch_size=args.batch_size)
            print(f"✅ Inserted {count} products")
            
            generator.stats["db_rows_inserted"] = seeder.rows_inserted
    
    # Seed via API (original functionality)
    elif not args.no_seed_db:
        if not HAS_REQUESTS:
            print("❌ requests library not available. Install with: pip install requests")
            print("   Or use --direct-to-db flag to insert directly to database")
        else:
            seed_database_api(products, args.api_url)
    
    # Print summary
    print_summary(generator.stats)
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
