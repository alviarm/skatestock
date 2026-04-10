"use client";

import Link from "next/link";
import { useState } from "react";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgb(var(--background-rgb))]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent-secondary-rgb))]">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8M12 8v8" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold text-white">SkateStock</span>
              <p className="text-xs text-[rgb(var(--muted-rgb))]">Price intelligence for skaters</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link href="/search" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
              Browse
            </Link>
            <Link href="/search?on_sale=true" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
              Sales
            </Link>
            <Link href="/alerts" className="text-sm font-medium text-white/80 transition-colors hover:text-white">
              Alerts
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search Button */}
            <Link
              href="/search"
              className="rounded-lg border border-white/10 bg-transparent p-2 text-white/80 transition-colors hover:border-white/20 hover:bg-white/5"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </Link>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="rounded-lg border border-white/10 bg-transparent p-2 text-white/80 transition-colors hover:border-white/20 hover:bg-white/5"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.414-1.414a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </Link>

            {/* User Menu */}
            <Link
              href="/auth/signin"
              className="hidden rounded-lg border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:bg-white/5 md:block"
            >
              Sign In
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-lg border border-white/10 bg-transparent p-2 text-white/80 md:hidden"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="border-t border-white/10 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <Link
                href="/search"
                className="px-2 py-2 text-sm font-medium text-white/80"
                onClick={() => setIsMenuOpen(false)}
              >
                Browse
              </Link>
              <Link
                href="/search?on_sale=true"
                className="px-2 py-2 text-sm font-medium text-white/80"
                onClick={() => setIsMenuOpen(false)}
              >
                Sales
              </Link>
              <Link
                href="/wishlist"
                className="px-2 py-2 text-sm font-medium text-white/80"
                onClick={() => setIsMenuOpen(false)}
              >
                Wishlist
              </Link>
              <Link
                href="/alerts"
                className="px-2 py-2 text-sm font-medium text-white/80"
                onClick={() => setIsMenuOpen(false)}
              >
                Alerts
              </Link>
              <div className="my-2 border-t border-white/10" />
              <Link
                href="/auth/signin"
                className="px-2 py-2 text-sm font-medium text-[rgb(var(--accent-rgb))]"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
