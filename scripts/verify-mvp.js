#!/usr/bin/env node
/**
 * SkateStock MVP Verification Script
 * Tests that all core components are working
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(description, test) {
  try {
    const result = test();
    if (result) {
      log(`✓ ${description}`, 'green');
      return true;
    } else {
      log(`✗ ${description}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ ${description} - ${error.message}`, 'red');
    return false;
  }
}

async function runMVPChecks() {
  log('\n=== SkateStock MVP Verification ===\n', 'yellow');
  
  let passed = 0;
  let total = 0;
  
  // 1. Frontend checks
  log('Frontend Checks:', 'yellow');
  total++;
  if (check('page.tsx exists', () => fs.existsSync('src/app/page.tsx'))) passed++;
  
  total++;
  if (check('page.tsx has export', () => {
    const content = fs.readFileSync('src/app/page.tsx', 'utf-8');
    return content.includes('export default function Home()');
  })) passed++;
  
  total++;
  if (check('layout.tsx exists', () => fs.existsSync('src/app/layout.tsx'))) passed++;
  
  // 2. API checks
  log('\nAPI Checks:', 'yellow');
  total++;
  if (check('API route exists', () => fs.existsSync('src/app/api/scraped-data/route.ts'))) passed++;
  
  total++;
  if (check('dataValidation.js exists', () => fs.existsSync('src/utils/dataValidation.js'))) passed++;
  
  total++;
  if (check('dataValidation.js is valid JS', () => {
    require('../src/utils/dataValidation.js');
    return true;
  })) passed++;
  
  // 3. Scraper checks
  log('\nScraper Checks:', 'yellow');
  total++;
  if (check('scrapers/index.js exists', () => fs.existsSync('src/scrapers/index.js'))) passed++;
  
  total++;
  if (check('All 5 scrapers exist', () => {
    const scrapers = ['seasons', 'premier', 'labor', 'nj', 'blacksheep'];
    return scrapers.every(s => fs.existsSync(`src/scrapers/${s}Scraper.js`));
  })) passed++;
  
  total++;
  if (check('Scrapers can be loaded', () => {
    const { runAllScrapers } = require('../src/scrapers');
    return typeof runAllScrapers === 'function';
  })) passed++;
  
  total++;
  if (check('runScrapers.js exists', () => fs.existsSync('src/runScrapers.js'))) passed++;
  
  // 4. Data checks
  log('\nData Checks:', 'yellow');
  total++;
  if (check('Product data files exist', () => {
    return fs.existsSync('src/app/api/scraped-data/seasonsScrapedData.json');
  })) passed++;
  
  total++;
  if (check('Product data is valid JSON', () => {
    const files = ['seasonsScrapedData.json', 'premierScrapedData.json'];
    return files.every(f => {
      const data = JSON.parse(fs.readFileSync(`src/app/api/scraped-data/${f}`, 'utf-8'));
      return Array.isArray(data);
    });
  })) passed++;
  
  // 5. Configuration checks
  log('\nConfiguration Checks:', 'yellow');
  total++;
  if (check('package.json exists', () => fs.existsSync('package.json'))) passed++;
  
  total++;
  if (check('docker-compose.yml exists', () => fs.existsSync('docker-compose.yml'))) passed++;
  
  total++;
  if (check('Required dependencies in package.json', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    return pkg.dependencies && 
           pkg.dependencies.next && 
           pkg.dependencies.react &&
           pkg.dependencies.axios &&
           pkg.dependencies.cheerio;
  })) passed++;
  
  // Summary
  log('\n=== Summary ===', 'yellow');
  const percentage = Math.round((passed / total) * 100);
  log(`${passed}/${total} checks passed (${percentage}%)`, percentage === 100 ? 'green' : 'yellow');
  
  if (percentage === 100) {
    log('\n✅ MVP is ready!', 'green');
    log('\nTo start the application:', 'yellow');
    log('  1. npm install');
    log('  2. npm run dev');
    log('  3. Open http://localhost:3000');
    log('\nTo run scrapers:');
    log('  npm run scrape');
    return 0;
  } else {
    log('\n⚠️  Some checks failed. Review the output above.', 'yellow');
    return 1;
  }
}

if (require.main === module) {
  runMVPChecks().then(code => process.exit(code));
}

module.exports = { runMVPChecks };
