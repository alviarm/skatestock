# SkateStock — Full Product Specification

## Role
Senior full-stack engineer specializing in scalable web scrapers, real-time data aggregation, and privacy-first architecture. Building a production-ready competitor to shoplurker.com—a skateboard shop inventory aggregator.

## Target: ShopLurker (shoplurker.com)
- Aggregates sale items from 120+ skate shops
- Regions: USA, Canada
- Shopify-only store support (excludes WooCommerce, BigCommerce, custom)
- Limited filtering (basic category/size; no multi-select, price sorting, location radius)
- No real-time inventory sync or stock-level alerts
- Minimal UX: no saved searches, price history, or personalized recommendations
- No API for developers or third-party integrations
- Opaque data freshness timestamps
- No accessibility optimization or mobile-first PWA support

## Architecture

### 1. ShopAdapter Interface (src/lib/scraper-adapters/)
```
ShopAdapter (abstract base)
├── ShopifyAdapter — Shopify stores
├── WooCommerceAdapter — WooCommerce stores
└── GenericHtmlAdapter — custom HTML sites (fallback)
```

Required methods:
- `fetchSaleItems(options?)` — main entry point
- `normalizeProduct(raw)` — normalize to common schema
- `isAvailable()` — health check

### 2. Normalized Product Schema
```typescript
interface NormalizedProduct {
  externalId: string;
  shopId: string;
  title: string;
  brand: string;
  category: ProductCategory;
  originalPrice: number | null;
  salePrice: number | null;
  currency: string;
  discountPercentage: number | null;
  imageUrl: string | null;
  productUrl: string;
  sizes: ProductSize[];
  stockStatus: StockStatus;
  lastUpdated: Date;
}
```

### 3. Category Enum
```
decks | trucks | wheels | bearings | shoes |
tshirts | sweatshirts | pants | shorts |
hats | beanies | bags | videos | accessories | other
```

### 4. Stock Status
```
in_stock | low_stock | out_of_stock | unknown
```

## User-Facing Features

### MVP
- [x] Search page with product grid (src/app/search/page.tsx)
- [x] Filter sidebar: brand, category, shop, price, on-sale (src/components/SearchFilters.tsx)
- [x] Product cards with badges (src/components/ProductCard.tsx)
- [ ] Product detail page with price history chart
- [ ] Shop comparison table
- [ ] Sort: relevance, price asc/desc, discount, newest

### V2
- [ ] Price history charts per product
- [ ] Stock alerts: email/webhook
- [ ] Saved searches + wishlists
- [ ] User auth (JWT)
- [ ] "Local First" mode with geolocation

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| API | Express.js (api/src/) |
| Database | PostgreSQL |
| Cache | Redis |
| Queue | BullMQ/Redis |
| Scrapers | TypeScript adapters |
| Deployment | Netlify (frontend) |

## Current Status
- [x] Search page deployed on Netlify
- [x] ShopAdapter interface implemented
- [x] Shopify + WooCommerce + GenericHTML adapters
- [ ] Product detail page
- [ ] Real data pipeline
- [ ] User auth + wishlists

## Deployment
- Frontend: Netlify (https://skatestock.vercel.app → migrated)
- Backend API: Railway/Render (planned)
- Database: PostgreSQL on Railway (planned)
