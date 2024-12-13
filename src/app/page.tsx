// "use client";

// import Image from "next/image";
// import { useEffect, useState } from "react";

// // Updated Product interface with optional properties
// interface Product {
//   productId: number;
//   productType: string;
//   title: string;
//   originalPrice?: string; // Made optional
//   salePrice?: string; // Made optional
//   link: string;
//   image: string;
// }

// export default function Home() {
//   const [products, setProducts] = useState<Product[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [productsPerPage, setProductsPerPage] = useState(9);
//   const [loading, setLoading] = useState(false);
//   const [sort, setSort] = useState("default");

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
//         setProducts(data);
//       } catch (err) {
//         console.error("Error fetching or parsing data:", err);
//         setError("Failed to load products. Please try again later.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProducts();
//   }, []);

//   const indexOfLastProduct = currentPage * productsPerPage;
//   const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
//   const currentProducts = products.slice(
//     indexOfFirstProduct,
//     indexOfLastProduct
//   );

//   const paginate = (pageNumber: number) => {
//     setCurrentPage(pageNumber);
//   };

//   const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const sortType = e.target.value;
//     setSort(sortType);

//     switch (sortType) {
//       case "lowToHigh":
//         setProducts(
//           [...products].sort((a, b) => {
//             const priceA = a.salePrice
//               ? parseFloat(a.salePrice.replace("$", ""))
//               : 0;
//             const priceB = b.salePrice
//               ? parseFloat(b.salePrice.replace("$", ""))
//               : 0;
//             return priceA - priceB;
//           })
//         );
//         break;
//       case "highToLow":
//         setProducts(
//           [...products].sort((a, b) => {
//             const priceA = a.salePrice
//               ? parseFloat(a.salePrice.replace("$", ""))
//               : 0;
//             const priceB = b.salePrice
//               ? parseFloat(b.salePrice.replace("$", ""))
//               : 0;
//             return priceB - priceA;
//           })
//         );
//         break;
//       case "biggestDiscount":
//         setProducts(
//           [...products].sort((a, b) => {
//             const discountA =
//               a.originalPrice && a.salePrice
//                 ? (parseFloat(a.originalPrice.replace("$", "")) -
//                     parseFloat(a.salePrice.replace("$", ""))) /
//                   parseFloat(a.originalPrice.replace("$", ""))
//                 : 0;
//             const discountB =
//               b.originalPrice && b.salePrice
//                 ? (parseFloat(b.originalPrice.replace("$", "")) -
//                     parseFloat(b.salePrice.replace("$", ""))) /
//                   parseFloat(b.originalPrice.replace("$", ""))
//                 : 0;
//             return discountB - discountA;
//           })
//         );
//         break;
//       default:
//         setProducts([...products]);
//     }
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
//       </div>

//       <section className="grid gap-8 lg:grid-cols-3 w-full max-w-4xl">
//         {loading ? (
//           <div className="w-full text-center">
//             <div className="loader">Loading...</div>
//           </div>
//         ) : currentProducts.length > 0 ? (
//           currentProducts.map((product) => {
//             // Check if originalPrice and salePrice exist and are strings
//             if (
//               (product.originalPrice &&
//                 typeof product.originalPrice === "string") ||
//               (product.salePrice && typeof product.salePrice === "string")
//             ) {
//               const originalPriceValue = product.originalPrice
//                 ? parseFloat(product.originalPrice.replace("$", ""))
//                 : 0;
//               const salePriceValue = product.salePrice
//                 ? parseFloat(product.salePrice.replace("$", ""))
//                 : 0;
//               let discount = 0;
//               let savings = "0.00";

//               if (product.originalPrice && product.salePrice) {
//                 discount = Math.round(
//                   ((originalPriceValue - salePriceValue) / originalPriceValue) *
//                     100
//                 );
//                 savings = (originalPriceValue - salePriceValue).toFixed(2);
//               }

