const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const JSON5 = require("json5");

/**
 * Function to scrape price, link, and image from Seasons Skate Shop
 */
async function scrapeSeasonsSkateShop() {
  const baseUrl = "https://seasonsskateshop.com/collections/sale-items";
  let page = 1;
  const products = [];
  const maxPages = 20;

  while (page <= maxPages) {
    try {
      const url = `${baseUrl}?page=${page}`;
      console.log(`Scraping Data - Page ${page}: ${url}`);
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      const productElements = $("li.grid__item");
      if (productElements.length === 0) {
        console.log("No more products found. Ending pagination.");
        break;
      }

      // Extract JSON-like data from the script tag
      const scriptContent = $("script")
        .toArray()
        .map((script) => $(script).html())
        .find((script) => script && script.includes("var meta"));

      const productTypes = {};

      if (scriptContent) {
        const metaMatch = scriptContent.match(/var meta\s*=\s*(\{[\s\S]*?\});/);
        if (metaMatch) {
          try {
            const metaText = metaMatch[1];
            const metaData = JSON5.parse(metaText);

            const productsArray = metaData.products;
            productsArray.forEach((product) => {
              const productId = product.id;
              const productType = product.type || "No type found";
              productTypes[productId] = productType;
            });
          } catch (parseError) {
            console.error("Error parsing the meta JSON data:", parseError);
          }
        } else {
          console.error("No valid meta data found in the script content.");
        }
      } else {
        console.error('No script tag containing "var meta" found.');
      }

      productElements.each((index, element) => {
        const title = $(element)
          .find("a.full-unstyled-link")
          .first()
          .text()
          .trim()
          .replace(/\s+/g, " ");

        const relativeLink = $(element)
          .find("a.full-unstyled-link")
          .attr("href");
        const link = relativeLink
          ? `https://seasonsskateshop.com${relativeLink}`
          : "No link found";

        const imageSrc =
          $(element).find("img").attr("data-src") ||
          $(element).find("img").attr("src");
        const image = imageSrc ? `https:${imageSrc}` : "No image found";

        const priceText = $(element)
          .find(".price__sale .price-item--sale")
          .text()
          .replace(/\s+/g, " ")
          .trim();

        const salePrice = priceText || "No sale price found";

        // Extract numeric product ID
        const productIdAttr = $(element)
          .find("a.full-unstyled-link")
          .attr("id");
        const numericProductIdMatch = productIdAttr
          ? productIdAttr.match(/product-grid-(\d+)/)
          : null;
        const numericProductId = numericProductIdMatch
          ? parseInt(numericProductIdMatch[1], 10)
          : null;

        // Use `productTypes` dictionary or fallback to extracting from HTML
        let productType =
          numericProductId && productTypes[numericProductId]
            ? productTypes[numericProductId]
            : "No type found";

        if (productType === "No type found") {
          productType =
            $(element).find(".product__type").text().trim() || "No type found";
        }

        products.push({
          productId: numericProductId || "No ID found",
          title: title || "No title found",
          salePrice: salePrice,
          link: link,
          image: image,
          productType: productType,
        });
      });

      console.log(`Data - Page ${page} scraped successfully.`);
      page++;
    } catch (error) {
      console.error(
        "Error fetching the data from Seasons Skate Shop:",
        error.message
      );
      break;
    }
  }

  // Save scraped data to a JSON file
  const filePath = path.join(
    process.cwd(),
    "src",
    "app",
    "api",
    "scraped-data",
    "seasonsScrapedData.json"
  );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
  console.log(`Data from Seasons Skate Shop saved to ${filePath}`);
}

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

  while (hasMoreProducts) {
    try {
      const url = `${baseUrl}?page=${page}`;
      console.log(`Fetching data from ${url}`);

      const { data } = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
          Accept: "application/json",
        },
      });

      if (data.products && data.products.length > 0) {
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

          product.variants.forEach((variant) => {
            const variantPrice = parseFloat(variant.price);
            const variantCompareAtPrice = variant.compare_at_price
              ? parseFloat(variant.compare_at_price)
              : null;

            if (minPrice === null || variantPrice < minPrice) {
              minPrice = variantPrice;
            }

            if (
              variantCompareAtPrice &&
              (maxCompareAtPrice === null ||
                variantCompareAtPrice > maxCompareAtPrice)
            ) {
              maxCompareAtPrice = variantCompareAtPrice;
            }
          });

          salePrice =
            minPrice !== null
              ? `$${minPrice.toFixed(2)}`
              : "No sale price found";
          originalPrice =
            maxCompareAtPrice !== null
              ? `$${maxCompareAtPrice.toFixed(2)}`
              : salePrice;

          // Construct the product link
          const link = `https://thepremierstore.com/products/${product.handle}`;

          // Image URL handling
          let image = "No image found";
          if (product.images && product.images.length > 0) {
            image = product.images[0].src || "No image found";
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
          `Fetched ${data.products.length} products from page ${page}`
        );
        page++;
      } else {
        hasMoreProducts = false;
        console.log("No more products found. Ending scrape.");
      }
    } catch (error) {
      console.error("Error fetching product data:", error.message);
      hasMoreProducts = false;
    }
  }

  if (products.length === 0) {
    console.log("No products were scraped.");
    return;
  }

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
    fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
    console.log(`\nScraped data from Premier Store saved to ${filePath}`);
  } catch (writeError) {
    console.error("Error writing the scraped data to file:", writeError);
  }
}

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

async function runScrapers() {
  await scrapeSeasonsSkateShop();
  await scrapePremierStore();
  await scrapeLaborSkateShop();
  await scrapeNJSkateShop();
  await scrapeBlackSheepSkateShop();
}

runScrapers();
