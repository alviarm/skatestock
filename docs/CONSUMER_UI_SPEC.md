# SkateStock Consumer UI — Feature Specification

## Overview

Build a consumer-facing search and alert platform at skatestock.vercel.app that lets skaters search real-time inventory across 5 shops, track prices, and get notified of drops.

**Goal:** Beat Shop Lurker by adding price history, trend signals, and user accounts on top of real-time inventory.

---

## Comparison: Shop Lurker vs SkateStock Consumer

| Feature | Shop Lurker | SkateStock Consumer |
|---------|-----------|-------------------|
| Multi-shop inventory search | ✅ | ✅ |
| Brand filter | ✅ | ✅ |
| Category filter | ✅ | ✅ |
| Size filter (numeric) | ✅ | Planned |
| Shoe size filter (M/W) | ✅ | Planned |
| Real-time inventory | ✅ | ✅ |
| **Price history chart** | ❌ | ✅ |
| **Price trend indicator** | ❌ | ✅ |
| **Flash sale detection** | ❌ | ✅ |
| **User wishlists** | ❌ | Planned |
| **Price drop alerts** | ❌ | Planned |
| **Shop comparison view** | ❌ | ✅ |
| **Availability forecast** | ❌ | ✅ |

---

## Pages

### 1. Search Page (`/`)

**Header:**
- SkateStock logo + "Price intelligence for skaters"
- User menu (sign in / account)

**Search Bar:**
- Full-text search (product name, brand)
- Real-time suggestions as you type (debounced 300ms)

**Filters Sidebar:**
```
Brand (checkbox list)
  [ ] Nike SB
  [ ] Vans
  [ ] Adidas
  [ ] Converse
  [ ] New Balance
  ...

Category (checkbox list)
  [ ] Decks
  [ ] Shoes
  [ ] T-Shirts
  [ ] Trucks
  [ ] Wheels
  ...

Size (numeric — deck width in inches)
  [ ] 7.75"
  [ ] 8.0"
  [ ] 8.25"
  [ ] 8.5"
  ...

Shoe Size (M/W)
  [ ] M 8 / W 9.5
  [ ] M 9 / W 10.5
  ...

Shop (checkbox list)
  [ ] Seasons
  [ ] Premier
  [ ] Labor
  [ ] NJ
  [ ] Black Sheep

Price Range
  [$___] - [$___]

Discount
  [ ] On sale only
  [ ] 20%+ off
  [ ] 30%+ off
```

**Results Grid:**
- Product card: image, name, brand, price, original price (strikethrough if discounted), discount %, shop name
- "New" badge for products added < 7 days
- "Sale" badge for discounted items
- "Low stock" indicator when inventory < 5
- Heart icon to add to wishlist

**Sort Options:**
- Relevance (default)
- Price: Low to High
- Price: High to Low
- Discount: Most
- Newest

**Pagination:** 24 products per page, numbered pages

---

### 2. Product Detail Page (`/product/:id`)

**Hero:**
- Product image (large)
- Product name, brand, category
- "In stock at X shops" indicator

**Price Block:**
- Current price (large)
- Original price (strikethrough if discounted)
- Discount percentage
- **Price history chart (30-day line graph)**
- Trend indicator: 📈 Rising / 📉 Falling / ➡️ Stable
- Last updated timestamp

**Shop Comparison Table:**
| Shop | Price | Discount | Stock | Link |
|------|-------|---------|-------|------|
| Seasons | $89.99 | 20% | In stock | [Buy] |
| Premier | $94.99 | 15% | In stock | [Buy] |
| Labor | SOLD OUT | — | — | — |

**Size Availability:**
- Grid of sizes with stock status per shop

**Actions:**
- ❤️ Add to wishlist
- 🔔 Enable price drop alert
- 📊 View full analytics

**Related Products:**
- "Similar items you might like" (same brand/category, different shop)

---

### 3. Wishlist Page (`/wishlist`)

*Requires sign in*

- List of saved products with current price
- Price change indicators (▲ $5 increase, ▼ $10 decrease since added)
- "Remove" button
- "Enable alerts" toggle per item
- "Enable alerts" toggle for entire wishlist