//               return (
//                 <a
//                   key={product.productId}
//                   href={product.link}
//                   className="group block rounded-lg border border-gray-300 p-6 transition-transform hover:shadow-lg hover:scale-105"
//                 >
//                   <Image
//                     src={
//                       product.image && product.image.startsWith("http")
//                         ? product.image
//                         : "/path/to/placeholder-image.jpg"
//                     }
//                     alt={product.title}
//                     width={300}
//                     height={300}
//                     className="mb-4 rounded-lg"
//                   />
//                   <h2 className="text-2xl font-semibold mb-2">
//                     {product.title}
//                   </h2>
//                   <div className="flex flex-col">
//                     {product.originalPrice && (
//                       <span className="line-through text-gray-500">
//                         {product.originalPrice}
//                       </span>
//                     )}
//                     {product.salePrice && (
//                       <span className="text-red-500">{product.salePrice}</span>
//                     )}
//                     {product.originalPrice && product.salePrice && (
//                       <span className="text-green-500 font-bold mt-1">
//                         {discount}% Off
//                       </span>
//                     )}
//                     {product.originalPrice && product.salePrice && (
//                       <span className="text-green-500">Save ${savings}</span>
//                     )}
//                   </div>
//                 </a>
//               );
//             } else {
//               return null;
//             }
//           })
//         ) : (
//           <p className="text-gray-500">No products found.</p>
//         )}
//       </section>

