/**
 * SkateStock — Pluggable Shop Adapter System
 * ===========================================
 * Type-safe adapter pattern for scraping multiple shop platforms.
 * Each adapter is responsible for one store platform (Shopify, WooCommerce, etc.)
 * and multiple shop instances (Seasons, Premier, Labor, etc.)
 *
 * Design principles:
 * - Fail silently per-item, not per-batch (one bad product shouldn't crash the scrape)
 * - Respect rate limits per domain
 * - Normalize all products to a common schema
 * - Support robots.txt compliance checks
 */

// =============================================================================
// Core Types
// =============================================================================

export interface NormalizedProduct {
  externalId: string;           // Shop's native product ID
  shopId: string;               // e.g. "seasons", "premier", "labor"
  title: string;
  brand: string;
  category: ProductCategory;
  subcategory?: string;
  originalPrice: number | null;
  salePrice: number | null;
  currency: string;
  discountPercentage: number | null;
  imageUrl: string | null;
  productUrl: string;
  sizes: ProductSize[];
  stockStatus: StockStatus;
  lastUpdated: Date;
  metadata?: Record<string, unknown>;
}

export type ProductCategory =
  | "decks"
  | "trucks"
  | "wheels"
  | "bearings"
  | "shoes"
  | "tshirts"
  | "sweatshirts"
  | "pants"
  | "shorts"
  | "hats"
  | "beanies"
  | "bags"
  | "videos"
  | "accessories"
  | "other";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "unknown";

export interface ProductSize {
  value: string;         // e.g. "8", "M", "10.5"
  system: "us" | "eu" | "uk" | "numeric";
  type: "mens" | "womens" | "youth" | " универсал";
  available: boolean;
  quantity?: number;
}

export interface ScrapeResult {
  shopId: string;
  success: boolean;
  products: NormalizedProduct[];
  errors: ScrapeError[];
  scrapedAt: Date;
  durationMs: number;
}

export interface ScrapeError {
  type: "network" | "parse" | "captcha" | "rate_limit" | "robots" | "unknown";
  message: string;
  retryable: boolean;
  context?: string;
}

export interface ShopConfig {
  id: string;                    // e.g. "seasons", "premier"
  name: string;                  // e.g. "Seasons Skate Shop"
  baseUrl: string;               // e.g. "https://www.seasonsskateshop.com"
  platform: ShopPlatform;
  enabled: boolean;
  rateLimitMs: number;           // Min ms between requests
  userAgent?: string;
  proxy?: ProxyConfig;
  schedule?: CronSchedule;
  options?: Record<string, unknown>;
}

export type ShopPlatform = "shopify" | "woocommerce" | "bigcommerce" | "custom_html" | "square";

export interface ProxyConfig {
  host: string;
  port: number;
  auth?: { username: string; password: string };
}

export type CronSchedule = string; // e.g. "*/30 * * * *" for every 30 min

// =============================================================================
// ShopAdapter Interface
// =============================================================================

/**
 * Abstract base class for all shop adapters.
 * Implement this for each platform type (Shopify, WooCommerce, etc.)
 */
export abstract class ShopAdapter {
  protected config: ShopConfig;

  constructor(config: ShopConfig) {
    this.config = config;
  }

  /** Unique identifier for this adapter type */
  abstract readonly platform: ShopPlatform;

  /** Human-readable name */
  abstract readonly name: string;

  /**
   * Check if the shop is reachable and responding.
   * Used for health checks before scraping.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetch(this.config.baseUrl, {
        headers: this.getHeaders(),
        timeout: 10000,
      });
      return response.status >= 200 && response.status < 400;
    } catch {
      return false;
    }
  }

  /**
   * Fetch all sale/discounted items from the shop.
   * This is the main entry point for the scraping pipeline.
   *
   * @param options - Optional filters (category, brand, etc.)
   */
  abstract fetchSaleItems(options?: FetchOptions): Promise<ScrapeResult>;

  /**
   * Normalize a raw product to the common SkateStock schema.
   * Each adapter knows how to map its platform's data model.
   */
  abstract normalizeProduct(raw: unknown): NormalizedProduct | null;

