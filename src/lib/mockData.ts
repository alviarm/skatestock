// Mock product data for development
// This mirrors the database schema

export interface Product {
  id: number;
  title: string;
  brand: string;
  category: string;
  shop: string;
  originalPrice: number;
  salePrice: number;
  discount: number;
  imageUrl: string;
  productUrl: string;
  isOnSale: boolean;
  isNew: boolean;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  lastUpdated: string;
}

export interface SearchFilters {
  query: string;
  brands: string[];
  categories: string[];
  shops: string[];
  sizes: string[];
  minPrice: string;
  maxPrice: string;
  onSaleOnly: boolean;
  sort: "relevance" | "price_asc" | "price_desc" | "discount" | "newest";
  page: number;
}

export const SHOPS = [
  "Seasons Skate Shop",
  "Premier Store",
  "Labor Skate Shop",
  "NJ Skate Shop",
  "Black Sheep Skate Shop",
];

export const CATEGORIES = [
  "Decks",
  "Trucks",
  "Wheels",
  "Bearings",
  "Shoes",
  "T-Shirts",
  "Sweatshirts",
  "Pants",
  "Hats",
  "Beanies",
  "Videos",
];

export const BRANDS = [
  "Nike SB",
  "Vans",
  "Adidas",
  "Converse",
  "New Balance",
  "ASICS",
  "DC",
  "Baker",
  "Thrasher",
  "Independent",
  "Spitfire",
  "Polar",
  "Dime",
  "Supreme",
  "Primitive",
  "Toy Machine",
  "Real",
  "Flip",
  "Deathwish",
  "Creature",
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    title: "Nike SB Dunk Low Pro QS 'Panda'",
    brand: "Nike SB",
    category: "Shoes",
    shop: "Seasons Skate Shop",
    originalPrice: 115.0,
    salePrice: 92.0,
    discount: 20,
    imageUrl: "https://images.skatedeluxe.com/images/94c4e5a9c7ef4f7a9f0b3e7e5d4c3b2 NikeSB_Dunk_Low_Panda.jpg",
    productUrl: "https://example.com/product/1",
    isOnSale: true,
    isNew: false,
    stockStatus: "in_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 2,
    title: "Vans Old Skool Pro",
    brand: "Vans",
    category: "Shoes",
    shop: "Premier Store",
    originalPrice: 75.0,
    salePrice: 75.0,
    discount: 0,
    imageUrl: "",
    productUrl: "https://example.com/product/2",
    isOnSale: false,
    isNew: true,
    stockStatus: "in_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 3,
    title: "Baker Brand Logo Deck 8.25",
    brand: "Baker",
    category: "Decks",
    shop: "Labor Skate Shop",
    originalPrice: 65.0,
    salePrice: 52.0,
    discount: 20,
    imageUrl: "",
    productUrl: "https://example.com/product/3",
    isOnSale: true,
    isNew: false,
    stockStatus: "low_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 4,
    title: "Spitfire Formula Four Classic 54mm 99a",
    brand: "Spitfire",
    category: "Wheels",
    shop: "NJ Skate Shop",
    originalPrice: 45.0,
    salePrice: 36.0,
    discount: 20,
    imageUrl: "",
    productUrl: "https://example.com/product/4",
    isOnSale: true,
    isNew: false,
    stockStatus: "in_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 5,
    title: "Independent Stage 11 Hollows",
    brand: "Independent",
    category: "Trucks",
    shop: "Black Sheep Skate Shop",
    originalPrice: 75.0,
    salePrice: 75.0,
    discount: 0,
    imageUrl: "",
    productUrl: "https://example.com/product/5",
    isOnSale: false,
    isNew: true,
    stockStatus: "in_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 6,
    title: "Polar Skate Co. 'Graphic' T-Shirt",
    brand: "Polar",
    category: "T-Shirts",
    shop: "Seasons Skate Shop",
    originalPrice: 45.0,
    salePrice: 36.0,
    discount: 20,
    imageUrl: "",
    productUrl: "https://example.com/product/6",
    isOnSale: true,
    isNew: false,
    stockStatus: "in_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 7,
    title: "Adidas Samba ADV",
    brand: "Adidas",
    category: "Shoes",
    shop: "Premier Store",
    originalPrice: 100.0,
    salePrice: 80.0,
    discount: 20,
    imageUrl: "",
    productUrl: "https://example.com/product/7",
    isOnSale: true,
    isNew: false,
    stockStatus: "in_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 8,
    title: "Thrasher Magazine Pullover Hoodie",
    brand: "Thrasher",
    category: "Sweatshirts",
    shop: "Labor Skate Shop",
    originalPrice: 70.0,
    salePrice: 70.0,
    discount: 0,
    imageUrl: "",
    productUrl: "https://example.com/product/8",
    isOnSale: false,
    isNew: true,
    stockStatus: "low_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 9,
    title: "Toy Machine 'Brain Slug' Deck 8.0",
    brand: "Toy Machine",
    category: "Decks",
    shop: "NJ Skate Shop",
    originalPrice: 60.0,
    salePrice: 48.0,
    discount: 20,
    imageUrl: "",
    productUrl: "https://example.com/product/9",
    isOnSale: true,
    isNew: false,
    stockStatus: "out_of_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 10,
    title: "Dime 'Essential' Cap",
    brand: "Dime",
    category: "Hats",
    shop: "Black Sheep Skate Shop",
    originalPrice: 35.0,
    salePrice: 35.0,
    discount: 0,
    imageUrl: "",
    productUrl: "https://example.com/product/10",
    isOnSale: false,
    isNew: true,
    stockStatus: "in_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 11,
    title: "Real Skateboards 'C-Type' Deck 8.5",
    brand: "Real",
    category: "Decks",
    shop: "Seasons Skate Shop",
    originalPrice: 65.0,
    salePrice: 52.0,
    discount: 20,
    imageUrl: "",
    productUrl: "https://example.com/product/11",
    isOnSale: true,
    isNew: false,
    stockStatus: "in_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
  {
    id: 12,
    title: "Bones Reds Bearings",
    brand: "Bones",
    category: "Bearings",
    shop: "Premier Store",
    originalPrice: 30.0,
    salePrice: 30.0,
    discount: 0,
    imageUrl: "",
    productUrl: "https://example.com/product/12",
    isOnSale: false,
    isNew: false,
    stockStatus: "in_stock",
    lastUpdated: "2026-04-10T12:00:00Z",
  },
];

