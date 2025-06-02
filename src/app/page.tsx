// "use client";

// import Image from "next/image";
// import { useEffect, useState } from "react";

// interface Product {
//   productId: number;
//   productType: string;
//   title: string;
//   originalPrice?: string;
//   salePrice?: string;
//   link: string;
//   image: string;
// }

// export default function Home() {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [baseProducts, setBaseProducts] = useState<Product[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [productsPerPage, setProductsPerPage] = useState(9);
//   const [loading, setLoading] = useState(false);
//   const [sort, setSort] = useState("default");
//   const [selectedProductType, setSelectedProductType] = useState<string>("all");

//   useEffect(() => {
//     const fetchProducts = async () => {
//       setLoading(true);
//       try {
//         const response = await fetch("/api/scraped-data");
//         if (!response.ok) {
//           throw new Error("Failed to fetch data");
//         }
//         const data: Product[] = await response.json();
//         console.log("Fetched products:", data); // Debug log
//         setBaseProducts(data);
//       } catch (err) {
//         console.error("Error fetching or parsing data:", err);
//         setError("Failed to load products. Please try again later.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProducts();
//   }, []); // Empty dependency array

//   useEffect(() => {
//     if (baseProducts.length > 0) {
//       const filteredAndSortedProducts = filterAndSortProducts(
//         baseProducts,
//         selectedProductType,
//         sort
//       );
//       setProducts(filteredAndSortedProducts);
//       setCurrentPage(1); // Reset current page
//     }
//   }, [baseProducts, selectedProductType, sort]);

//   const filterAndSortProducts = (
//     products: Product[],
//     selectedType: string,
//     selectedSort: string
//   ): Product[] => {
//     let filteredProducts =
//       selectedType === "all"
//         ? products
//         : products.filter((product) => product.productType === selectedType);

//     switch (selectedSort) {
//       case "lowToHigh":
//         return filteredProducts.sort((a, b) => {
//           const priceA = a.salePrice
//             ? parseFloat(a.salePrice.replace("$", ""))
//             : 0;
//           const priceB = b.salePrice
//             ? parseFloat(b.salePrice.replace("$", ""))
//             : 0;
//           return priceA - priceB;
//         });
//       case "highToLow":
//         return filteredProducts.sort((a, b) => {
//           const priceA = a.salePrice
//             ? parseFloat(a.salePrice.replace("$", ""))
//             : 0;
//           const priceB = b.salePrice
//             ? parseFloat(b.salePrice.replace("$", ""))
//             : 0;
//           return priceB - priceA;
//         });
//       case "biggestDiscount":
//         return filteredProducts.sort((a, b) => {
//           const discountA =
//             a.originalPrice && a.salePrice
//               ? (parseFloat(a.originalPrice.replace("$", "")) -
//                   parseFloat(a.salePrice.replace("$", ""))) /
//                 parseFloat(a.originalPrice.replace("$", ""))
//               : 0;
//           const discountB =
//             b.originalPrice && b.salePrice
//               ? (parseFloat(b.originalPrice.replace("$", "")) -
//                   parseFloat(b.salePrice.replace("$", ""))) /
//                 parseFloat(b.originalPrice.replace("$", ""))
//               : 0;
//           return discountB - discountA;
//         });
//       default:
//         return filteredProducts;
//     }
//   };

//   const getUniqueProductTypes = (products: Product[]) => {
//     return [...new Set(products.map((product) => product.productType))];
//   };

//   const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     setSort(e.target.value);
//   };

//   if (error) {
//     return <p className="text-red-500">{error}</p>;
//   }

//   return (
//     <main className="flex min-h-screen flex-col items-center justify-center p-12">
//       {/* Header and controls */}
//       <div className="w-full max-w-4xl mb-8">
//         <label htmlFor="sort" className="mr-2 text-gray-600">
//           Sort by:
//         </label>
//         <select
//           id="sort"
//           value={sort}
//           onChange={handleSort}
//           className="border border-gray-300 p-2 rounded-md"
//         >
//           <option value="default">Default</option>
//           <option value="lowToHigh">Price: Low to High</option>
//           <option value="highToLow">Price: High to Low</option>
//           <option value="biggestDiscount">Biggest Discount</option>
//         </select>

