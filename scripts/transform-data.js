/**
 * Transform scraped data from shop scrapers into the frontend Product format.
 * Run after scraping: node scripts/transform-data.js
 */

const fs = require("fs");
const path = require("path");

// Price parsing
function parsePrice(priceStr) {
  if (!priceStr || priceStr === "No sale price found" || priceStr === "No original price found") {
    return null;
  }
  const match = priceStr.match(/[\d,]+\.?\d*/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ""));
  }
  return null;
}

// Category mapping
function normalizeCategory(type) {
  if (!type) return "other";
  const lower = type.toLowerCase();
  const map = {
    shoes: "Shoes",
    "t-shirts": "T-Shirts",
    tshirts: "T-Shirts",
    tshirt: "T-Shirts",
    shirts: "Shirts",
    sweatshirts: "Sweatshirts",
    hoodies: "Sweatshirts",
    pants: "Pants",
    shorts: "Shorts",
    hats: "Hats",
    caps: "Hats",
    videos: "Videos",
    dvds: "Videos",
    jackets: "Jackets",
    accessories: "Accessories",
    decks: "Decks",
  };
  return map[lower] || "other";
}

// Extract brand from title
function extractBrand(title) {
  const knownBrands = [
    "Nike SB", "Vans", "Adidas", "Converse", "New Balance", "ASICS", "DC",
    "Baker", "Thrasher", "Independent", "Spitfire", "Polar", "Dime", "Supreme",
    "Primitive", "Toy Machine", "Real", "Flip", "Deathwish", "Creature",
    "Enjoi", "Girl", "Chocolate", "Santa Cruz", "Element", "Birdhouse",
    "Plan B", "Almost", "Darkroom", " Carpet", "Adidas", "Nike",
  ];
  for (const brand of knownBrands) {
    if (title.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }
  return "Other";
}

// Load scraped data
function loadScrapedData(filename) {
  const filePath = path.join(process.cwd(), "src", "app", "api", "scraped-data", filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  }
  return [];
}

// Transform a raw product to frontend format
function transformProduct(raw, shopName) {
  const salePrice = parsePrice(raw.salePrice);
  const originalPrice = parsePrice(raw.originalPrice);
  const discount = originalPrice && salePrice && originalPrice > salePrice
    ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
    : 0;

  return {
    id: raw.productId || Math.abs(hashString(raw.title + raw.link)),
    title: raw.title || "Unknown Product",
    brand: extractBrand(raw.title),
    category: normalizeCategory(raw.productType),
    shop: shopName,
    originalPrice: originalPrice || salePrice || 0,
    salePrice: salePrice || 0,
    discount,
    imageUrl: raw.image && raw.image !== "No image found" ? raw.image : null,
    productUrl: raw.link || "",
    isOnSale: discount > 0,
    isNew: false, // Can't determine from scrape
    stockStatus: "in_stock", // Default, scraper doesn't track stock quantity
    lastUpdated: new Date().toISOString(),
  };
}

// Simple hash for IDs
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Main transform
function transformAll() {
  const shops = [
    { file: "seasonsScrapedData.json", name: "Seasons Skate Shop" },
    { file: "premierScrapedData.json", name: "Premier Store" },
    { file: "laborScrapedData.json", name: "Labor Skate Shop" },
    { file: "njScrapedData.json", name: "NJ Skate Shop" },
    { file: "blacksheepScrapedData.json", name: "Black Sheep Skate Shop" },
  ];

  const allProducts = [];

  for (const shop of shops) {
    const data = loadScrapedData(shop.file);
    console.log(`Loaded ${data.length} products from ${shop.name}`);
    for (const raw of data) {
      try {
        const product = transformProduct(raw, shop.name);
        if (product.salePrice > 0 && product.title !== "Unknown Product") {
          allProducts.push(product);
        }
      } catch (e) {
        // Skip bad products
      }
    }
  }

  // Save transformed data
  const outputPath = path.join(process.cwd(), "src", "lib", "scrapedProducts.json");
  fs.writeFileSync(outputPath, JSON.stringify(allProducts, null, 2));
  console.log(`\nTransformed ${allProducts.length} total products saved to ${outputPath}`);

  // Also show category breakdown
  const categories = {};
  for (const p of allProducts) {
    categories[p.category] = (categories[p.category] || 0) + 1;
  }
  console.log("\nBy category:");
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}`);
  });
}

transformAll();