---

### 4. Alerts Page (`/alerts`)

*Requires sign in*

- List of active price alerts
- Alert status: Active / Triggered / Paused
- Triggered alerts show: "Price dropped from $89.99 to $74.99 at Seasons!"
- "View product" link
- "Delete alert" button

---

### 5. Auth Pages

**Sign In (`/auth/signin`):**
- Email + password
- "Remember me"
- "Forgot password"
- "Don't have an account? Sign up"

**Sign Up (`/auth/signup`):**
- Email + password + confirm password
- "Already have an account? Sign in"

---

## Data Requirements

### New Database Tables

```sql
-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Wishlists
CREATE TABLE wishlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Price alerts
CREATE TABLE price_alerts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  target_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alert history
CREATE TABLE alert_history (
  id SERIAL PRIMARY KEY,
  alert_id INTEGER REFERENCES price_alerts(id),
  triggered_price DECIMAL(10,2),
  message TEXT,
  sent_at TIMESTAMP DEFAULT NOW()
);
```

### New API Endpoints

```
POST   /api/auth/signup
POST   /api/auth/signin
POST   /api/auth/signout
GET    /api/auth/me

GET    /api/wishlists
POST   /api/wishlists          { product_id }
DELETE /api/wishlists/:id

GET    /api/alerts
POST   /api/alerts             { product_id, target_price }
PATCH  /api/alerts/:id        { is_active }
DELETE /api/alerts/:id

GET    /api/products/:id/price-history?days=30
GET    /api/products/search?q=&brands=&categories=&sizes=&shops=&min_price=&max_price=&on_sale=&sort=&page=
```

---

## Implementation Tasks

### Task 1: Consumer UI Scaffold

**Files:**
- `src/app/page.tsx` — Search page
- `src/app/product/[id]/page.tsx` — Product detail
- `src/app/wishlist/page.tsx` — Wishlist
- `src/app/alerts/page.tsx` — Alerts
- `src/app/auth/signin/page.tsx` — Sign in
- `src/app/auth/signup/page.tsx` — Sign up
- `src/components/SearchFilters.tsx`
- `src/components/ProductCard.tsx`
- `src/components/ProductGrid.tsx`
- `src/components/PriceHistoryChart.tsx`
- `src/components/ShopComparisonTable.tsx`
- `src/components/Header.tsx`
- `src/components/AuthProvider.tsx`

**Time:** 6-8 hours

### Task 2: Search API Enhancement

**Files:**
- `api/src/routes/products.js` — Add full-text search, filtering, pagination
- PostgreSQL full-text search with `tsvector`

**Time:** 2-3 hours

### Task 3: Price History Endpoint

**Files:**
- `api/src/routes/products.js` — Add `GET /products/:id/price-history`

**Time:** 1-2 hours

### Task 4: User Auth System

**Files:**
- `api/src/routes/auth.js`
- `api/src/middleware/auth.js`
- Database migrations for users table
- Auth integration with frontend

**Time:** 3-4 hours

### Task 5: Wishlist Feature

**Files:**
- `api/src/routes/wishlists.js`
- Frontend wishlist page and heart button
- `useWishlist` hook

**Time:** 2-3 hours

### Task 6: Price Alert Feature

**Files:**
- `api/src/routes/alerts.js`
- Frontend alerts page
- Cron job to check prices against alert targets
- Email notification integration (optional)

**Time:** 3-4 hours

### Task 7: Price History Chart Component

**Files:**
- `src/components/PriceHistoryChart.tsx`
- Uses Chart.js or Recharts
- Data from `/api/products/:id/price-history`

**Time:** 1-2 hours

---

## Total Estimated Time: 18-26 hours

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Backend | Express.js API |
| Database | PostgreSQL (existing) |
| Cache | Redis (existing) |
| Auth | JWT + bcrypt |
| Hosting | Vercel (frontend) + Railway/Render (API) |

---

## Out of Scope (Future)

- Social features (shared wishlists, following)
- Payment processing (direct checkout)
- Order tracking
- Mobile app
