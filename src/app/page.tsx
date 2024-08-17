"use client"; // Ensures this component is treated as a Client Component

import Image from "next/image";
import { useEffect, useState } from "react";

// Define the TypeScript interface for the product
interface Product {
  title: string;
  price: string;
  link: string;
  image: string;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/scraped-data');
        const data: Product[] = await response.json(); // Directly fetch JSON data
        setProducts(data);
      } catch (err) {
        console.error('Error fetching or parsing data:', err);
        setError('Failed to load products. Please try again later.');
      }
    };

    fetchProducts();
  }, []);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <header className="w-full max-w-4xl mb-12 text-center">
        <h1 className="text-5xl font-bold mb-4">Welcome to SkateStock</h1>
        <p className="text-lg text-gray-600">
          Discover the best deals on skateboarding gear from over 120 skater-owned shops.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-3 w-full max-w-4xl">
        {products.length > 0 ? (
          products.map((product, index) => (
            <a
              key={index}
              href={product.link}
              className="group block rounded-lg border border-gray-300 p-6 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              <Image
                src={product.image && product.image.startsWith('http') ? product.image : '/path/to/placeholder-image.jpg'}
                alt={product.title}
                width={300}
                height={300}
                className="mb-4 rounded-lg"
              />
              <h2 className="text-2xl font-semibold mb-2">{product.title}</h2>
              <p className="text-gray-500">{product.price}</p>
            </a>
          ))
        ) : (
          <p className="text-gray-500">Loading products...</p>
        )}
      </section>

      <footer className="w-full max-w-4xl mt-12 text-center text-gray-400 text-sm">
        <p>© {new Date().getFullYear()} SkateStock. All rights reserved.</p>
        <p>
          Built with ❤️ using <a href="https://nextjs.org/" className="text-blue-500 hover:underline">Next.js</a>
        </p>
      </footer>
    </main>
  );
}
