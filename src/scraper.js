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

// // Updated function to scrape Premier Store with productId and productType
// async function scrapePremierStore() {
//   const baseUrl =
//     "https://thepremierstore.com/collections/sale?filter.v.availability=1&sort_by=created-descending";
//   let page = 1;
//   let products = [];
//   let hasMorePages = true;

//   while (hasMorePages) {
//     try {
//       const url = `${baseUrl}&page=${page}`;
//       console.log(`Scraping Premier Store - Page ${page}: ${url}`);
//       const { data } = await axios.get(url);
//       const $ = cheerio.load(data);

//       const productElements = $("li.grid__item");
//       if (productElements.length === 0) {
//         hasMorePages = false;
//         break;
//       }

//       // Scrape product details
//       productElements.each((index, element) => {
//         const brand = $(element)
//           .find(
//             "div:nth-child(2) > a:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2)"
//           )
//           .text()
//           .trim();
//         const productName = $(element)
//           .find(
//             "div:nth-child(2) > a:nth-child(1) > div:nth-child(3) > div:nth-child(1) > span:nth-child(3)"
//           )
//           .text()
//           .trim();

//         // Extract productId
//         const productId = $(element).attr("data-product-id");

//         // Use productId to extract product type
//         const productType = $(element)
//           .find(`[data-product-id='${productId}'] .some-product-type-class`) // Adjust selector as needed
//           .text()
//           .trim();

//         // Extract and clean up prices
//         let salePrice = $(element)
//           .find(".price__sale .price-item")
//           .text()
//           .trim();
//         let originalPrice = $(element)
//           .find(".price__regular .price-item")
//           .text()
//           .trim();

//         salePrice = salePrice.replace(/\s+/g, " "); // Clean up spacing
//         originalPrice = originalPrice.replace(/\s+/g, " "); // Clean up spacing

//         // If salePrice contains both the sale and original price (e.g., "$48.00 was $60.00")
//         if (salePrice.includes("was")) {
//           const prices = salePrice.split("was");
//           salePrice = prices[0].trim(); // Sale price is before "was"
//           originalPrice = prices[1].trim(); // Original price is after "was"
//         }

//         // If no sale price found, set the original price as the sale price
//         if (!salePrice) {
//           salePrice = originalPrice;
//           originalPrice = "No original price found"; // Adjust this as needed
//         }

//         const link = `https://thepremierstore.com${$(element)
//           .find("a")
//           .attr("href")}`;
//         const image =
//           $(element).find("img").attr("data-src") ||
//           $(element).find("img").attr("src");

//         products.push({
//           productId: productId || "No product ID found",
//           title: `${brand} ${productName}` || "No title found",
//           productType: productType || "No product type found",
//           originalPrice: originalPrice || "No original price found",
//           salePrice: salePrice || "No sale price found",
//           link: link || "No link found",
//           image: image ? `https:${image}` : "No image found",
//         });
//       });

//       page++;
//     } catch (error) {
//       console.error("Error fetching the data from Premier Store:", error);
//       hasMorePages = false;
//     }
//   }

//   const filePath = path.join(
//     process.cwd(),
//     "src",
//     "app",
//     "api",
//     "scraped-data",
//     "premierScrapedData.json"
//   );
//   fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
//   console.log(`Scraped data from Premier Store saved to ${filePath}`);
// }

// async function debugPremierStoreScripts() {
//   const url =
//     "https://thepremierstore.com/collections/sale?filter.v.availability=1&sort_by=created-descending";

//   try {
//     const { data } = await axios.get(url, {
//       headers: {
//         "User-Agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
//       },
//     });

//     const $ = cheerio.load(data);

//     const scriptTags = $("script");

//     scriptTags.each((i, elem) => {
//       const scriptContent = $(elem).html();
//       console.log(`\n--- Script Tag ${i} Content Start ---`);
//       console.log(scriptContent.substring(0, 500)); // Log first 500 characters
//       console.log(`--- Script Tag ${i} Content End ---\n`);
//     });
//   } catch (error) {
//     console.error("Error fetching scripts:", error.message);
//   }
// }

// debugPremierStoreScripts();

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

// // Function to scrape Labor Skate Shop
// async function scrapeLaborSkateShop() {
//   const baseUrl = "https://laborskateshop.com/collections/sale";
//   let page = 1;
//   let products = [];
//   let hasMorePages = true;

