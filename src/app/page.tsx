import Image from "next/image";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <header className="w-full max-w-4xl mb-12 text-center">
        <h1 className="text-5xl font-bold mb-4">Welcome to SkateStock</h1>
        <p className="text-lg text-gray-600">
          Discover the best deals on skateboarding gear from over 120 skater-owned shops.
        </p>
      </header>

      <section className="grid gap-8 lg:grid-cols-3 w-full max-w-4xl">
        <a
          href="/products"
          className="group block rounded-lg border border-gray-300 p-6 transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          <h2 className="text-2xl font-semibold mb-2">
            Browse Products
            <span className="inline-block transition-transform group-hover:translate-x-1 ml-2">-&gt;</span>
          </h2>
          <p className="text-gray-500">
            Explore a wide selection of skateboards, apparel, and accessories on sale.
          </p>
        </a>

        <a
          href="/about"
          className="group block rounded-lg border border-gray-300 p-6 transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          <h2 className="text-2xl font-semibold mb-2">
            About Us
            <span className="inline-block transition-transform group-hover:translate-x-1 ml-2">-&gt;</span>
          </h2>
          <p className="text-gray-500">
            Learn about SkateStock’s mission to support local skate shops while helping you find the best deals.
          </p>
        </a>

        <a
          href="/contact"
          className="group block rounded-lg border border-gray-300 p-6 transition-colors hover:border-gray-400 hover:bg-gray-50"
        >
          <h2 className="text-2xl font-semibold mb-2">
            Contact Us
            <span className="inline-block transition-transform group-hover:translate-x-1 ml-2">-&gt;</span>
          </h2>
          <p className="text-gray-500">
            Have questions? Get in touch with us to learn more or get involved.
          </p>
        </a>
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
