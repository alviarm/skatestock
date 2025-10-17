#!/usr/bin/env node

const { runAllScrapers } = require("./scrapers");

async function main() {
  console.log("Starting SkateStock scrapers...");

  try {
    const results = await runAllScrapers();

    console.log("\n--- Scraper Results ---");
    results.forEach((result) => {
      if (result.success) {
        console.log(`✅ ${result.name}: Success`);
      } else {
        console.log(`❌ ${result.name}: Failed - ${result.error}`);
      }
    });

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n--- Summary ---`);
    console.log(`Successful scrapers: ${successful}/${results.length}`);
    if (failed > 0) {
      console.log(`Failed scrapers: ${failed}/${results.length}`);
    }
  } catch (error) {
    console.error("Error running scrapers:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
