/**
 * Data Validation Utilities for SkateStock
 * TypeScript type definitions and re-exports from JS implementation
 */

export interface Product {
  productId: number | string;
  title: string;
  salePrice?: string;
  originalPrice?: string;
  link: string;
  image: string;
  productType: string;
}

// Re-export functions from JS implementation for TypeScript compatibility
import {
  validateProduct as validateProductJs,
  normalizeProduct as normalizeProductJs,
  deduplicateProducts as deduplicateProductsJs,
  filterValidProducts as filterValidProductsJs,
} from './dataValidation.js';

export const validateProduct = validateProductJs as (product: Partial<Product>) => boolean;
export const normalizeProduct = normalizeProductJs as (product: Partial<Product>, source: string) => Product;
export const deduplicateProducts = deduplicateProductsJs as (products: Product[]) => Product[];
export const filterValidProducts = filterValidProductsJs as (products: Partial<Product>[]) => Product[];

// Default export for compatibility
export default {
  validateProduct,
  normalizeProduct,
  deduplicateProducts,
  filterValidProducts,
};
