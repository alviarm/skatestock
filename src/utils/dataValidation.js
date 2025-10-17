// Utility functions for data validation and normalization

// Validate and normalize product data
function validateProduct(product) {
  // Check required fields
  if (!product.title || typeof product.title !== "string") {
    product.title = "Unknown Product";
  }

  if (!product.link || typeof product.link !== "string") {
    product.link = "#";
  }

  if (!product.image || typeof product.image !== "string") {
    product.image = "/placeholder-image.jpg";
  }

  // Validate product ID
  if (!product.productId || product.productId === "No ID found") {
    product.productId = Date.now() + Math.random(); // Generate temporary ID
  }

  // Validate product type
  if (!product.productType || product.productType === "No type found") {
    product.productType = "Unknown";
  }

  // Validate prices
  if (product.salePrice && product.salePrice !== "No sale price found") {
    // Ensure price is in correct format
    if (!product.salePrice.startsWith("$")) {
      product.salePrice = `$${product.salePrice}`;
    }
  } else {
    product.salePrice = null;
  }

  if (
    product.originalPrice &&
    product.originalPrice !== "No original price found"
  ) {
    // Ensure price is in correct format
    if (!product.originalPrice.startsWith("$")) {
      product.originalPrice = `$${product.originalPrice}`;
    }
  } else {
    product.originalPrice = null;
  }

  // Clean up title
  product.title = product.title.trim();

  // Clean up product type
  product.productType = product.productType.trim();

  return product;
}

// Normalize product data across different shops
function normalizeProduct(product, shopName) {
  // Apply validation first
  product = validateProduct(product);

  // Add shop identifier
  product.shop = shopName;

  // Normalize product types
  const typeMapping = {
    "t-shirts": "T-Shirts",
    "t-shirt": "T-Shirts",
    shirts: "Shirts",
    shirt: "Shirts",
    sweatshirts: "Sweatshirts",
    sweatshirt: "Sweatshirts",
    hoodies: "Sweatshirts",
    hoodie: "Sweatshirts",
    jackets: "Jackets",
    jacket: "Jackets",
    shoes: "Shoes",
    sneakers: "Shoes",
    footwear: "Shoes",
    pants: "Pants",
    trousers: "Pants",
    shorts: "Pants",
    hats: "Hats",
    hat: "Hats",
    caps: "Hats",
    cap: "Hats",
    beanies: "Beanies",
    beanie: "Beanies",
    dvd: "DVDs",
    dvds: "DVDs",
    videos: "DVDs",
    video: "DVDs",
    misc: "Miscellaneous",
    "misc.": "Miscellaneous",
  };

  const normalizedType = product.productType.toLowerCase();
  if (typeMapping[normalizedType]) {
    product.productType = typeMapping[normalizedType];
  }

  // Clean up image URLs
  if (product.image.startsWith("//")) {
    product.image = `https:${product.image}`;
  }

  return product;
}

// Deduplicate products based on title and price
function deduplicateProducts(products) {
  const seen = new Map();
  return products.filter((product) => {
    const key = `${product.title.toLowerCase()}-${
      product.salePrice || product.originalPrice
    }`;
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, true);
    return true;
  });
}

module.exports = {
  validateProduct,
  normalizeProduct,
  deduplicateProducts,
};
