import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Paths to your JSON files
    const seasonsFilePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'seasonsScrapedData.json');
    const premierFilePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'premierScrapedData.json');
    const laborFilePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'laborScrapedData.json');
    const njFilePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'njScrapedData.json'); // NJ Skateshop

    // Read and parse data from all files
    const seasonsData = fs.existsSync(seasonsFilePath) ? JSON.parse(fs.readFileSync(seasonsFilePath, 'utf-8')) : [];
    const premierData = fs.existsSync(premierFilePath) ? JSON.parse(fs.readFileSync(premierFilePath, 'utf-8')) : [];
    const laborData = fs.existsSync(laborFilePath) ? JSON.parse(fs.readFileSync(laborFilePath, 'utf-8')) : [];
    const njData = fs.existsSync(njFilePath) ? JSON.parse(fs.readFileSync(njFilePath, 'utf-8')) : []; // NJ Skateshop data

    // Combine the products into one array
    const products = [...seasonsData, ...premierData, ...laborData, ...njData]; // Include NJ Skateshop data

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error reading the JSON file:', error);
    return NextResponse.json({ message: 'Failed to load products' }, { status: 500 });
  }
}
