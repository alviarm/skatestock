"use client";

import { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import SearchFilters from "@/components/SearchFilters";
import {
  Product,
  SearchFilters as Filters,
  MOCK_PRODUCTS,
  filterProducts,
  BRANDS,
  CATEGORIES,
  SHOPS,
} from "@/lib/mockData";

const PRODUCTS_PER_PAGE = 24;

const defaultFilters: Filters = {
  query: "",
  brands: [],
  categories: [],
  shops: [],
  minPrice: "",
  maxPrice: "",
  onSaleOnly: false,
  sort: "relevance",
  page: 1,
};

export default function SearchPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isLoading, setIsLoading] = useState(false);

  // In production, this would fetch from API
  const products = MOCK_PRODUCTS;

  const filteredProducts = useMemo(
    () => filterProducts(products, filters),
    [products, filters]
  );

  const totalProducts = filteredProducts.length;
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (filters.page - 1) * PRODUCTS_PER_PAGE,
    filters.page * PRODUCTS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, [filters.brands, filters.categories, filters.shops, filters.minPrice, filters.maxPrice, filters.onSaleOnly, filters.query]);

  return (
    <div className="min-h-screen bg-[rgb(var(--background-rgb))]">
      <Header />

      {/* Hero Section */}
      <section className="border-b border-white/10 bg-gradient-to-b from-[rgb(var(--accent-rgb))]/10 to-transparent py-12">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
            Find the best deals across 5 skate shops
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-[rgb(var(--muted-rgb))]">
            Real-time price tracking, historical trends, and flash sale detection across Seasons, Premier, Labor, NJ, and Black Sheep.
          </p>

          {/* Search Bar */}
          <div className="mx-auto max-w-3xl">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-[rgb(var(--muted-rgb))]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search for decks, shoes, trucks, brands..."
                value={filters.query}
                onChange={(e) =>
                  setFilters({ ...filters, query: e.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-[rgb(var(--surface-rgb))] py-4 pl-14 pr-4 text-lg text-white placeholder-[rgb(var(--muted-rgb))] shadow-lg focus:border-[rgb(var(--accent-rgb))] focus:outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <div className="hidden lg:block">
            <SearchFilters
              filters={filters}
              onFilterChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
              brands={BRANDS}
              categories={CATEGORIES}
              shops={SHOPS}
            />
          </div>

          {/* Results */}
          <div className="min-w-0 flex-1">
            {/* Results Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-[rgb(var(--muted-rgb))]">
                  Showing{" "}
                  <span className="font-medium text-white">
                    {paginatedProducts.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-white">
                    {totalProducts}
                  </span>{" "}
                  products
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => {
                    // Would open filter modal
                  }}
                  className="lg:hidden"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3 13.586V4z"
                    />
                  </svg>
                </button>

                {/* Sort Dropdown */}
                <select
                  value={filters.sort}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      sort: e.target.value as Filters["sort"],
                    })
                  }
                  className="rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] px-3 py-2 text-sm text-white"
                >
                  <option value="relevance">Relevance</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="discount">Most Discounted</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>

            {/* Active Filters Pills */}
            {(filters.brands.length > 0 ||
              filters.categories.length > 0 ||
              filters.shops.length > 0 ||
              filters.onSaleOnly) && (
              <div className="mb-4 flex flex-wrap gap-2">
                {filters.onSaleOnly && (
                  <span className="flex items-center gap-1 rounded-full border border-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb))]/10 px-3 py-1 text-xs font-medium text-[rgb(var(--accent-rgb))]">
                    On Sale
                    <button
                      onClick={() =>
                        setFilters({ ...filters, onSaleOnly: false })
                      }
                      className="ml-1"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.brands.map((brand) => (
                  <span
                    key={brand}
                    className="flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/80"
                  >
                    {brand}
                    <button
                      onClick={() =>
                        setFilters({
                          ...filters,
                          brands: filters.brands.filter((b) => b !== brand),
                        })
                      }
                      className="ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Product Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] p-4"
                  >
                    <div className="aspect-square rounded bg-white/5" />
                    <div className="mt-4 h-4 w-3/4 rounded bg-white/5" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-white/5" />
                  </div>
                ))}
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] py-16 text-center">
                <svg
                  className="mx-auto mb-4 h-16 w-16 text-[rgb(var(--muted-rgb))]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  No products found
                </h3>
                <p className="text-sm text-[rgb(var(--muted-rgb))]">
                  Try adjusting your filters or search terms
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page - 1 })
                  }
                  disabled={filters.page === 1}
                  className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setFilters({ ...filters, page })}
                      className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                        filters.page === page
                          ? "border-[rgb(var(--accent-rgb))] bg-[rgb(var(--accent-rgb))] text-white"
                          : "border-white/10 bg-transparent text-white/80 hover:bg-white/5"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() =>
                    setFilters({ ...filters, page: filters.page + 1 })
                  }
                  disabled={filters.page === totalPages}
                  className="rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-[rgb(var(--muted-rgb))]">
          <p>© 2026 SkateStock. Price data from independent skate shops.</p>
        </div>
      </footer>
    </div>
  );
}
