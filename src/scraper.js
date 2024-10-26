// Below is currently working scraper logic


// const fs = require('fs');
// const path = require('path');
// const axios = require('axios');
// const cheerio = require('cheerio');

// async function scrapeSeasonsSkateShop() {
//   const baseUrl = 'https://seasonsskateshop.com/collections/sale-items';
//   let page = 1;
//   let products = [];
//   let hasMorePages = true;

//   while (hasMorePages) {
//     try {
//       const url = `${baseUrl}?page=${page}`;
//       console.log(`Scraping page ${page}: ${url}`);
//       const { data } = await axios.get(url);
//       const $ = cheerio.load(data);

//       // Check if there are products on the page
//       const productElements = $('a.full-unstyled-link');
//       if (productElements.length === 0) {
//         hasMorePages = false;
//         break;
//       }

//       // Extract JSON-like data from the script tag
//       const scriptContent = $('script')
//         .toArray()
//         .map(script => $(script).html())
//         .find(script => script.includes('"product":{"title"'));

//       if (scriptContent) {
//         const jsonDataMatch = scriptContent.match(/\{"collection":\{"id".+?\}\}\);/s);

//         if (jsonDataMatch) {
//           let jsonString = jsonDataMatch[0];
//           jsonString = jsonString.replace(/\);$/, '');

//           try {
//             const jsonData = JSON.parse(jsonString);

//             jsonData.collection.productVariants.forEach(item => {
//               products.push({
//                 title: item.product.title || 'No title found',
//                 price: `${item.price.amount} ${item.price.currencyCode}` || 'No price found',
//                 link: `https://seasonsskateshop.com${item.product.url}` || 'No link found',
//                 image: item.image.src ? `https:${item.image.src}` : 'No image found',
//               });
//             });
//           } catch (parseError) {
//             console.error('Error parsing the JSON data:', parseError);
//             console.log("Cleaned JSON String:\n", jsonString);
//           }
//         } else {
//           console.error('No valid JSON data found in the script content');
//         }
//       }

//       page++;
//     } catch (error) {
//       console.error('Error fetching the data:', error);
//       hasMorePages = false;
//     }
//   }

//   const path = require('path');
// const fs = require('fs');

// // Save the scraped data to a JSON file
// const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'scrapedData.json');
// fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf-8');
// console.log(`Scraped data saved to ${filePath}`);
// }

// // Run the scraper
// scrapeSeasonsSkateShop();

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// Function to scrape Seasons Skate Shop
async function scrapeSeasonsSkateShop() {
  const baseUrl = 'https://seasonsskateshop.com/collections/sale-items';
  let page = 1;
  let products = [];
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const url = `${baseUrl}?page=${page}`;
      console.log(`Scraping Seasons Skate Shop - Page ${page}: ${url}`);
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      const productElements = $('li.grid__item'); // Adjust selector if necessary
      if (productElements.length === 0) {
        hasMorePages = false;
        break;
      }

      productElements.each((index, element) => {
        // Clean the title to remove extra spaces and newlines
        let title = $(element).find('a.full-unstyled-link').first().text().trim();
        title = title.replace(/\s+/g, ' '); // Replace multiple spaces/newlines with a single space

        const link = `https://seasonsskateshop.com${$(element).find('a.full-unstyled-link').attr('href')}`;
        const image = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');

        // Using the CSS selector to extract the combined price text
        const priceText = $(element)
          .find('div:nth-child(3) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2)')
          .text()
          .replace(/\s+/g, ' ') // Replace multiple spaces and newlines with a single space
          .trim();

        let originalPrice = 'No original price found';
        let salePrice = 'No sale price found';

        // Extract the prices from the combined price text
        const priceMatches = priceText.match(/\$[\d,.]+/g);
        if (priceMatches && priceMatches.length > 1) {
          salePrice = priceMatches[0].trim(); // Sale price is the first matched price
          originalPrice = priceMatches[1].trim(); // Original price is the second matched price
        } else if (priceMatches && priceMatches.length === 1) {
          salePrice = priceMatches[0].trim(); // Assign the only matched price to salePrice
          const originalMatch = priceText.match(/Regular price\s*\$[\d,.]+/);
          if (originalMatch) {
            originalPrice = originalMatch[0].replace('Regular price', '').trim();
          }
        }

        products.push({
          title: title || 'No title found',
          originalPrice: originalPrice || 'No original price found',
          salePrice: salePrice || 'No sale price found',
          link: link || 'No link found',
          image: image ? `https:${image}` : 'No image found',
        });
      });

      page++;
    } catch (error) {
      console.error('Error fetching the data from Seasons Skate Shop:', error);
      hasMorePages = false;
    }
  }

  const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'seasonsScrapedData.json');
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf-8');
  console.log(`Scraped data from Seasons Skate Shop saved to ${filePath}`);
}