//         <label htmlFor="productType" className="ml-4 mr-2 text-gray-600">
//           Filter by Type:
//         </label>
//         <select
//           id="productType"
//           value={selectedProductType}
//           onChange={(e) => setSelectedProductType(e.target.value)}
//           className="border border-gray-300 p-2 rounded-md"
//         >
//           <option value="all">All</option>
//           {baseProducts.length > 0 && (
//             <>
//               {getUniqueProductTypes(baseProducts).map((type) => (
//                 <option key={type} value={type}>
//                   {type}
//                 </option>
//               ))}
//             </>
//           )}
//         </select>
//       </div>

//       <section className="grid gap-8 lg:grid-cols-3 w-full max-w-4xl">
//         {loading ? (
//           <div className="w-full text-center">
//             <div className="loader">Loading...</div>
//           </div>
//         ) : products.length > 0 ? (
//           products
//             .slice(
//               (currentPage - 1) * productsPerPage,
//               currentPage * productsPerPage
//             )
//             .map((product) => {
//               // Check if originalPrice and salePrice exist and are strings
//               if (
//                 (product.originalPrice &&
//                   typeof product.originalPrice === "string") ||
//                 (product.salePrice && typeof product.salePrice === "string")
//               ) {
//                 const originalPriceValue = product.originalPrice
//                   ? parseFloat(product.originalPrice.replace("$", ""))
//                   : 0;
//                 const salePriceValue = product.salePrice
//                   ? parseFloat(product.salePrice.replace("$", ""))
//                   : 0;
//                 let discount = 0;
//                 let savings = "0.00";

//                 if (product.originalPrice && product.salePrice) {
//                   discount = Math.round(
//                     ((originalPriceValue - salePriceValue) /
//                       originalPriceValue) *
//                       100
//                   );
//                   savings = (originalPriceValue - salePriceValue).toFixed(2);
//                 }

//                 return (
//                   <a
//                     key={product.productId}
//                     href={product.link}
//                     className="group block rounded-lg border border-gray-300 p-6 transition-transform hover:shadow-lg hover:scale-105"
//                   >
//                     <Image
//                       src={
//                         product.image && product.image.startsWith("http")
//                           ? product.image
//                           : "/path/to/placeholder-image.jpg"
//                       }
//                       alt={product.title}
//                       width={300}
//                       height={300}
//                       className="mb-4 rounded-lg"
//                     />
//                     <h2 className="text-2xl font-semibold mb-2">
//                       {product.title}
//                     </h2>
//                     <div className="flex flex-col">
//                       {product.originalPrice && (
//                         <span className="line-through text-gray-500">
//                           {product.originalPrice}
//                         </span>
//                       )}
//                       {product.salePrice && (
//                         <span className="text-red-500">
//                           {product.salePrice}
//                         </span>
//                       )}
//                       {product.originalPrice && product.salePrice && (
//                         <span className="text-green-500 font-bold mt-1">
//                           {discount}% Off
//                         </span>
//                       )}
//                       {product.originalPrice && product.salePrice && (
//                         <span className="text-green-500">Save ${savings}</span>
//                       )}
//                     </div>
//                   </a>
//                 );
//               } else {
//                 return null;
//               }
//             })
//         ) : (
//           <p className="text-gray-500">No products found.</p>
//         )}
//       </section>

//       {/* Pagination controls */}
//       <div className="w-full max-w-4xl mt-8 flex justify-center">
//         <button
//           disabled={currentPage === 1}
//           onClick={() => setCurrentPage(currentPage - 1)}
//           className="px-4 py-2 mr-2 rounded-md border border-gray-300 disabled:bg-gray-200"
//         >
//           Previous
//         </button>
//         <button
//           disabled={
//             currentPage * productsPerPage >= products.length ||
//             products.length < productsPerPage
//           }
//           onClick={() => setCurrentPage(currentPage + 1)}
//           className="px-4 py-2 rounded-md border border-gray-300 disabled:bg-gray-200"
//         >
//           Next
//         </button>
//       </div>

