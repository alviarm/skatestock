"use client"; // Ensures this component is treated as a Client Component

import Image from "next/image";
import { useEffect, useState } from "react";

// Define the TypeScript interface for the product
interface Product {
  title: string;
  originalPrice: string;
  salePrice: string;
  link: string;
  image: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(9); // Default number of products per page
  const [loading, setLoading] = useState<boolean>(false); // Loading state
  const [category, setCategory] = useState<string>("all"); // Filter category
  const [sort, setSort] = useState<string>("default"); // Sorting option

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/scraped-data");
        const data: Product[] = await response.json();
        setProducts(data);
      } catch (err) {
        console.error("Error fetching or parsing data:", err);
        setError("Failed to load products. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Calculate the range of products to display based on the current page
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);

  // Handle pagination
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Handle sorting
  const handleSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sortType = e.target.value;
    setSort(sortType);

    // Sort products accordingly
    if (sortType === "lowToHigh") {
      setProducts([...products].sort((a, b) => parseFloat(a.salePrice.replace("$", "")) - parseFloat(b.salePrice.replace("$", ""))));
    } else if (sortType === "highToLow") {
      setProducts([...products].sort((a, b) => parseFloat(b.salePrice.replace("$", "")) - parseFloat(a.salePrice.replace("$", ""))));
    } else if (sortType === "biggestDiscount") {
      setProducts([...products].sort((a, b) => {
        const discountA = (parseFloat(a.originalPrice.replace("$", "")) - parseFloat(a.salePrice.replace("$", ""))) / parseFloat(a.originalPrice.replace("$", ""));
        const discountB = (parseFloat(b.originalPrice.replace("$", "")) - parseFloat(b.salePrice.replace("$", ""))) / parseFloat(b.originalPrice.replace("$", ""));
        return discountB - discountA; // Sort in descending order of discount percentage
      }));
    }
  };

  // Handle products per page change
  const handleProductsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setProductsPerPage(parseInt(e.target.value));
    setCurrentPage(1); // Reset to page 1 when changing the number of products per page
  };

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <header className="w-full max-w-4xl mb-12 text-center">
        <h1 className="text-5xl font-bold mb-4">Welcome to SkateStock</h1>
        <p className="text-lg text-gray-600">
          Discover the best deals on skateboarding gear from various skater-owned shops.
        </p>

        {/* Filter and Sorting */}
        <div className="flex justify-between items-center mt-6">
          <div>
            <button onClick={() => setCategory("shoes")} className={`px-4 py-2 ${category === "shoes" ? "bg-gray-800 text-white" : "bg-gray-200"}`}>Shoes</button>
            <button onClick={() => setCategory("apparel")} className={`px-4 py-2 ml-2 ${category === "apparel" ? "bg-gray-800 text-white" : "bg-gray-200"}`}>Apparel</button>
            <button onClick={() => setCategory("accessories")} className={`px-4 py-2 ml-2 ${category === "accessories" ? "bg-gray-800 text-white" : "bg-gray-200"}`}>Accessories</button>
          </div>
          <div>
            <select onChange={handleSort} className="p-2 border rounded">
              <option value="default">Sort by</option>
              <option value="lowToHigh">Price: Low to High</option>
              <option value="highToLow">Price: High to Low</option>
              <option value="biggestDiscount">Biggest Discount</option>
            </select>
          </div>
          <div>
            <label htmlFor="productsPerPage" className="mr-2">View:</label>
            <select id="productsPerPage" onChange={handleProductsPerPageChange} className="p-2 border rounded">
              <option value="9">9 Products</option>
              <option value="18">18 Products</option>
              <option value="27">27 Products</option>
            </select>
          </div>
        </div>
      </header>

      {/* Product Grid */}
      <section className="grid gap-8 lg:grid-cols-3 w-full max-w-4xl">
        {loading ? (
          <div className="w-full text-center">
            <div className="loader">Loading...</div>
          </div>
        ) : currentProducts.length > 0 ? (
          currentProducts.map((product, index) => {
            const discount = Math.round(
              (parseFloat(product.originalPrice.replace("$", "")) - parseFloat(product.salePrice.replace("$", ""))) /
                parseFloat(product.originalPrice.replace("$", "")) * 100
            );
            const savings = (parseFloat(product.originalPrice.replace("$", "")) - parseFloat(product.salePrice.replace("$", ""))).toFixed(2);

            return (
              <a
                key={index}
                href={product.link}
                className="group block rounded-lg border border-gray-300 p-6 transition-transform hover:shadow-lg hover:scale-105"
              >
                <Image
                  src={product.image && product.image.startsWith("http") ? product.image : "/path/to/placeholder-image.jpg"}
                  alt={product.title}
                  width={300}
                  height={300}
                  className="mb-4 rounded-lg"
                />
                <h2 className="text-2xl font-semibold mb-2">{product.title}</h2>
                <div className="flex flex-col">
                  <span className="line-through text-gray-500">{product.originalPrice}</span> {/* Slashed original price */}
                  <span className="text-red-500">{product.salePrice}</span> {/* Sale price in red */}
                  <span className="text-green-500 font-bold mt-1">{discount}% Off</span>
                  <span className="text-green-500">Save ${savings}</span>
                </div>
              </a>
            );
          })
        ) : (
          <p className="text-gray-500">No products found.</p>
        )}
      </section>

      {/* Pagination controls */}
      <div className="mt-8 flex justify-center items-center">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 mr-2 text-white bg-gray-800 rounded disabled:bg-gray-500"
        >
          Previous
        </button>
        <span className="px-4">Page {currentPage}</span>
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={indexOfLastProduct >= products.length}
          className="px-4 py-2 text-white bg-gray-800 rounded disabled:bg-gray-500"
        >
          Next
        </button>
      </div>

      <footer className="w-full max-w-4xl mt-12 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} SkateStock. All rights reserved.</p>
        <p>
          Built with ❤️ using <a href="https://nextjs.org/" className="text-blue-500 hover:underline">Next.js</a>
        </p>
      </footer>
    </main>
  );
}