export function filterProducts(products: Product[], filters: SearchFilters): Product[] {
  let filtered = [...products];

  // Text search
  if (filters.query) {
    const q = filters.query.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }

  // Brand filter
  if (filters.brands.length > 0) {
    filtered = filtered.filter((p) => filters.brands.includes(p.brand));
  }

  // Category filter
  if (filters.categories.length > 0) {
    filtered = filtered.filter((p) => filters.categories.includes(p.category));
  }

  // Shop filter
  if (filters.shops.length > 0) {
    filtered = filtered.filter((p) => filters.shops.includes(p.shop));
  }

  // Size filter (will work once we scrape size data)
  if (filters.sizes.length > 0) {
    // Currently scraped data doesn't have sizes — this is a placeholder
    // Once size data is scraped, products will have a 'sizes' array
    filtered = filtered.filter((p) => {
      if (!("sizes" in p) || !p.sizes || p.sizes.length === 0) {
        return true; // No size data — show product but it won't match
      }
      return filters.sizes.some((s) => (p.sizes as string[]).includes(s));
    });
  }

  // Price filter
  if (filters.minPrice) {
    filtered = filtered.filter((p) => p.salePrice >= parseFloat(filters.minPrice));
  }
  if (filters.maxPrice) {
    filtered = filtered.filter((p) => p.salePrice <= parseFloat(filters.maxPrice));
  }

  // On sale filter
  if (filters.onSaleOnly) {
    filtered = filtered.filter((p) => p.isOnSale);
  }

  // Sort
  switch (filters.sort) {
    case "price_asc":
      filtered.sort((a, b) => a.salePrice - b.salePrice);
      break;
    case "price_desc":
      filtered.sort((a, b) => b.salePrice - a.salePrice);
      break;
    case "discount":
      filtered.sort((a, b) => b.discount - a.discount);
      break;
    case "newest":
      filtered.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      break;
    default:
      // relevance - no change
      break;
  }

  return filtered;
}
