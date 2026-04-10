"use client";

import Image from "next/image";
import Link from "next/link";

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
  stockStatus: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = product.discount > 0;

  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[rgb(var(--surface-rgb))] transition-all duration-200 hover:border-[rgb(var(--accent-rgb))]/50 hover:shadow-lg hover:shadow-[rgb(var(--accent-rgb))]/10">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-white/5">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.title}
              fill
              className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[rgb(var(--muted-rgb))]">
              <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {product.isNew && (
              <span className="rounded bg-[rgb(var(--accent-rgb))] px-2 py-0.5 text-xs font-semibold text-white">
                NEW
              </span>
            )}
            {hasDiscount && (
              <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                -{product.discount}%
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="absolute right-2 top-2 rounded-full bg-black/50 p-2 opacity-0 transition-opacity duration-200 hover:bg-black/70 group-hover:opacity-100"
          >
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.414-1.414a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Brand */}
          <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[rgb(var(--muted-rgb))]">
            {product.brand}
          </p>

          {/* Title */}
          <h3 className="mb-2 line-clamp-2 text-sm font-medium leading-tight text-white">
            {product.title}
          </h3>

          {/* Shop */}
          <p className="mb-3 text-xs text-[rgb(var(--muted-rgb))]">
            {product.shop}
          </p>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            {hasDiscount ? (
              <>
                <span className="text-lg font-bold text-white">
                  ${product.salePrice.toFixed(2)}
                </span>
                <span className="text-sm text-[rgb(var(--muted-rgb))] line-through">
                  ${product.originalPrice.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-white">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          {product.stockStatus !== "in_stock" && (
            <p className={`mt-2 text-xs font-medium ${product.stockStatus === "low_stock" ? "text-yellow-500" : "text-red-500"}`}>
              {product.stockStatus === "low_stock" ? "Low Stock" : "Out of Stock"}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
