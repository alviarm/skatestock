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

      const productElements = $('a.full-unstyled-link');
      if (productElements.length === 0) {
        hasMorePages = false;
        break;
      }

      const scriptContent = $('script')
        .toArray()
        .map(script => $(script).html())
        .find(script => script.includes('"product":{"title"'));

      if (scriptContent) {
        const jsonDataMatch = scriptContent.match(/\{"collection":\{"id".+?\}\}\);/s);

        if (jsonDataMatch) {
          let jsonString = jsonDataMatch[0];
          jsonString = jsonString.replace(/\);$/, '');

          try {
            const jsonData = JSON.parse(jsonString);

            jsonData.collection.productVariants.forEach(item => {
              products.push({
                title: item.product.title || 'No title found',
                price: `${item.price.amount} ${item.price.currencyCode}` || 'No price found',
                link: `https://seasonsskateshop.com${item.product.url}` || 'No link found',
                image: item.image.src ? `https:${item.image.src}` : 'No image found',
              });
            });
          } catch (parseError) {
            console.error('Error parsing the JSON data:', parseError);
            console.log("Cleaned JSON String:\n", jsonString);
          }
        } else {
          console.error('No valid JSON data found in the script content');
        }
      }

      page++;
    } catch (error) {
      console.error('Error fetching the data from Seasons Skate Shop:', error);
      hasMorePages = false;
    }
  }

  const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'scrapedData.json');
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
      console.log(`Scraping page ${page}: ${url}`);
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      // Select the product elements
      const productElements = $('.grid__item'); // Adjust the selector based on inspection

      if (productElements.length === 0) {
        console.log('No products found on this page.');
        hasMorePages = false;
        break;
      }

      // Scrape product details
      productElements.each((index, element) => {
        const title = $(element).find('.grid-product__title').text().trim();

        // Extract and clean up the sale price
        const priceElement = $(element).find('.price__sale .price-item');
        let price = priceElement.text().trim();
        price = price.replace(/\s+/g, ' '); // Replace multiple spaces and newlines with a single space

        const link = `https://thepremierstore.com${$(element).find('a').attr('href')}`;
        const image = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');

        products.push({
          title: title || 'No title found',
          price: price || 'No price found',
          link: link || 'No link found',
          image: image ? `https:${image}` : 'No image found',
        });
      });

      // Check if there are more pages to scrape
      hasMorePages = $('.pagination__next').length > 0;
      page++;
    } catch (error) {
      console.error('Error fetching the data:', error);
      hasMorePages = false;
    }
  }

  // Save the scraped data to a JSON file
  const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'premierScrapedData.json');
  fs.writeFileSync(filePath, JSON.stringify(products, null, 2), 'utf-8');
  console.log(`Scraped data saved to ${filePath}`);
}

// Run the scrapers sequentially
async function runScrapers() {
  await scrapeSeasonsSkateShop();
  await scrapePremierStore();
}

runScrapers();
