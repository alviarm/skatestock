const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const JSON5 = require("json5");
const {
  validateProduct,
  normalizeProduct,
} = require("../utils/dataValidation");

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

        // Create product object
        let product = {
          productId: numericProductId || "No ID found",
          title: title || "No title found",
          salePrice: salePrice,
          link: link,
          image: image,
          productType: productType,
        };

        // Validate and normalize product data
        product = normalizeProduct(product, "Seasons");

        products.push(product);
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

module.exports = { scrapeSeasonsSkateShop };
