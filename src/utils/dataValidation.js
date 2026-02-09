/**
 * Data Validation Utilities for SkateStock
 * Validates and normalizes scraped product data
 */

/**
 * Validates a product object has required fields
 */
function validateProduct(product) {
  if (!product) return false;
  
  // Required fields
  if (!product.productId) return false;
  if (!product.title || product.title.trim() === '') return false;
  if (!product.link || product.link.trim() === '') return false;
  
  // Link must be a valid URL
  try {
    new URL(product.link);
  } catch {
    return false;
  }
  
  return true;
}

/**
 * Normalizes price strings to consistent format
 */
function normalizePrice(price) {
  if (!price || price === 'No sale price found' || price === 'No original price found') {
    return undefined;
  }
  
  // Extract numeric value from price string
  const match = price.match(/[\d,]+\.?\d*/);
  if (match) {
    const numericValue = parseFloat(match[0].replace(/,/g, ''));
    if (!isNaN(numericValue)) {
      return `$${numericValue.toFixed(2)}`;
    }
  }
  
  return price;
}

/**
 * Normalizes image URLs
 */
function normalizeImageUrl(image) {
  if (!image || image === 'No image found') {
    return '/placeholder-product.jpg';
  }
  
  // Ensure HTTPS
  if (image.startsWith('//')) {
    return `https:${image}`;
  }
  
  return image;
}

/**
 * Normalizes product types to consistent categories
 */
function normalizeProductType(type) {
  if (!type || type === 'No type found' || type === 'No product type found') {
    return 'Other';
  }
  
  const normalized = type.trim().toLowerCase();
  
  // Map common variations to standard types
  const typeMap = {
    't-shirts': 'T-Shirts',
    'tshirt': 'T-Shirts',
    't shirt': 'T-Shirts',
    'shirts': 'Shirts',
    'hoodies': 'Sweatshirts',
    'sweatshirts': 'Sweatshirts',
    'crewneck': 'Sweatshirts',
    'shoes': 'Shoes',
    'sneakers': 'Shoes',
    'footwear': 'Shoes',
    'decks': 'Decks',
    'skateboards': 'Decks',
    'trucks': 'Trucks',
    'wheels': 'Wheels',
    'bearings': 'Bearings',
    'hats': 'Hats',
    'caps': 'Hats',
    'beanies': 'Beanies',
    'pants': 'Pants',
    'jeans': 'Pants',
    'shorts': 'Shorts',
    'videos': 'Videos',
    'dvd': 'Videos',
    'accessories': 'Accessories',
    'socks': 'Accessories',
    'backpacks': 'Accessories',
    'bags': 'Accessories',
  };
  
  return typeMap[normalized] || type.charAt(0).toUpperCase() + type.slice(1);
}

/**
 * Normalizes product data from different sources
 */
function normalizeProduct(product, source) {
  const normalized = {
    productId: product.productId || `unknown-${Date.now()}`,
    title: product.title?.trim() || 'Unknown Product',
    salePrice: normalizePrice(product.salePrice),
    originalPrice: normalizePrice(product.originalPrice),
    link: product.link || '',
    image: normalizeImageUrl(product.image),
    productType: normalizeProductType(product.productType),
  };
  
  return normalized;
}

/**
 * Removes duplicate products based on productId
 */
function deduplicateProducts(products) {
  const seen = new Set();
  return products.filter((product) => {
    if (seen.has(product.productId)) {
      return false;
    }
    seen.add(product.productId);
    return true;
  });
}

/**
 * Filters out invalid products
 */
function filterValidProducts(products) {
  return products
    .filter((p) => validateProduct(p))
    .map((p) => normalizeProduct(p, 'unknown'));
}

module.exports = {
  validateProduct,
  normalizeProduct,
  deduplicateProducts,
  filterValidProducts,
};