//       {/* Pagination controls */}
//       <div className="w-full max-w-4xl mt-8 flex justify-center">
//         <button
//           disabled={currentPage === 1}
//           onClick={() => paginate(currentPage - 1)}
//           className="px-4 py-2 mr-2 rounded-md border border-gray-300 disabled:bg-gray-200"
//         >
//           Previous
//         </button>
//         <button
//           disabled={
//             indexOfLastProduct >= products.length ||
//             products.length < productsPerPage
//           }
//           onClick={() => paginate(currentPage + 1)}
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
import { useEffect, useState } from "react";

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
  const [productsPerPage, setProductsPerPage] = useState(9);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState("default");
  const [selectedProductType, setSelectedProductType] = useState<string>("all");

  // useEffect(() => {
  //   const fetchProducts = async () => {
  //     setLoading(true);
  //     try {
  //       const response = await fetch("/api/scraped-data");
  //       if (!response.ok) {
  //         throw new Error("Failed to fetch data");
  //       }
  //       const data: Product[] = await response.json();
  //       console.log("Fetched products:", data); // Debug log
  //       setBaseProducts(data);
  //       setProducts(filterAndSortProducts(data, selectedProductType, sort));
  //     } catch (err) {
  //       console.error("Error fetching or parsing data:", err);
  //       setError("Failed to load products. Please try again later.");
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchProducts();
  // }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/scraped-data");
        if (!response.ok) {
          throw new Error("Failed to fetch data");
        }
        const data: Product[] = await response.json();
        console.log("Fetched products:", data); // Debug log
        setBaseProducts(data);
      } catch (err) {
        console.error("Error fetching or parsing data:", err);
        setError("Failed to load products. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []); // Empty dependency array

  useEffect(() => {
    if (baseProducts.length > 0) {
      const filteredAndSortedProducts = filterAndSortProducts(
        baseProducts,
        selectedProductType,
        sort
      );
      setProducts(filteredAndSortedProducts);
      setCurrentPage(1); // Reset current page
    }
  }, [baseProducts, selectedProductType, sort]);

  const filterAndSortProducts = (
    products: Product[],
    selectedType: string,
    selectedSort: string
  ): Product[] => {
    let filteredProducts =
      selectedType === "all"
        ? products
        : products.filter((product) => product.productType === selectedType);

    switch (selectedSort) {
      case "lowToHigh":
        return filteredProducts.sort((a, b) => {
          const priceA = a.salePrice
            ? parseFloat(a.salePrice.replace("$", ""))
            : 0;
          const priceB = b.salePrice
            ? parseFloat(b.salePrice.replace("$", ""))
            : 0;
          return priceA - priceB;
        });
      case "highToLow":
        return filteredProducts.sort((a, b) => {
          const priceA = a.salePrice
            ? parseFloat(a.salePrice.replace("$", ""))
            : 0;
          const priceB = b.salePrice
            ? parseFloat(b.salePrice.replace("$", ""))
            : 0;
          return priceB - priceA;
        });
      case "biggestDiscount":
        return filteredProducts.sort((a, b) => {
          const discountA =
            a.originalPrice && a.salePrice
              ? (parseFloat(a.originalPrice.replace("$", "")) -
                  parseFloat(a.salePrice.replace("$", ""))) /
                parseFloat(a.originalPrice.replace("$", ""))
              : 0;
          const discountB =
            b.originalPrice && b.salePrice
              ? (parseFloat(b.originalPrice.replace("$", "")) -
                  parseFloat(b.salePrice.replace("$", ""))) /
                parseFloat(b.originalPrice.replace("$", ""))
              : 0;
          return discountB - discountA;
        });
      default:
        return filteredProducts;
    }
  };

  const getUniqueProductTypes = (products: Product[]) => {
    return [...new Set(products.map((product) => product.productType))];
  };

  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value);
  };

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      {/* Header and controls */}
      <div className="w-full max-w-4xl mb-8">
        <label htmlFor="sort" className="mr-2 text-gray-600">
          Sort by:
        </label>
        <select
          id="sort"
          value={sort}
          onChange={handleSort}
          className="border border-gray-300 p-2 rounded-md"
        >
          <option value="default">Default</option>
          <option value="lowToHigh">Price: Low to High</option>
          <option value="highToLow">Price: High to Low</option>
          <option value="biggestDiscount">Biggest Discount</option>
        </select>

        <label htmlFor="productType" className="ml-4 mr-2 text-gray-600">
          Filter by Type:
        </label>
        <select
          id="productType"
          value={selectedProductType}
          onChange={(e) => setSelectedProductType(e.target.value)}
          className="border border-gray-300 p-2 rounded-md"
        >
          <option value="all">All</option>
          {baseProducts.length > 0 && (
            <>
              {getUniqueProductTypes(baseProducts).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      <section className="grid gap-8 lg:grid-cols-3 w-full max-w-4xl">
        {loading ? (
          <div className="w-full text-center">
            <div className="loader">Loading...</div>
          </div>
        ) : products.length > 0 ? (
          products
            .slice(
              (currentPage - 1) * productsPerPage,
              currentPage * productsPerPage
            )
            .map((product) => {
              // Check if originalPrice and salePrice exist and are strings
              if (
                (product.originalPrice &&
                  typeof product.originalPrice === "string") ||
                (product.salePrice && typeof product.salePrice === "string")
              ) {
                const originalPriceValue = product.originalPrice
                  ? parseFloat(product.originalPrice.replace("$", ""))
                  : 0;
                const salePriceValue = product.salePrice
                  ? parseFloat(product.salePrice.replace("$", ""))
                  : 0;
                let discount = 0;
                let savings = "0.00";

                if (product.originalPrice && product.salePrice) {
                  discount = Math.round(
                    ((originalPriceValue - salePriceValue) /
                      originalPriceValue) *
                      100
                  );
                  savings = (originalPriceValue - salePriceValue).toFixed(2);
                }

                return (
                  <a
                    key={product.productId}
                    href={product.link}
                    className="group block rounded-lg border border-gray-300 p-6 transition-transform hover:shadow-lg hover:scale-105"
                  >
                    <Image
                      src={
                        product.image && product.image.startsWith("http")
                          ? product.image
                          : "/path/to/placeholder-image.jpg"
                      }
                      alt={product.title}
                      width={300}
                      height={300}
                      className="mb-4 rounded-lg"
                    />
                    <h2 className="text-2xl font-semibold mb-2">
                      {product.title}
                    </h2>
                    <div className="flex flex-col">
                      {product.originalPrice && (
                        <span className="line-through text-gray-500">
                          {product.originalPrice}
                        </span>
                      )}
                      {product.salePrice && (
                        <span className="text-red-500">
                          {product.salePrice}
                        </span>
                      )}
                      {product.originalPrice && product.salePrice && (
                        <span className="text-green-500 font-bold mt-1">
                          {discount}% Off
                        </span>
                      )}
                      {product.originalPrice && product.salePrice && (
                        <span className="text-green-500">Save ${savings}</span>
                      )}
                    </div>
                  </a>
                );
              } else {
                return null;
              }
            })
        ) : (
          <p className="text-gray-500">No products found.</p>
        )}
      </section>

      {/* Pagination controls */}
      <div className="w-full max-w-4xl mt-8 flex justify-center">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
          className="px-4 py-2 mr-2 rounded-md border border-gray-300 disabled:bg-gray-200"
        >
          Previous
        </button>
        <button
          disabled={
            currentPage * productsPerPage >= products.length ||
            products.length < productsPerPage
          }
          onClick={() => setCurrentPage(currentPage + 1)}
          className="px-4 py-2 rounded-md border border-gray-300 disabled:bg-gray-200"
        >
          Next
        </button>
      </div>

      <footer className="w-full max-w-4xl mt-12 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} SkateStock. All rights reserved.</p>
        <p>
          Built with ❤️ using{" "}
          <a
            href="https://nextjs.org/"
            className="text-blue-500 hover:underline"
          >
            Next.js
          </a>
        </p>
      </footer>
    </main>
  );
}