// Function to scrape Premier Store
async function scrapePremierStore() {
  const baseUrl = 'https://thepremierstore.com/collections/sale?filter.v.availability=1&sort_by=created-descending';
  let page = 1;
  let products = [];
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const url = `${baseUrl}&page=${page}`;
      console.log(`Scraping Premier Store - Page ${page}: ${url}`);
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      const productElements = $('li.grid__item');
      if (productElements.length === 0) {
        hasMorePages = false;
        break;
      }

      // Scrape product details
      productElements.each((index, element) => {
        const brand = $(element).find('div:nth-child(2) > a:nth-child(1) > div:nth-child(3) > div:nth-child(1) > div:nth-child(2)').text().trim();
        const productName = $(element).find('div:nth-child(2) > a:nth-child(1) > div:nth-child(3) > div:nth-child(1) > span:nth-child(3)').text().trim();

        // Extract and clean up prices
        let salePrice = $(element).find('.price__sale .price-item').text().trim();
        let originalPrice = $(element).find('.price__regular .price-item').text().trim();

        salePrice = salePrice.replace(/\s+/g, ' '); // Clean up spacing
        originalPrice = originalPrice.replace(/\s+/g, ' '); // Clean up spacing

        // If salePrice contains both the sale and original price (e.g., "$48.00 was $60.00")
        if (salePrice.includes('was')) {
          const prices = salePrice.split('was');
          salePrice = prices[0].trim(); // Sale price is before "was"
          originalPrice = prices[1].trim(); // Original price is after "was"
        }

        // If no sale price found, set the original price as the sale price
        if (!salePrice) {x
          salePrice = originalPrice;
          originalPrice = 'No original price found'; // Adjust this as needed
        }

        const link = `https://thepremierstore.com${$(element).find('a').attr('href')}`;
        const image = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');

        products.push({
          title: `${brand} ${productName}` || 'No title found',
          originalPrice: originalPrice || 'No original price found',
          salePrice: salePrice || 'No sale price found',
          link: link || 'No link found',
          image: image ? `https:${image}` : 'No image found',
        });
      });

      page++;
    } catch (error) {
      console.error('Error fetching the data from Premier Store:', error);
      hasMorePages = false;
    }
  }

  const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'premierScrapedData.json');
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf-8');
  console.log(`Scraped data from Premier Store saved to ${filePath}`);
}

