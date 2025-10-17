const fs = require("fs");
const path = require("path");
const axios = require("axios");

async function scrapeLaborSkateShop() {
  const collectionUrl =
    "https://laborskateshop.com/collections/sale/products.json";
  let page = 1;
  let products = [];
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const url = `${collectionUrl}?page=${page}`;
      console.log(`Fetching Labor Skate Shop - Page ${page}: ${url}`);
      const response = await axios.get(url);
      const data = response.data;

      if (!data.products || data.products.length === 0) {
        hasMorePages = false;
        break;
      }

      data.products.forEach((product) => {
        const productId = product.id;
        const productType = product.product_type || "No product type found";
        const title = product.title || "No title found";
        const variants = product.variants || [];
        let originalPrice = "No original price found";
        let salePrice = "No sale price found";

        if (variants.length > 0) {
          const variant = variants[0];
          originalPrice =
            variant.compare_at_price !== null
              ? `$${variant.compare_at_price}`
              : "No original price found";
          salePrice = variant.price
            ? `$${variant.price}`
            : "No sale price found";
        } else {
          originalPrice = "No original price found";
          salePrice = "No sale price found";
        }

        const link = product.handle
          ? `https://laborskateshop.com/products/${product.handle}`
          : "No link found";
        const image =
          product.images && product.images.length > 0
            ? product.images[0].src
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

      page++;
    } catch (error) {
      console.error(
        `Error fetching page ${page} from Labor Skate Shop API:`,
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
    "laborScrapedData.json"
  );
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
  console.log(`Scraped data from Labor Skate Shop saved to ${filePath}`);
}

module.exports = { scrapeLaborSkateShop };