//       <footer className="w-full max-w-4xl mt-12 text-center text-gray-400 text-sm">
//         <p>© {new Date().getFullYear()} SkateStock. All rights reserved.</p>
//         <p>
//           Built with ❤️ using{" "}
//           <a
//             href="https://nextjs.org/"
//             className="text-blue-500 hover:underline"
//           >
//             Next.js
//           </a>
//         </p>
//       </footer>
//     </main>
//   );
// }

"use client";

import Image from "next/image";
import { useEffect, useState, useMemo, useCallback } from "react";

interface Product {
  productId: number;
  productType: string;
  title: string;
  originalPrice?: string;
  salePrice?: string;
  link: string;
  image: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [baseProducts, setBaseProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage] = useState(9);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("default");
  const [selectedProductType, setSelectedProductType] = useState<string>("all");
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState(""); // Add search query state

  // Fetch products with retry mechanism
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/scraped-data");
      if (!response.ok) throw new Error("Failed to fetch data");

      const data: Product[] = await response.json();
      setBaseProducts(data);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load products. Click to retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();

    // Refresh data every 5 minutes
    const interval = setInterval(fetchProducts, 300000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // Filter and sort products
  const filterAndSortProducts = useCallback(
    (
      products: Product[],
      selectedType: string,
      selectedSort: string,
      query: string
    ): Product[] => {
      // Filter by product type
      let filtered =
        selectedType === "all"
          ? products
          : products.filter((p) => p.productType === selectedType);

      // Filter by search query
      if (query) {
        filtered = filtered.filter((p) =>
          p.title.toLowerCase().includes(query.toLowerCase())
        );
      }

      // Sort products
      return filtered.sort((a, b) => {
        const getPrice = (p: Product) => {
          // Handle case where both prices might be undefined
          const priceStr = p.salePrice || p.originalPrice;
          if (!priceStr) return 0;

          return parseFloat(priceStr.replace(/[^\d.]/g, ""));
        };

        const getDiscount = (p: Product) => {
          // Add null checks before accessing properties
          if (!p.originalPrice || !p.salePrice) return 0;

          const original = parseFloat(p.originalPrice.replace(/[^\d.]/g, ""));
          const sale = parseFloat(p.salePrice.replace(/[^\d.]/g, ""));

          return original ? (original - sale) / original : 0;
        };

        switch (selectedSort) {
          case "lowToHigh":
            return getPrice(a) - getPrice(b);
          case "highToLow":
            return getPrice(b) - getPrice(a);
          case "biggestDiscount":
            return getDiscount(b) - getDiscount(a);
          default:
            return 0;
        }
      });
    },
    []
  );

  // Apply filters and sorting
  useEffect(() => {
    if (baseProducts.length > 0) {
      const filteredAndSorted = filterAndSortProducts(
        baseProducts,
        selectedProductType,
        sort,
        searchQuery // Pass search query
      );
      setProducts(filteredAndSorted);
      setCurrentPage(1);
    }
  }, [
    baseProducts,
    selectedProductType,
    sort,
    searchQuery,
    filterAndSortProducts,
  ]);

  // Get unique product types
  const productTypes = useMemo(
    () => [...new Set(baseProducts.map((p) => p.productType))],
    [baseProducts]
  );

  // Handle retry
  const handleRetry = () => fetchProducts();

  // Pagination helpers
  const totalPages = Math.ceil(products.length / productsPerPage);
  const currentProducts = products.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  );

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-50 font-sans">
      <header className="w-full max-w-6xl mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-900">
          <span className="text-red-600">Skate</span>Stock
        </h1>
        <p className="text-gray-600 mb-4">
          Find discounted products from independent skate shops
        </p>

        {/* SEARCH BAR */}
        <div className="flex items-center w-full max-w-md mb-6">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 p-2 rounded-l-md focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="bg-gray-200 px-3 py-2 rounded-r-md hover:bg-gray-300 transition"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <div className="flex items-center">
            <label htmlFor="sort" className="mr-2 text-gray-600">
              Sort:
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-gray-300 p-2 rounded-md bg-surface text-foreground"
            >
              <option value="default">Newest</option>
              <option value="lowToHigh">Price: Low to High</option>
              <option value="highToLow">Price: High to Low</option>
              <option value="biggestDiscount">Biggest Discount</option>
            </select>
          </div>