// Function to scrape Labor Skate Shop
async function scrapeLaborSkateShop() {
  const baseUrl = 'https://laborskateshop.com/collections/sale';
  let page = 1;
  let products = [];
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const url = `${baseUrl}?page=${page}`;
      console.log(`Scraping Labor Skate Shop - Page ${page}: ${url}`);
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      // Use a more general attribute selector for product elements
      const productElements = $('[id^="CardLink-template--"]'); // Generalized selector
      if (productElements.length === 0) {
        hasMorePages = false;
        break;
      }

      productElements.each((index, element) => {
        // Use a general selector for the title
        let title = $(element).text().trim();
        title = title.replace(/\s+/g, ' '); // Clean title from extra spaces/newlines

        const link = `https://laborskateshop.com${$(element).attr('href')}`;
       
      // Extract the image URL
const imageElement = $(element).closest('li.grid__item').find('img');
let imageSrc = imageElement.attr('data-src') || imageElement.attr('src');

// Clean up image URL to ensure no double https:
if (imageSrc && imageSrc.startsWith('//')) {
  imageSrc = `${imageSrc.trim()}`; // Prepend https: if starting with //
} else if (imageSrc) {
  imageSrc = imageSrc.trim(); // Just trim if already starts with https or has correct URL
} else {
  imageSrc = 'No image found'; // Default case when no image is found
}

const image = imageSrc;


        // Use the given CSS selector to extract the price text
        const priceText = $(element)
        .closest('li.grid__item') // Navigate up to the parent grid item
        .find('div:nth-child(6) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(2)')
        .text()
        .trim()
        .replace(/\s+/g, ' '); // Clean price text

        let originalPrice = 'No original price found';
        let salePrice = 'No sale price found';

        // Extract prices from the cleaned-up price text
        const priceMatches = priceText.match(/\$[\d,.]+/g);
        if (priceMatches && priceMatches.length > 1) {
          // Sort prices to make sure the higher one is the original price and the lower one is the sale price
          const prices = priceMatches.map(price => parseFloat(price.replace('$', '')));
          if (prices[0] > prices[1]) {
            originalPrice = `$${prices[0]}`;
            salePrice = `$${prices[1]}`;
          } else {
            originalPrice = `$${prices[1]}`;
            salePrice = `$${prices[0]}`;
          }
        } else if (priceMatches && priceMatches.length === 1) {
          salePrice = priceMatches[0]; // Only sale price found
        }

        products.push({
          title: title || 'No title found',
          originalPrice: originalPrice || 'No original price found',
          salePrice: salePrice || 'No sale price found',
          link: link || 'No link found',
          image: image ? `https:${image}` : 'No image found',
        });
      });

      page++;
    } catch (error) {
      console.error('Error fetching the data from Labor Skate Shop:', error);
      hasMorePages = false;
    }
  }

  const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'laborScrapedData.json');
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf-8');
  console.log(`Scraped data from Labor Skate Shop saved to ${filePath}`);
}

// Function to scrape NJ Skate Shop with pagination
async function scrapeNJSkateShop() {
  const baseUrl = 'https://njskateshop.com/collections/sale';
  let page = 1;
  let products = [];
  let hasMorePages = true;

  while (hasMorePages) {
    try {
      const url = `${baseUrl}?page=${page}`;
      console.log(`Scraping NJ Skate Shop - Page ${page}: ${url}`);
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      // Select the product grid items
      const productElements = $('div.medium--one-quarter');

      if (productElements.length === 0) {
        hasMorePages = false;
        break;
      }

      productElements.each((index, element) => {
        // Extract the product title
        const titleElement = $(element).find('a:nth-child(1) > p:nth-child(2)');
        const title = titleElement.text().trim() || 'No title found';

        // Extract the product URL
        const linkElement = $(element).find('a:nth-child(1)');
        const link = linkElement.attr('href') ? `https://njskateshop.com${linkElement.attr('href')}` : 'No link found';

        // Extract image source
        const imageElement = $(element).find('img');
        const imageSrc = imageElement.attr('data-src') || imageElement.attr('src');
        const image = imageSrc ? `https:${imageSrc.replace('{width}', '500').trim()}` : 'No image found';

        // Extract original price using the provided CSS selector for price
        const priceElement = $(element).find('div:nth-child(3) > span:nth-child(1) > small:nth-child(2)');
        const originalPrice = priceElement.text().trim() || 'No original price found';

        // Calculate sale price (50% off)
        const salePrice = originalPrice !== 'No original price found'
          ? `$${(parseFloat(originalPrice.replace('$', '').replace(',', '')) / 2).toFixed(2)}`
          : 'No sale price found';

        // Push the extracted product data
        products.push({
          title,
          originalPrice,
          salePrice,
          link,
          image
        });
      });

      // Check if there are more pages by looking at the presence of products
      const nextPageButton = $('a.pagination__next').length > 0 || productElements.length > 0;

      if (!nextPageButton) {
        hasMorePages = false;
      } else {
        page++; // Increment page for the next iteration
      }
    } catch (error) {
      console.error('Error fetching the data from NJ Skate Shop:', error);
      hasMorePages = false;
    }
  }

  // Save the scraped data
  const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'njScrapedData.json');
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf-8');
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