//   while (hasMorePages) {
//     try {
//       const url = `${baseUrl}?page=${page}`;
//       console.log(`Scraping Labor Skate Shop - Page ${page}: ${url}`);
//       const { data } = await axios.get(url);
//       const $ = cheerio.load(data);

//       // Use a more general attribute selector for product elements
//       const productElements = $('[id^="CardLink-template--"]'); // Generalized selector
//       if (productElements.length === 0) {
//         hasMorePages = false;
//         break;
//       }

//       productElements.each((index, element) => {
//         // Use a general selector for the title
//         let title = $(element).text().trim();
//         title = title.replace(/\s+/g, " "); // Clean title from extra spaces/newlines

//         const link = `https://laborskateshop.com${$(element).attr("href")}`;

//         // Extract the image URL
//         const imageElement = $(element).closest("li.grid__item").find("img");
//         let imageSrc =
//           imageElement.attr("data-src") || imageElement.attr("src");

//         // Clean up image URL to ensure no double https:
//         if (imageSrc && imageSrc.startsWith("//")) {
//           imageSrc = `${imageSrc.trim()}`; // Prepend https: if starting with //
//         } else if (imageSrc) {
//           imageSrc = imageSrc.trim(); // Just trim if already starts with https or has correct URL
//         } else {
//           imageSrc = "No image found"; // Default case when no image is found
//         }

//         const image = imageSrc;

//         // Use the given CSS selector to extract the price text
//         const priceText = $(element)
//           .closest("li.grid__item") // Navigate up to the parent grid item
//           .find(
//             "div:nth-child(6) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2)"
//           )
//           .text()
//           .trim()
//           .replace(/\s+/g, " "); // Clean price text

//         let originalPrice = "No original price found";
//         let salePrice = "No sale price found";

//         // Extract prices from the cleaned-up price text
//         const priceMatches = priceText.match(/\$[\d,.]+/g);
//         if (priceMatches && priceMatches.length > 1) {
//           // Sort prices to make sure the higher one is the original price and the lower one is the sale price
//           const prices = priceMatches.map((price) =>
//             parseFloat(price.replace("$", ""))
//           );
//           if (prices[0] > prices[1]) {
//             originalPrice = `$${prices[0]}`;
//             salePrice = `$${prices[1]}`;
//           } else {
//             originalPrice = `$${prices[1]}`;
//             salePrice = `$${prices[0]}`;
//           }
//         } else if (priceMatches && priceMatches.length === 1) {
//           salePrice = priceMatches[0]; // Only sale price found
//         }

//         products.push({
//           title: title || "No title found",
//           originalPrice: originalPrice || "No original price found",
//           salePrice: salePrice || "No sale price found",
//           link: link || "No link found",
//           image: image ? `https:${image}` : "No image found",
//         });
//       });

//       page++;
//     } catch (error) {
//       console.error("Error fetching the data from Labor Skate Shop:", error);
//       hasMorePages = false;
//     }
//   }

//   const filePath = path.join(
//     process.cwd(),
//     "src",
//     "app",
//     "api",
//     "scraped-data",
//     "laborScrapedData.json"
//   );
//   fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
//   console.log(`Scraped data from Labor Skate Shop saved to ${filePath}`);
// }

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

// // Function to scrape NJ Skate Shop with pagination
// async function scrapeNJSkateShop() {
//   const baseUrl = "https://njskateshop.com/collections/sale";
//   let page = 1;
//   let products = [];
//   let hasMorePages = true;

//   while (hasMorePages) {
//     try {
//       const url = `${baseUrl}?page=${page}`;
//       console.log(`Scraping NJ Skate Shop - Page ${page}: ${url}`);
//       const { data } = await axios.get(url);
//       const $ = cheerio.load(data);

//       // Select the product grid items
//       const productElements = $("div.medium--one-quarter");

//       if (productElements.length === 0) {
//         hasMorePages = false;
//         break;
//       }

//       productElements.each((index, element) => {
//         // Extract the product title
//         const titleElement = $(element).find("a:nth-child(1) > p:nth-child(2)");
//         const title = titleElement.text().trim() || "No title found";

//         // Extract the product URL
//         const linkElement = $(element).find("a:nth-child(1)");
//         const link = linkElement.attr("href")
//           ? `https://njskateshop.com${linkElement.attr("href")}`
//           : "No link found";