          <div className="flex items-center">
            <label htmlFor="productType" className="mr-2 text-gray-600">
              Filter:
            </label>
            <select
              id="productType"
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
              className="border border-gray-300 p-2 rounded-md bg-surface text-foreground"
            >
              <option value="all">All Products</option>
              {productTypes.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {lastUpdated && (
          <p className="text-sm text-gray-500">Last updated: {lastUpdated}</p>
        )}
      </header>

      {error ? (
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div className="grid gap-8 lg:grid-cols-3 w-full max-w-6xl">
          {[...Array(productsPerPage)].map((_, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 p-6 bg-white"
            >
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-64 mb-4 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse" />
            </div>
          ))}
        </div>
      ) : currentProducts.length > 0 ? (
        <>
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 w-full max-w-6xl">
            {currentProducts.map((product) => (
              <ProductCard key={product.productId} product={product} />
            ))}
          </section>

          {/* Pagination */}
          <div className="flex items-center justify-center mt-8 space-x-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className={`px-4 py-2 rounded-md ${
                currentPage === 1
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Previous
            </button>

            <span className="px-4 py-2 text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className={`px-4 py-2 rounded-md ${
                currentPage >= totalPages
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border border-gray-300 hover:bg-gray-50"
              }`}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchQuery ? "No matching products found" : "No products found"}
          </h3>
          <p className="text-gray-600">
            {searchQuery
              ? "Try a different search term"
              : "Try changing your filters or check back later"}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="mt-3 px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      <footer className="w-full max-w-6xl mt-12 pt-6 border-t border-gray-200 text-center text-gray-500 text-sm">
        <p>
          © {new Date().getFullYear()} SkateStock. Supporting independent skate
          shops.
        </p>
        <p className="mt-2">
          Data updates every 5 minutes •
          <a
            href="https://github.com/alviarm/skatestock"
            className="text-blue-600 hover:underline ml-1"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contribute on GitHub
          </a>
        </p>
      </footer>
    </main>
  );
}

// Product Card Component
function ProductCard({ product }: { product: Product }) {
  const [imgSrc, setImgSrc] = useState(product.image);
  const [imgError, setImgError] = useState(false);

  const hasOriginal = !!product.originalPrice;
  const hasSale = !!product.salePrice;

  const originalValue = product.originalPrice
    ? parseFloat(product.originalPrice.replace(/[^\d.]/g, ""))
    : 0;

  const saleValue = product.salePrice
    ? parseFloat(product.salePrice.replace(/[^\d.]/g, ""))
    : originalValue;

  // Only calculate discount if both prices exist
  const discount =
    product.originalPrice && product.salePrice && originalValue > 0
      ? Math.round(((originalValue - saleValue) / originalValue) * 100)
      : 0;

  const savings =
    hasOriginal && hasSale ? (originalValue - saleValue).toFixed(2) : 0;

  return (
    <a
      href={product.link}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md hover:border-red-400 group overflow-hidden"
    >
      <div className="relative aspect-square w-full mb-4 bg-gray-100 rounded-lg overflow-hidden">
        {imgError || !imgSrc.startsWith("http") ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <span className="text-gray-400">No image</span>
          </div>
        ) : (
          <Image
            src={imgSrc}
            alt={product.title}
            fill
            className="object-contain"
            onError={() => setImgError(true)}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}

        {discount > 0 && (
          <span className="absolute top-3 right-3 bg-red-600 text-white text-sm font-bold px-2 py-1 rounded-full">
            {discount}% OFF
          </span>
        )}
      </div>

      <h3 className="font-medium text-gray-900 mb-2 group-hover:text-red-600 line-clamp-2 h-14">
        {product.title}
      </h3>

      <div className="flex items-end justify-between">
        <div>
          {hasOriginal && discount > 0 && (
            <span className="line-through text-gray-500 text-sm block">
              ${originalValue.toFixed(2)}
            </span>
          )}
          <span
            className={`${
              discount > 0 ? "text-red-600 font-bold" : "text-gray-900"
            }`}
          >
            ${saleValue.toFixed(2)}
          </span>
        </div>

        <span className="text-xs uppercase text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {product.productType}
        </span>
      </div>

      {discount > 0 && (
        <div className="mt-2 text-xs text-green-700">Save ${savings}</div>
      )}
    </a>
  );
}
