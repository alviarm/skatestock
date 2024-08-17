import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Adjust the path according to the location of 'scrapedData.json'
    const filePath = path.join(process.cwd(), 'src', 'app', 'api', 'scraped-data', 'scrapedData.json');
    
    const data = fs.readFileSync(filePath, 'utf-8');
    const products = JSON.parse(data);

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error reading the JSON file:', error);
    return NextResponse.json({ message: 'Failed to load products' }, { status: 500 });
  }
}