//         // Extract image source
//         const imageElement = $(element).find("img");
//         const imageSrc =
//           imageElement.attr("data-src") || imageElement.attr("src");
//         const image = imageSrc
//           ? `https:${imageSrc.replace("{width}", "500").trim()}`
//           : "No image found";

//         // Extract original price using the provided CSS selector for price
//         const priceElement = $(element).find(
//           "div:nth-child(3) > span:nth-child(1) > small:nth-child(2)"
//         );
//         const originalPrice =
//           priceElement.text().trim() || "No original price found";

//         // Calculate sale price (40% off)
//         const salePrice =
//           originalPrice !== "No original price found"
//             ? `$${(
//                 parseFloat(originalPrice.replace("$", "").replace(",", "")) *
//                 0.6
//               ).toFixed(2)}`
//             : "No sale price found";

//         // Push the extracted product data
//         products.push({
//           title,
//           originalPrice,
//           salePrice,
//           link,
//           image,
//         });
//       });

//       // Check if there are more pages by looking at the presence of products
//       const nextPageButton =
//         $("a.pagination__next").length > 0 || productElements.length > 0;

//       if (!nextPageButton) {
//         hasMorePages = false;
//       } else {
//         page++; // Increment page for the next iteration
//       }
//     } catch (error) {
//       console.error("Error fetching the data from NJ Skate Shop:", error);
//       hasMorePages = false;
//     }
//   }

//   // Save the scraped data
//   const filePath = path.join(
//     process.cwd(),
//     "src",
//     "app",
//     "api",
//     "scraped-data",
//     "njScrapedData.json"
//   );
//   fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
//   console.log(`Scraped data from NJ Skate Shop saved to ${filePath}`);
// }

// async function scrapeNJSkateShop() {
//   const collectionUrl =
//     "https://njskateshop.com/collections/sale/products.json";
//   let page = 1;
//   let products = [];
//   let hasMorePages = true;

//   while (hasMorePages) {
//     try {
//       const url = `${collectionUrl}?page=${page}`;
//       console.log(`Fetching NJ Skate Shop - Page ${page}: ${url}`);
//       const response = await axios.get(url);
//       const data = response.data;

//       if (!data.products || data.products.length === 0) {
//         hasMorePages = false;
//         break;
//       }

//       data.products.forEach((product) => {
//         const productId = product.id;
//         const productType = product.product_type || "No product type found";
//         const title = product.title || "No title found";
//         const variants = product.variants || [];
//         let minOriginalPrice = Infinity;

//         variants.forEach((variant) => {
//           if (
//             variant.price &&
//             variant.price.amount !== null &&
//             typeof variant.price.amount === "number" &&
//             !isNaN(variant.price.amount)
//           ) {
//             if (variant.price.amount < minOriginalPrice) {
//               minOriginalPrice = variant.price.amount;
//             }
//           }
//         });

//         const originalPrice =
//           minOriginalPrice !== Infinity
//             ? `$${minOriginalPrice.toFixed(2)}`
//             : "No original price found";
//         const salePrice =
//           minOriginalPrice !== Infinity
//             ? `$${(minOriginalPrice * 0.6).toFixed(2)}`
//             : "No sale price found";

//         const link = product.handle
//           ? `https://njskateshop.com/products/${product.handle}`
//           : "No link found";
//         const image =
//           product.images && product.images.length > 0
//             ? product.images[0].src.replace(/^\/\//, "https://")
//             : "No image found";

//         products.push({
//           productId,
//           productType,
//           title,
//           originalPrice,
//           salePrice,
//           link,
//           image,
//         });
//       });

//       page++;
//     } catch (error) {
//       console.error(
//         `Error fetching page ${page} from NJ Skate Shop API:`,
//         error
//       );
//       hasMorePages = false;
//     }
//   }

//   const filePath = path.join(
//     process.cwd(),
//     "src",
//     "app",
//     "api",
//     "scraped-data",
//     "njScrapedData.json"
//   );
//   fs.writeFileSync(filePath, JSON.stringify(products, null, 2), "utf-8");
//   console.log(`Scraped data from NJ Skate Shop saved to ${filePath}`);
// }

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
// Run the scrapers sequentially
async function runScrapers() {
  await scrapeSeasonsSkateShop();
  await scrapePremierStore();
  await scrapeLaborSkateShop(); // Add this line to include Labor Skate Shop
  await scrapeNJSkateShop();
}

runScrapers();
