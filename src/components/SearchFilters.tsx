"use client";

import { useState } from "react";

interface SearchFilters {
  brands: string[];
  categories: string[];
  shops: string[];
  sizes: string[];
  minPrice: string;
  maxPrice: string;
  onSaleOnly: boolean;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  brands: string[];
  categories: string[];
  shops: string[];
  sizes?: string[];
}

const DECK_SIZES = ["7.5\"", "7.625\"", "7.75\"", "7.875\"", "8.0\"", "8.125\"", "8.25\"", "8.375\"", "8.5\"", "8.75\"", "9.0\""];
const SHOE_SIZES_M = ["6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12", "13"];
const SHOE_SIZES_W = ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12"];

export default function SearchFilters({
  filters,
  onFilterChange,
  brands,
  categories,
  shops,
  sizes = DECK_SIZES,
}: SearchFiltersProps) {
  const [isExpanded, setIsExpanded] = useState({
    brands: true,
    categories: true,
    shops: true,
    price: true,
    sizes: false,
  });

  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const current = filters[key] as string[];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({ ...filters, [key]: updated });
  };

  const toggleSection = (section: keyof typeof isExpanded) => {
    setIsExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const clearFilters = () => {
    onFilterChange({
      brands: [],
      categories: [],
      shops: [],
      sizes: [],
      minPrice: "",
      maxPrice: "",
      onSaleOnly: false,
    });
  };

  return (
    <aside className="w-64 flex-shrink-0 space-y-4">
      {/* On Sale Toggle */}
      <div className="rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={filters.onSaleOnly}
            onChange={(e) =>
              onFilterChange({ ...filters, onSaleOnly: e.target.checked })
            }
            className="h-5 w-5 rounded border-white/20 bg-transparent accent-[rgb(var(--accent-rgb))]"
          />
          <span className="text-sm font-medium text-white">On Sale Only</span>
        </label>
      </div>

      {/* Price Range */}
      <div className="rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] p-4">
        <button
          onClick={() => toggleSection("price")}
          className="mb-3 flex w-full items-center justify-between text-sm font-semibold text-white"
        >
          <span>Price Range</span>
          <svg
            className={`h-4 w-4 transition-transform ${isExpanded.price ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded.price && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[rgb(var(--muted-rgb))]">$</span>
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => onFilterChange({ ...filters, minPrice: e.target.value })}
                className="w-full rounded border border-white/10 bg-[rgb(var(--background-rgb))] py-2 pl-7 pr-2 text-sm text-white placeholder-[rgb(var(--muted-rgb))]"
              />
            </div>
            <span className="text-[rgb(var(--muted-rgb))]">–</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[rgb(var(--muted-rgb))]">$</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => onFilterChange({ ...filters, maxPrice: e.target.value })}
                className="w-full rounded border border-white/10 bg-[rgb(var(--background-rgb))] py-2 pl-7 pr-2 text-sm text-white placeholder-[rgb(var(--muted-rgb))]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Size Filter */}
      <div className="rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] p-4">
        <button
          onClick={() => toggleSection("sizes")}
          className="mb-3 flex w-full items-center justify-between text-sm font-semibold text-white"
        >
          <span>
            Size {filters.sizes.length > 0 && `(${filters.sizes.length})`}
          </span>
          <svg
            className={`h-4 w-4 transition-transform ${isExpanded.sizes ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded.sizes && (
          <div>
            {/* Deck Sizes */}
            <p className="mb-2 text-xs font-medium text-[rgb(var(--muted-rgb))]">Deck Width (inches)</p>
            <div className="mb-3 flex flex-wrap gap-1">
              {DECK_SIZES.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleArrayFilter("sizes", size)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    filters.sizes.includes(size)
                      ? "bg-[rgb(var(--accent-rgb))] text-white"
                      : "border border-white/10 text-white/70 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Shoe Sizes - Men */}
            <p className="mb-2 text-xs font-medium text-[rgb(var(--muted-rgb))]">Men&apos;s Shoe</p>
            <div className="mb-3 flex flex-wrap gap-1">
              {SHOE_SIZES_M.map((size) => (
                <button
                  key={`M${size}`}
                  onClick={() => toggleArrayFilter("sizes", `M${size}`)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    filters.sizes.includes(`M${size}`)
                      ? "bg-[rgb(var(--accent-rgb))] text-white"
                      : "border border-white/10 text-white/70 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            {/* Shoe Sizes - Women */}
            <p className="mb-2 text-xs font-medium text-[rgb(var(--muted-rgb))]">Women&apos;s Shoe</p>
            <div className="mb-3 flex flex-wrap gap-1">
              {SHOE_SIZES_W.map((size) => (
                <button
                  key={`W${size}`}
                  onClick={() => toggleArrayFilter("sizes", `W${size}`)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    filters.sizes.includes(`W${size}`)
                      ? "bg-[rgb(var(--accent-rgb))] text-white"
                      : "border border-white/10 text-white/70 hover:border-white/30 hover:text-white"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Shops */}
      <div className="rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] p-4">
        <button
          onClick={() => toggleSection("shops")}
          className="mb-3 flex w-full items-center justify-between text-sm font-semibold text-white"
        >
          <span>Shops ({shops.length})</span>
          <svg
            className={`h-4 w-4 transition-transform ${isExpanded.shops ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded.shops && (
          <div className="space-y-2">
            {shops.map((shop) => (
              <label key={shop} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.shops.includes(shop)}
                  onChange={() => toggleArrayFilter("shops", shop)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-[rgb(var(--accent-rgb))]"
                />
                <span className="text-sm text-white/80">{shop}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] p-4">
        <button
          onClick={() => toggleSection("categories")}
          className="mb-3 flex w-full items-center justify-between text-sm font-semibold text-white"
        >
          <span>Categories ({categories.length})</span>
          <svg
            className={`h-4 w-4 transition-transform ${isExpanded.categories ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded.categories && (
          <div className="space-y-2">
            {categories.map((cat) => (
              <label key={cat} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.categories.includes(cat)}
                  onChange={() => toggleArrayFilter("categories", cat)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-[rgb(var(--accent-rgb))]"
                />
                <span className="text-sm text-white/80">{cat}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Brands */}
      <div className="rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] p-4">
        <button
          onClick={() => toggleSection("brands")}
          className="mb-3 flex w-full items-center justify-between text-sm font-semibold text-white"
        >
          <span>Brands ({brands.length})</span>
          <svg
            className={`h-4 w-4 transition-transform ${isExpanded.brands ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
 stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded.brands && (
          <div className="space-y-2">
            {brands.map((brand) => (
              <label key={brand} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={() => toggleArrayFilter("brands", brand)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-[rgb(var(--accent-rgb))]"
                />
                <span className="text-sm text-white/80">{brand}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Clear Filters */}
      <button
        onClick={clearFilters}
        className="w-full rounded-lg border border-white/10 bg-transparent py-2 text-sm text-[rgb(var(--muted-rgb))] transition-colors hover:border-white/20 hover:text-white"
      >
        Clear All Filters
      </button>
    </aside>
  );
}
