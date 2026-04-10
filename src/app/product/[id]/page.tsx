"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import scrapedProducts from "@/lib/scrapedProducts.json";

interface Product {
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

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [product, setProduct] = useState<Product | null>(null);
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => {
    setAllProducts(scrapedProducts as Product[]);
    const found = (scrapedProducts as Product[]).find((p) => p.id === id);
    setProduct(found || null);
  }, [id]);

  if (!product) {
    return (
      <div className="min-h-screen bg-[rgb(var(--background-rgb))]">
        <Header />
        <div className="mx-auto max-w-7xl px-4 py-20 text-center">
          <h1 className="mb-4 text-3xl font-bold text-white">Product not found</h1>
          <p className="mb-8 text-[rgb(var(--muted-rgb))]">
            This product may have sold out or been removed.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--accent-rgb))] px-6 py-3 font-semibold text-white transition-colors hover:bg-[rgb(var(--accent-rgb))]/80"
          >
            ← Back to Search
          </Link>
        </div>
      </div>
    );
  }

  // Find same products across other shops
  const similarProducts = allProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.title.toLowerCase().includes(product.brand.toLowerCase()) ||
          p.category === product.category) &&
        p.isOnSale
    )
    .slice(0, 4);

  const hasDiscount = product.discount > 0;

  return (
    <div className="min-h-screen bg-[rgb(var(--background-rgb))]">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-[rgb(var(--muted-rgb))]">
          <Link href="/search" className="hover:text-white">
            Search
          </Link>
          <span>›</span>
          <span className="capitalize">{product.category}</span>
          <span>›</span>
          <span className="text-white">{product.title.substring(0, 40)}...</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-[rgb(var(--surface-rgb))]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="h-full w-full object-contain p-8"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <svg
                  className="h-24 w-24 text-[rgb(var(--muted-rgb))]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}

            {/* Badges */}
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {product.isNew && (
                <span className="rounded bg-[rgb(var(--accent-rgb))] px-3 py-1 text-sm font-semibold text-white">
                  NEW
                </span>
              )}
              {hasDiscount && (
                <span className="rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white">
                  -{product.discount}%
                </span>
              )}
              {product.stockStatus === "low_stock" && (
                <span className="rounded bg-yellow-500 px-3 py-1 text-sm font-semibold text-black">
                  LOW STOCK
                </span>
              )}
              {product.stockStatus === "out_of_stock" && (
                <span className="rounded bg-red-700 px-3 py-1 text-sm font-semibold text-white">
                  OUT OF STOCK
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col">
            {/* Brand + Category */}
            <p className="mb-2 text-sm font-medium uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
              {product.brand} · {product.category}
            </p>

            {/* Title */}
            <h1 className="mb-6 text-3xl font-bold text-white">{product.title}</h1>

            {/* Shop */}
            <div className="mb-6 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-[rgb(var(--muted-rgb))]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span className="text-[rgb(var(--muted-rgb))]">Sold by</span>
              <span className="font-medium text-white">{product.shop}</span>
            </div>

            {/* Price */}
            <div className="mb-8 rounded-xl border border-white/10 bg-[rgb(var(--surface-rgb))] p-6">
              {hasDiscount ? (
                <div className="flex items-baseline gap-4">
                  <span className="text-4xl font-bold text-white">
                    ${product.salePrice.toFixed(2)}
                  </span>
                  <span className="text-xl text-[rgb(var(--muted-rgb))] line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                  <span className="rounded bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-400">
                    Save ${(product.originalPrice - product.salePrice).toFixed(2)}
                  </span>
                </div>
              ) : (
                <span className="text-4xl font-bold text-white">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
              <p className="mt-2 text-sm text-[rgb(var(--muted-rgb))]">
                Price updated {new Date(product.lastUpdated).toLocaleDateString()}
              </p>
            </div>

            {/* CTA */}
            <a
              href={product.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--accent-rgb))] py-4 text-lg font-semibold text-white transition-colors hover:bg-[rgb(var(--accent-rgb))]/80"
            >
              Buy at {product.shop.split(" ")[0]}
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
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>

            <p className="text-center text-sm text-[rgb(var(--muted-rgb))]">
              You&apos;ll be redirected to {product.shop} to complete your purchase
            </p>

            {/* Stock Status */}
            <div className="mt-6 flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  product.stockStatus === "in_stock"
                    ? "bg-green-500"
                    : product.stockStatus === "low_stock"
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
              />
              <span className="text-sm text-[rgb(var(--muted-rgb))]">
                {product.stockStatus === "in_stock"
                  ? "In stock"
                  : product.stockStatus === "low_stock"
                  ? "Low stock — order soon"
                  : "Out of stock"}
              </span>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-6 text-2xl font-bold text-white">
              Similar Deals
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {similarProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  className="group rounded-xl border border-white/10 bg-[rgb(var(--surface-rgb))] p-4 transition-all hover:border-[rgb(var(--accent-rgb))]/50"
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-white/5">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.title}
                        className="h-full w-full object-contain p-2 transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <svg
                          className="h-12 w-12 text-[rgb(var(--muted-rgb))]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
                    {p.shop.split(" ")[0]}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-sm font-medium text-white">
                    {p.title}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-bold text-white">
                      ${p.salePrice.toFixed(2)}
                    </span>
                    {p.discount > 0 && (
                      <span className="text-xs text-[rgb(var(--muted-rgb))] line-through">
                        ${p.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/10 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-[rgb(var(--muted-rgb))]">
          <p>
            © 2026 SkateStock. Data from independent skate shops.
          </p>
        </div>
      </footer>
    </div>
  );
}
