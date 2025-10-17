const fs = require("fs");
const path = require("path");

// Import all scraper functions
const { scrapeSeasonsSkateShop } = require("./seasonsScraper");
const { scrapePremierStore } = require("./premierScraper");
const { scrapeLaborSkateShop } = require("./laborScraper");
const { scrapeNJSkateShop } = require("./njScraper");
const { scrapeBlackSheepSkateShop } = require("./blacksheepScraper");

// Configuration
const CONFIG = {
  OUTPUT_DIR: path.join(process.cwd(), "src", "app", "api", "scraped-data"),
  SCRAPERS: [
    { name: "Seasons", func: scrapeSeasonsSkateShop },
    { name: "Premier", func: scrapePremierStore },
    { name: "Labor", func: scrapeLaborSkateShop },
    { name: "NJ", func: scrapeNJSkateShop },
    { name: "BlackSheep", func: scrapeBlackSheepSkateShop },
  ],
};

// Utility functions
const logger = {
  info: (message) =>
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`),
  warn: (message) =>
    console.log(`[WARN] ${new Date().toISOString()} - ${message}`),
  error: (message) =>
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`),
};

// Ensure output directory exists
const ensureOutputDir = () => {
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    logger.info(`Created output directory: ${CONFIG.OUTPUT_DIR}`);
  }
};

// Run all scrapers with error handling and retry logic
const runAllScrapers = async () => {
  ensureOutputDir();
  logger.info("Starting all scrapers...");

  const results = [];

  for (const { name, func } of CONFIG.SCRAPERS) {
    try {
      logger.info(`Starting ${name} scraper...`);
      await func();
      logger.info(`${name} scraper completed successfully`);
      results.push({ name, success: true });
    } catch (error) {
      logger.error(`Error in ${name} scraper: ${error.message}`);
      results.push({ name, success: false, error: error.message });
    }
  }

  logger.info("All scrapers completed");
  return results;
};

// Run individual scraper
const runScraper = async (scraperName) => {
  const scraper = CONFIG.SCRAPERS.find(
    (s) => s.name.toLowerCase() === scraperName.toLowerCase()
  );
  if (!scraper) {
    throw new Error(`Scraper '${scraperName}' not found`);
  }

  ensureOutputDir();
  logger.info(`Starting ${scraper.name} scraper...`);
  await scraper.func();
  logger.info(`${scraper.name} scraper completed`);
};

module.exports = {
  runAllScrapers,
  runScraper,
  CONFIG,
  logger,
};
