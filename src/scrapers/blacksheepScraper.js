const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function scrapeBlackSheepSkateShop() {
  const baseUrl =
    "https://blacksheepskateshop.com/collections/sale/products.json";
  let page = 1;
  let products = [];
  let hasMoreProducts = true;

  while (hasMoreProducts) {
    try {
      const url = `${baseUrl}?page=${page}`;
      console.log(`Scraping Black Sheep Skate Shop - Page ${page}: ${url}`);

      const { data } = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36",
          Accept: "application/json",
        },
      });

      if (!data.products || data.products.length === 0) {
        hasMoreProducts = false;
        console.log("No more products found. Ending scrape.");
        break;
      }

      data.products.forEach((product) => {
        const variants = product.variants || [];
        let originalPrice = "No original price found";
        let salePrice = "No sale price found";

        if (variants.length > 0) {
          // Find the variant with the largest compare_at_price (original price)
          const variantWithOriginalPrice = variants.reduce((prev, current) =>
            parseFloat(current.compare_at_price || 0) >
            parseFloat(prev.compare_at_price || 0)
              ? current
              : prev
          );

          // Use the first variant as fallback
          const firstVariant = variants[0];

          originalPrice = variantWithOriginalPrice.compare_at_price
            ? `$${parseFloat(variantWithOriginalPrice.compare_at_price).toFixed(
                2
              )}`
            : `$${parseFloat(firstVariant.price).toFixed(2)}`;

          salePrice = `$${parseFloat(firstVariant.price).toFixed(2)}`;
        }

        const image =
          product.images && product.images.length > 0
            ? product.images[0].src.replace(/^\/\//, "https://")
            : "No image found";

        products.push({
          productId: product.id || "No ID found",
          title: product.title || "No title found",
          originalPrice,
          salePrice,
          link: `https://blacksheepskateshop.com/products/${product.handle}`,
          image: image,
          productType: product.product_type || "No type found",
        });
      });

      console.log(
        `Page ${page} scraped successfully. Found ${data.products.length} products.`
      );
      page++;
    } catch (error) {
      console.error(`Error scraping page ${page}:`, error.message);
      hasMoreProducts = false;
    }
  }

  // Save scraped data
  const filePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "scraped-data",
    "blacksheepScrapedData.json"
  );

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
  console.log(`Black Sheep Skate Shop data saved to ${filePath}`);
}

module.exports = { scrapeBlackSheepSkateShop };
