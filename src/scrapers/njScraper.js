const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function scrapeNJSkateShop() {
  const collectionUrl =
    "https://njskateshop.com/collections/sale/products.json";
  let page = 1;
  let products = [];
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const url = `${collectionUrl}?page=${page}`;
      console.log(`Fetching NJ Skate Shop - Page ${page}: ${url}`);
      const response = await axios.get(url);
      const data = response.data;

      if (!data.products || data.products.length === 0) {
        hasMorePages = false;
        break;
      }

      data.products.forEach((product) => {
        product.variants.forEach((variant) => {
          const productId = variant.id;
          const productType = product.product_type || "No product type found";
          const title = product.title || "No title found";
          let originalPrice = "No original price found";
          let salePrice = "No sale price found";

          if (
            variant.compare_at_price &&
            typeof variant.compare_at_price === "string" &&
            !isNaN(parseFloat(variant.compare_at_price))
          ) {
            const price = parseFloat(variant.compare_at_price);
            originalPrice = `$${price.toFixed(2)}`;
            salePrice = `$${(price * 0.6).toFixed(2)}`;
          } else if (
            variant.price &&
            typeof variant.price === "string" &&
            !isNaN(parseFloat(variant.price))
          ) {
            const price = parseFloat(variant.price);
            originalPrice = `$${price.toFixed(2)}`;
            salePrice = `$${(price * 0.6).toFixed(2)}`;
          } else {
            originalPrice = "No original price found";
            salePrice = "No sale price found";
          }

          const link = product.handle
            ? `https://njskateshop.com/products/${product.handle}`
            : "No link found";
          const image =
            product.images && product.images.length > 0
              ? product.images[0].src.replace(/^\/\//, "https://")
              : "No image found";

          products.push({
            productId,
            productType,
            title,
            originalPrice,
            salePrice,
            link,
            image,
          });
        });
      });

      page++;
    } catch (error) {
      console.error(
        `Error fetching page ${page} from NJ Skate Shop API:`,
        error
      );
      hasMorePages = false;
    }
  }

  const filePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "scraped-data",
    "njScrapedData.json"
  );
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
  console.log(`Scraped data from NJ Skate Shop saved to ${filePath}`);
}

module.exports = { scrapeNJSkateShop };