  /**
   * Check robots.txt for this shop and return allowed paths.
   * Returns null if robots.txt is not accessible (assume allowed).
   */
  protected async checkRobotsTxt(): Promise<string[] | null> {
    const robotsUrl = new URL("/robots.txt", this.config.baseUrl).toString();
    try {
      const response = await this.fetch(robotsUrl, { timeout: 5000 });
      if (response.status !== 200) return null;
      const text = await response.text();
      return this.parseRobotsTxt(text);
    } catch {
      return null; // Can't read robots.txt, proceed anyway
    }
  }

  /**
   * Parse robots.txt and return allowed paths for our user agent.
   * Returns null on any error (assume allowed).
   */
  protected parseRobotsTxt(content: string): string[] | null {
    try {
      const lines = content.split("\n");
      let userAgent: string | null = null;
      const allowed: string[] = [];

      for (const line of lines) {
        const [key, ...valueParts] = line.split(":").map((s) => s.trim());
        const value = valueParts.join(":");

        if (key.toLowerCase() === "user-agent") {
          userAgent = value.toLowerCase();
        } else if (key.toLowerCase() === "allow" && userAgent === "*") {
          allowed.push(value);
        }
      }
      return allowed.length > 0 ? allowed : null;
    } catch {
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Protected helpers — override for custom behavior
  // ---------------------------------------------------------------------------

  protected getHeaders(): Record<string, string> {
    return {
      "User-Agent":
        this.config.userAgent ||
        "SkateStock/1.0 (https://skatestock.app; contact@skatestock.app) Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      DNT: "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
    };
  }

  protected async fetch(
    url: string,
    options: { headers?: Record<string, string>; timeout?: number } = {}
  ): Promise<{ status: number; text: () => Promise<string>; body?: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

    try {
      const response = await fetch(url, {
        headers: { ...this.getHeaders(), ...options.headers },
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return {
        status: response.status,
        text: () => response.text(),
      };
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  protected async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generic error handler — returns a ScrapeError from any thrown value.
   * Override for platform-specific error detection (CAPTCHA, 403, etc.)
   */
  protected handleError(error: unknown, context?: string): ScrapeError {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          type: "network",
          message: `Request timeout${context ? ` (${context})` : ""}`,
          retryable: true,
        };
      }
      return {
        type: "network",
        message: error.message,
        retryable: true,
        context,
      };
    }
    return {
      type: "unknown",
      message: String(error),
      retryable: false,
      context,
    };
  }

  // ---------------------------------------------------------------------------
  // Normalization utilities — shared across adapters
  // ---------------------------------------------------------------------------

  /** Strip HTML tags from text */
  protected stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  }

  /** Parse price string like "$92.00" → 92.00 */
  protected parsePrice(priceStr: string | null): number | null {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  /** Calculate discount percentage */
  protected calcDiscount(original: number, sale: number): number | null {
    if (original <= 0 || sale <= 0 || sale >= original) return null;
    return Math.round(((original - sale) / original) * 100);
  }

  /** Normalize category name to enum */
  protected normalizeCategory(raw: string): ProductCategory {
    const lower = raw.toLowerCase();

    const map: Record<string, ProductCategory> = {
      deck: "decks",
      decks: "decks",
      skateboard: "decks",
      "skateboards": "decks",
      trucks: "trucks",
      truck: "trucks",
      wheels: "wheels",
      wheel: "wheels",
      bearings: "bearings",
      bearing: "bearings",
      shoes: "shoes",
      shoe: "shoes",
      sneakers: "shoes",
      "t-shirt": "tshirts",
      tshirt: "tshirts",
      tshirts: "tshirts",
      "t-shirts": "tshirts",
      tee: "tshirts",
      sweatshirt: "sweatshirts",
      sweatshirts: "sweatshirts",
      hoodie: "sweatshirts",
      hoodies: "sweatshirts",
      pants: "pants",
      pant: "pants",
      shorts: "shorts",
      short: "shorts",
      hat: "hats",
      hats: "hats",
      cap: "hats",
      caps: "hats",
      beanie: "beanies",
      beanies: "beanies",
      bag: "bags",
      bags: "bags",
      backpack: "bags",
      video: "videos",
      videos: "videos",
      dvd: "videos",
      accessories: "accessories",
      accessory: "accessories",
      hardware: "accessories",
    };

    return map[lower] || "other";
  }

  /** Generate a stable external ID from product URL + title */
  protected generateExternalId(title: string, url: string): string {
    const input = `${title}|${url}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// =============================================================================
// Fetch Options
// =============================================================================

export interface FetchOptions {
  /** Only fetch products in these categories */
  categories?: ProductCategory[];
  /** Only fetch products from these brands */
  brands?: string[];
  /** Maximum number of products to fetch (0 = unlimited) */
  limit?: number;
  /** Whether to include out-of-stock items */
  includeOutOfStock?: boolean;
  /** Custom headers for this request */
  headers?: Record<string, string>;
}

// =============================================================================
// Adapter Registry
// =============================================================================

/**
 * Global registry for shop adapters.
 * Use ShopAdapterRegistry.register(adapter) to add new adapters.
 */
export class ShopAdapterRegistry {
  private static adapters = new Map<ShopPlatform, ShopAdapter[]>();

  static register(adapter: ShopAdapter): void {
    const existing = this.adapters.get(adapter.platform) || [];
    existing.push(adapter);
    this.adapters.set(adapter.platform, existing);
  }

  static getAdapters(platform?: ShopPlatform): ShopAdapter[] {
    if (platform) {
      return this.adapters.get(platform) || [];
    }
    return Array.from(this.adapters.values()).flat();
  }

  static getAdapterCount(): number {
    return this.getAdapters().length;
  }
}

// =============================================================================
// Shopify Adapter
// =============================================================================

export interface ShopifyProduct {
  id: number;
  title: string;
  product_type: string;
  vendor: string;
  body_html: string;
  handle: string;
  variants: ShopifyVariant[];
  images: { src: string }[];
  tags: string;
}

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  compare_at_price: string | null;
  inventory_quantity: number;
  inventory_policy: "deny" | "continue";
}

export class ShopifyAdapter extends ShopAdapter {
  readonly platform: ShopPlatform = "shopify";
  readonly name = "Shopify Adapter";

  /**
   * Fetch sale items from a Shopify store.
   * Shopify provides a sale collection endpoint at /collections/sale/products.json
   */
  async fetchSaleItems(options?: FetchOptions): Promise<ScrapeResult> {
    const start = Date.now();
    const products: NormalizedProduct[] = [];
    const errors: ScrapeError[] = [];

    // Respect rate limiting
    await this.sleep(this.config.rateLimitMs);

    try {
      // Try the sale collection first (most reliable)
      const saleUrl = new URL(
        `/collections/sale/products.json?limit=250${options?.limit ? `&page=1` : ""}`,
        this.config.baseUrl
      ).toString();

      const response = await this.fetch(saleUrl, { timeout: 30000 });

      if (response.status === 429) {
        return {
          shopId: this.config.id,
          success: false,
          products: [],
          errors: [{ type: "rate_limit", message: "Shopify rate limited", retryable: true }],
          scrapedAt: new Date(),
          durationMs: Date.now() - start,
        };
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      const text = await response.text();
      const data = JSON.parse(text) as { products: ShopifyProduct[] };
      const shopifyProducts = data.products || [];

      for (const raw of shopifyProducts) {
        try {
          const normalized = this.normalizeProduct(raw);
          if (normalized && this.matchesFilters(normalized, options)) {
            products.push(normalized);
          }
        } catch (err) {
          // Don't crash the whole batch for one bad product
          errors.push(this.handleError(err, `product ${(raw as ShopifyProduct).id}`));
        }
      }

      // If no sale collection, try scraping /products.json directly
      if (products.length === 0) {
        return this.fetchAllProducts(start, errors, options);
      }

      return {
        shopId: this.config.id,
        success: true,
        products,
        errors,
        scrapedAt: new Date(),
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        shopId: this.config.id,
        success: false,
        products,
        errors: [...errors, this.handleError(err, "fetchSaleItems")],
        scrapedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Fetch all products and filter for discounted ones.
   * Fallback when no sale collection exists.
   */
  private async fetchAllProducts(
    start: number,
    existingErrors: ScrapeError[],
    options?: FetchOptions
  ): Promise<ScrapeResult> {
    const products: NormalizedProduct[] = [];
    const errors = [...existingErrors];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      await this.sleep(this.config.rateLimitMs);

      try {
        const url = new URL(
          `/products.json?limit=250&page=${page}`,
          this.config.baseUrl
        ).toString();

        const response = await this.fetch(url, { timeout: 30000 });
        const text = await response.text();
        const data = JSON.parse(text) as { products: ShopifyProduct[] };
        const shopifyProducts = data.products || [];

        if (shopifyProducts.length === 0) {
          hasMore = false;
          break;
        }

        for (const raw of shopifyProducts) {
          try {
            const normalized = this.normalizeProduct(raw);
            if (
              normalized &&
              normalized.discountPercentage !== null &&
              normalized.discountPercentage > 0 &&
              this.matchesFilters(normalized, options)
            ) {
              products.push(normalized);
            }
          } catch (err) {
            errors.push(this.handleError(err, `product page ${page}`));
          }
        }

        page++;
        if (options?.limit && products.length >= options.limit) {
          hasMore = false;
        }
      } catch (err) {
        errors.push(this.handleError(err, `page ${page}`));
        hasMore = false;
      }
    }

    return {
      shopId: this.config.id,
      success: errors.length === 0,
      products: options?.limit ? products.slice(0, options.limit) : products,
      errors,
      scrapedAt: new Date(),
      durationMs: Date.now() - start,
    };
  }

  normalizeProduct(raw: unknown): NormalizedProduct | null {
    if (!raw || typeof raw !== "object") return null;

    const p = raw as ShopifyProduct;
    if (!p.id || !p.title) return null;

    // Find the variant with the lowest sale price
    const variant = p.variants.reduce<ShopifyVariant | null>((lowest, v) => {
      if (!lowest || parseFloat(v.price) < parseFloat(lowest.price)) return v;
      return lowest;
    }, null);

    if (!variant) return null;

    const originalPrice = this.parsePrice(variant.compare_at_price || null);
    const salePrice = this.parsePrice(variant.price);
    const discountPercentage =
      originalPrice && salePrice ? this.calcDiscount(originalPrice, salePrice) : null;

    // Filter out non-discounted items unless specifically requested
    if (!discountPercentage && variant.compare_at_price === null) {
      // No discount data — include anyway for inventory tracking
    }

    // Parse sizes from variant titles
    const sizes: ProductSize[] = p.variants.map((v) => ({
      value: v.title === "Default Title" ? "one_size" : v.title,
      system: "us", // Shopify typically uses US sizing
      type: "mens",
      available: v.inventory_quantity > 0 || v.inventory_policy === "continue",
      quantity: v.inventory_quantity,
    }));

    return {
      externalId: String(p.id),
      shopId: this.config.id,
      title: this.stripHtml(p.title),
      brand: p.vendor || "Unknown",
      category: this.normalizeCategory(p.product_type || "other"),
      originalPrice,
      salePrice,
      currency: "USD",
      discountPercentage,
      imageUrl: p.images[0]?.src || null,
      productUrl: `${this.config.baseUrl}/products/${p.handle}`,
      sizes: [...new Map(sizes.map((s) => [s.value, s])).values()], // Dedupe by value
      stockStatus:
        variant.inventory_quantity <= 0
          ? "out_of_stock"
          : variant.inventory_quantity < 5
          ? "low_stock"
          : "in_stock",
      lastUpdated: new Date(),
      metadata: {
        platform: "shopify",
        handle: p.handle,
        tags: p.tags,
        productType: p.product_type,
      },
    };
  }

  private matchesFilters(product: NormalizedProduct, options?: FetchOptions): boolean {
    if (!options) return true;

    if (options.categories?.length && !options.categories.includes(product.category)) {
      return false;
    }

    if (options.brands?.length && !options.brands.some((b) => product.brand.toLowerCase().includes(b.toLowerCase()))) {
      return false;
    }

    if (!options.includeOutOfStock && product.stockStatus === "out_of_stock") {
      return false;
    }

    return true;
  }
}

// =============================================================================
// WooCommerce Adapter
// =============================================================================

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  type: string;
  regular_price: string;
  sale_price: string;
  price: string;
  status: string;
  categories: { id: number; name: string; slug: string }[];
  images: { src: string }[];
  variations: { id: number; attributes: { name: string; value: string }[] }[];
  in_stock: boolean;
  stock_quantity: number;
}

export class WooCommerceAdapter extends ShopAdapter {
  readonly platform: ShopPlatform = "woocommerce";
  readonly name = "WooCommerce Adapter";

  async fetchSaleItems(options?: FetchOptions): Promise<ScrapeResult> {
    const start = Date.now();
    const products: NormalizedProduct[] = [];
    const errors: ScrapeError[] = [];

    await this.sleep(this.config.rateLimitMs);

    try {
      // WooCommerce REST API: fetch on-sale products
      const url = new URL("/wp-json/wc/v3/products", this.config.baseUrl);
      url.searchParams.set("status", "publish");
      url.searchParams.set("on_sale", "true");
      url.searchParams.set("per_page", "100");

      const response = await this.fetch(url.toString(), { timeout: 30000 });

      if (response.status === 429) {
        return {
          shopId: this.config.id,
          success: false,
          products: [],
          errors: [{ type: "rate_limit", message: "WooCommerce rate limited", retryable: true }],
          scrapedAt: new Date(),
          durationMs: Date.now() - start,
        };
      }

      if (response.status !== 200) {
        throw new Error(`Unexpected status ${response.status}`);
      }

      const text = await response.text();
      const data = JSON.parse(text) as WooCommerceProduct[];

      for (const raw of data) {
        try {
          const normalized = this.normalizeProduct(raw);
          if (normalized && this.matchesFilters(normalized, options)) {
            products.push(normalized);
          }
        } catch (err) {
          errors.push(this.handleError(err, `product ${raw.id}`));
        }
      }

      return {
        shopId: this.config.id,
        success: true,
        products,
        errors,
        scrapedAt: new Date(),
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        shopId: this.config.id,
        success: false,
        products,
        errors: [...errors, this.handleError(err, "fetchSaleItems")],
        scrapedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }
  }

  normalizeProduct(raw: unknown): NormalizedProduct | null {
    if (!raw || typeof raw !== "object") return null;

    const p = raw as WooCommerceProduct;
    if (!p.id || !p.name) return null;

    const originalPrice = this.parsePrice(p.regular_price);
    const salePrice = this.parsePrice(p.sale_price || p.price);
    const discountPercentage =
      originalPrice && salePrice ? this.calcDiscount(originalPrice, salePrice) : null;

    const categoryName = p.categories?.[0]?.name || "other";

    const sizes: ProductSize[] = p.variations?.map((v) => ({
      value: v.attributes.find((a) => a.name.toLowerCase().includes("size"))?.value || "one_size",
      system: "us",
      type: "mens",
      available: p.in_stock,
      quantity: p.stock_quantity || undefined,
    })) || [];

    return {
      externalId: String(p.id),
      shopId: this.config.id,
      title: this.stripHtml(p.name),
      brand: "Unknown", // WooCommerce doesn't have a vendor field by default
      category: this.normalizeCategory(categoryName),
      originalPrice,
      salePrice,
      currency: "USD",
      discountPercentage,
      imageUrl: p.images?.[0]?.src || null,
      productUrl: `${this.config.baseUrl}/product/${p.slug}`,
      sizes,
      stockStatus: !p.in_stock
        ? "out_of_stock"
        : (p.stock_quantity || 0) < 5
        ? "low_stock"
        : "in_stock",
      lastUpdated: new Date(),
      metadata: {
        platform: "woocommerce",
        slug: p.slug,
        categories: p.categories?.map((c) => c.name),
      },
    };
  }

  private matchesFilters(product: NormalizedProduct, options?: FetchOptions): boolean {
    if (!options) return true;
    if (options.categories?.length && !options.categories.includes(product.category)) return false;
    if (options.brands?.length && !options.brands.some((b) => product.brand.toLowerCase().includes(b.toLowerCase()))) return false;
    if (!options.includeOutOfStock && product.stockStatus === "out_of_stock") return false;
    return true;
  }
}

// =============================================================================
// Generic HTML Adapter (fallback for custom sites)
// =============================================================================

export class GenericHtmlAdapter extends ShopAdapter {
  readonly platform: ShopPlatform = "custom_html";
  readonly name = "Generic HTML Adapter";

  constructor(
    config: ShopConfig,
    private selectors: {
      productContainer: string;
      title: string;
      brand?: string;
      price: string;
      originalPrice?: string;
      salePrice?: string;
      image: string;
      link: string;
      inStock?: string;
    }
  ) {
    super(config);
  }

  async fetchSaleItems(options?: FetchOptions): Promise<ScrapeResult> {
    const start = Date.now();
    const products: NormalizedProduct[] = [];
    const errors: ScrapeError[] = [];

    await this.sleep(this.config.rateLimitMs);

    try {
      // Try to find a sale/discount page
      const salePaths = ["/sale", "/discounts", "/clearance", "/-onsale"];
      let html = "";
      let usedSalePath = false;

      for (const path of salePaths) {
        await this.sleep(this.config.rateLimitMs);
        const url = this.config.baseUrl + path;
        try {
          const response = await this.fetch(url, { timeout: 15000 });
          if (response.status === 200) {
            html = await response.text();
            usedSalePath = true;
            break;
          }
        } catch {
          // Try next path
        }
      }

      // Fallback to homepage
      if (!html) {
        const response = await this.fetch(this.config.baseUrl, { timeout: 15000 });
        html = await response.text();
      }

      // Parse with simple regex-based HTML parsing
      // For production, use cheerio or jsdom
      const productMatches = this.extractProducts(html);

      for (const raw of productMatches) {
        try {
          const normalized = this.normalizeProduct(raw);
          if (normalized && this.matchesFilters(normalized, options)) {
            products.push(normalized);
          }
        } catch (err) {
          errors.push(this.handleError(err, "generic product"));
        }
      }

      return {
        shopId: this.config.id,
        success: true,
        products,
        errors,
        scrapedAt: new Date(),
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        shopId: this.config.id,
        success: false,
        products,
        errors: [this.handleError(err, "fetchSaleItems")],
        scrapedAt: new Date(),
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Simple regex-based product extraction from HTML.
   * For production use cheerio: `cheerio.load(html)(this.selectors.productContainer)`
   */
  private extractProducts(html: string): Record<string, string>[] {
    const results: Record<string, string>[] = [];
    const containerMatch = html.match(
      new RegExp(`<[^>]*${this.selectors.productContainer}[^>]*>([\\s\\S]*?)</[^>]+>`, "gi")
    );

    if (!containerMatch) return results;

    for (const container of containerMatch) {
      const product: Record<string, string> = {};

      const extract = (selector: string): string | null => {
        const match = container.match(
          new RegExp(`<[^>]*(?:id|class|href|src)[^>]*${selector}[^>]*>([^<]*)</[^>]+>`, "i")
        );
        return match ? match[1].trim() : null;
      };

      product.title = extract(this.selectors.title) || "";
      product.price =
        extract(this.selectors.salePrice) || extract(this.selectors.price) || "";
      product.originalPrice = extract(this.selectors.originalPrice || "") || "";
      product.image = extract(this.selectors.image) || "";
      product.link = extract(this.selectors.link) || "";

      if (product.title && product.price) {
        results.push(product);
      }
    }

    return results;
  }

  normalizeProduct(raw: unknown): NormalizedProduct | null {
    if (!raw || typeof raw !== "object") return null;

    const p = raw as Record<string, string>;
    if (!p.title || !p.price) return null;

    const originalPrice = this.parsePrice(p.originalPrice);
    const salePrice = this.parsePrice(p.price);
    const discountPercentage =
      originalPrice && salePrice ? this.calcDiscount(originalPrice, salePrice) : null;

    return {
      externalId: this.generateExternalId(p.title, p.link),
      shopId: this.config.id,
      title: this.stripHtml(p.title),
      brand: this.stripHtml(p.brand || "Unknown"),
      category: "other",
      originalPrice,
      salePrice,
      currency: "USD",
      discountPercentage,
      imageUrl: p.image?.startsWith("http") ? p.image : this.config.baseUrl + p.image,
      productUrl: p.link?.startsWith("http") ? p.link : this.config.baseUrl + p.link,
      sizes: [],
      stockStatus: "unknown",
      lastUpdated: new Date(),
      metadata: { platform: "custom_html" },
    };
  }

  private matchesFilters(product: NormalizedProduct, options?: FetchOptions): boolean {
    if (!options) return true;
    if (options.categories?.length && !options.categories.includes(product.category)) return false;
    if (options.brands?.length && !options.brands.some((b) => product.brand.toLowerCase().includes(b.toLowerCase()))) return false;
    if (!options.includeOutOfStock && product.stockStatus === "out_of_stock") return false;
    return true;
  }
}
