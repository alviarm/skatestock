import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { deduplicateProducts } from "../../../utils/dataValidation";

// Simple in-memory cache
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Function to read and parse data from a file
function readDataFromFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data);
  }
  return [];
}

// Function to get all products with caching
function getAllProducts() {
  const now = Date.now();

  // Check if cache exists and is still valid
  if (cache.has("products") && cache.has("timestamp")) {
    const timestamp = cache.get("timestamp");
    if (now - timestamp < CACHE_DURATION) {
      console.log("Returning cached data");
      return cache.get("products");
    }
  }

  console.log("Fetching fresh data");

  // Paths to your JSON files
  const seasonsFilePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "scraped-data",
    "seasonsScrapedData.json"
  );
  const premierFilePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "scraped-data",
    "premierScrapedData.json"
  );
  const laborFilePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "scraped-data",
    "laborScrapedData.json"
  );
  const njFilePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "scraped-data",
    "njScrapedData.json"
  );
  const blacksheepFilePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "scraped-data",
    "blacksheepScrapedData.json"
  );

  try {
    // Read and parse data from all files
    const seasonsData = readDataFromFile(seasonsFilePath);
    const premierData = readDataFromFile(premierFilePath);
    const laborData = readDataFromFile(laborFilePath);
    const njData = readDataFromFile(njFilePath);
    const blacksheepData = readDataFromFile(blacksheepFilePath);

    // Combine the products into one array
    const products = [
      ...seasonsData,
      ...premierData,
      ...laborData,
      ...njData,
      ...blacksheepData,
    ];

    // Deduplicate products
    const deduplicatedProducts = deduplicateProducts(products);

    // Update cache
    cache.set("products", deduplicatedProducts);
    cache.set("timestamp", now);

    return deduplicatedProducts;
  } catch (error) {
    console.error("Error reading the JSON files:", error);
    throw new Error("Failed to load products");
  }
}

// GET endpoint with pagination and filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const shop = searchParams.get("shop") || "";
    const productType = searchParams.get("type") || "";
    const search = searchParams.get("search") || "";

    let products = getAllProducts();

    // Apply filters
    if (shop) {
      products = products.filter((product: any) => {
        // This is a simplified filter - you'd need to enhance based on how shop is identified
        return product.link.includes(shop.toLowerCase());
      });
    }

    if (productType) {
      products = products.filter((product: any) =>
        product.productType.toLowerCase().includes(productType.toLowerCase())
      );
    }

    if (search) {
      products = products.filter((product: any) =>
        product.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = products.slice(startIndex, endIndex);

    return NextResponse.json({
      products: paginatedProducts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(products.length / limit),
        totalProducts: products.length,
        hasNext: endIndex < products.length,
        hasPrev: startIndex > 0,
      },
    });
  } catch (error: any) {
    console.error("Error reading the JSON file:", error);
    return NextResponse.json(
      { message: "Failed to load products", error: error.message },
      { status: 500 }
    );
  }
}
