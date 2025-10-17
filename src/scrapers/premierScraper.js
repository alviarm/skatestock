const fs = require("fs");
const path = require("path");
const axios = require("axios");

/**
 * Extracts JSON data from a script tag containing a specific event.
 * @param {string} scriptContent - The content of the script tag.
 * @param {string} eventName - The name of the event to search for (e.g., "collection_viewed").
 * @returns {object|null} - Parsed JSON object or null if not found/error.
 */
function extractJSONFromScript(scriptContent, eventName) {
  const regex = new RegExp(`${eventName}",\\s*(\\{[\\s\\S]*?\\})\\);?`);
  const match = scriptContent.match(regex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      console.error(`Error parsing JSON for event "${eventName}":`, error);
      return null;
    }
  }
  return null;
}

async function scrapePremierStore() {
  const baseUrl = "https://thepremierstore.com/collections/sale/products.json";
  let page = 1;
  let products = [];
  let hasMoreProducts = true;
  const maxPages = 20; // Safety limit to prevent infinite loops

  console.log("Starting Premier Store scraper...");

  while (hasMoreProducts && page <= maxPages) {
    try {
      const url = `${baseUrl}?page=${page}`;
      console.log(`Fetching data from ${url}`);

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
        },
        timeout: 10000, // 10 second timeout
      });

      const data = response.data;

      // Check if we got valid data and products array
      if (data && data.products && Array.isArray(data.products)) {
        if (data.products.length > 0) {
          console.log(`Found ${data.products.length} products on page ${page}`);

          data.products.forEach((product) => {
            const productId = product.id || "No product ID found";
            const productType = product.product_type || "No product type found";
            const title = product.title || "No title found";
            const vendor = product.vendor || "No vendor found";

            // Prices handling
            let originalPrice = "No original price found";
            let salePrice = "No sale price found";

            // Get the lowest price among the variants
            let minPrice = null;
            let maxCompareAtPrice = null;

            if (product.variants && Array.isArray(product.variants)) {
              product.variants.forEach((variant) => {
                const variantPrice = parseFloat(variant.price);
                const variantCompareAtPrice = variant.compare_at_price
                  ? parseFloat(variant.compare_at_price)
                  : null;

                if (
                  !isNaN(variantPrice) &&
                  (minPrice === null || variantPrice < minPrice)
                ) {
                  minPrice = variantPrice;
                }

                if (
                  variantCompareAtPrice &&
                  !isNaN(variantCompareAtPrice) &&
                  (maxCompareAtPrice === null ||
                    variantCompareAtPrice > maxCompareAtPrice)
                ) {
                  maxCompareAtPrice = variantCompareAtPrice;
                }
              });
            }

            salePrice =
              minPrice !== null
                ? `$${minPrice.toFixed(2)}`
                : "No sale price found";
            originalPrice =
              maxCompareAtPrice !== null
                ? `$${maxCompareAtPrice.toFixed(2)}`
                : salePrice;

            // Construct the product link
            const link = product.handle
              ? `https://thepremierstore.com/products/${product.handle}`
              : "No link found";

            // Image URL handling
            let image = "No image found";
            if (
              product.images &&
              product.images.length > 0 &&
              product.images[0].src
            ) {
              image = product.images[0].src;
            }

            products.push({
              productId,
              productType,
              title: `${vendor} ${title}`.trim(),
              originalPrice,
              salePrice,
              link,
              image,
            });
          });

          console.log(
            `Successfully processed ${data.products.length} products from page ${page}`
          );
          page++;
        } else {
          // No products on this page, we've reached the end
          console.log(`No products found on page ${page}. Ending scrape.`);
          hasMoreProducts = false;
        }
      } else {
        console.log(`Invalid data structure on page ${page}. Ending scrape.`);
        hasMoreProducts = false;
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
      // Continue to next page instead of stopping completely
      page++;

      // If we've had too many errors, stop scraping
      if (page > maxPages) {
        hasMoreProducts = false;
      }
    }
  }

  if (products.length === 0) {
    console.log("No products were scraped from Premier Store.");
    return { success: false, productCount: 0 };
  }

  // Remove duplicates based on productId
  const uniqueProducts = products.filter(
    (product, index, self) =>
      index === self.findIndex((p) => p.productId === product.productId)
  );

  console.log(
    `Total products scraped: ${uniqueProducts.length} (removed ${
      products.length - uniqueProducts.length
    } duplicates)`
  );

  // Define the file path for saving the scraped data
  const filePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "scraped-data",
    "premierScrapedData.json"
  );

  // Ensure the directory exists
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  // Write the scraped data to the JSON file
  try {
    fs.writeFileSync(
      filePath,
      JSON.stringify(uniqueProducts, null, 2),
      "utf-8"
    );
    console.log(`Scraped data from Premier Store saved to ${filePath}`);
    return { success: true, productCount: uniqueProducts.length };
  } catch (writeError) {
    console.error("Error writing the scraped data to file:", writeError);
    return { success: false, productCount: 0, error: writeError.message };
  }
}

module.exports = { scrapePremierStore, extractJSONFromScript };
