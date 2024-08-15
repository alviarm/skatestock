const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeSeasonsSkateShop() {
  const url = 'https://seasonsskateshop.com/collections/sale-items';

  try {
    // Fetch the HTML of the page
    const { data } = await axios.get(url);

    // Load the HTML into cheerio
    const $ = cheerio.load(data);

    // Array to store the scraped products
    const products = [];

    // Select the product elements and iterate over them
    $('a.full-unstyled-link').each((index, element) => {
      const link = $(element).attr('href');
      const title = $(element).attr('aria-labelledby');
      
      // Optional: You may need to find the image and price using different selectors within the same structure
      const image = $(element).find('img').attr('src'); // Adjust if needed
      const price = $(element).find('.product-card__price').text().trim(); // Adjust if needed

      products.push({
        title,  // This might not be the actual title, adjust based on what 'aria-labelledby' points to
        price,
        link: `https://seasonsskateshop.com${link}`,
        image,
      });
    });

    console.log(products);
  } catch (error) {
    console.error('Error fetching the data:', error);
  }
}

// Run the scraper
scrapeSeasonsSkateShop();
