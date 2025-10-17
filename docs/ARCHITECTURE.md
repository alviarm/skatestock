# SkateStock Architecture Documentation

## Overview

SkateStock is a web application that aggregates sales from independent skate shops into a single platform. The application consists of three main components:

1. **Web Scrapers** - Collect data from skate shop websites
2. **API Layer** - Serve scraped data to the frontend
3. **Frontend** - Display products in an intuitive interface

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Skate Shops   │───▶│   Web Scrapers   │───▶│   Data Storage   │
└─────────────────┘    └──────────────────┘    └──────────────────┘
                                │                         │
                                ▼                         ▼
                      ┌──────────────────┐    ┌──────────────────┐
                      │    API Layer     │◀──▶│   Cache Layer    │
                      └──────────────────┘    └──────────────────┘
                                │
                                ▼
                      ┌──────────────────┐
                      │   Frontend UI    │
                      └──────────────────┘
```

## Components

### 1. Web Scrapers

The scraping system is modular, with each skate shop having its own dedicated scraper:

#### Directory Structure

```
src/scrapers/
├── index.js          # Main scraper orchestrator
├── seasonsScraper.js # Seasons Skate Shop scraper
├── premierScraper.js # Premier Store scraper
├── laborScraper.js   # Labor Skate Shop scraper
├── njScraper.js      # NJ Skate Shop scraper
└── blacksheepScraper.js # Black Sheep Skate Shop scraper
```

#### Key Features

- **Modular Design**: Each scraper is 独立 and can be updated without affecting others
- **Error Handling**: Graceful error handling with detailed logging
- **Data Validation**: Ensures data consistency across all sources
- **Rate Limiting**: Respectful scraping with appropriate delays

#### Usage

```bash
# Run all scrapers
npm run scrape

# Or programmatically
node src/runScrapers.js
```

### 2. Data Processing & Storage

#### Data Validation

Data passes through validation and normalization utilities:

- **Validation**: Ensures required fields are present and correctly formatted
- **Normalization**: Standardizes product types and shop identifiers
- **Deduplication**: Removes duplicate products across shops

#### Storage

Data is stored as JSON files in `src/app/api/scraped-data/`:

- `seasonsScrapedData.json`
- `premierScrapedData.json`
- `laborScrapedData.json`
- `njScrapedData.json`
- `blacksheepScrapedData.json`

### 3. API Layer

The API is built with Next.js API routes and provides:

#### Endpoints

- `GET /api/scraped-data` - Retrieve all products with pagination
  - Query Parameters:
    - `page` (default: 1) - Page number
    - `limit` (default: 20) - Items per page
    - `shop` - Filter by shop
    - `type` - Filter by product type
    - `search` - Search by title

#### Features

- **Caching**: In-memory cache with 5-minute expiration
- **Pagination**: Efficient data retrieval for large datasets
- **Filtering**: Flexible query parameters for data refinement
- **Error Handling**: Comprehensive error responses

### 4. Frontend

Built with Next.js and React, the frontend provides:

#### Key Components

- **Product Grid**: Responsive grid layout for product display
- **Search & Filter**: Real-time search and filtering capabilities
- **Sorting**: Multiple sorting options (price, discount, etc.)
- **Pagination**: Efficient navigation through large datasets

#### Performance Features

- **Lazy Loading**: Images load only when visible
- **Skeleton Loading**: Smooth loading states
- **Responsive Design**: Works on all device sizes

## Data Flow

1. **Scraping Phase**

   - Individual scrapers fetch data from each shop
   - Data is validated and normalized
   - Results are saved to JSON files

2. **API Phase**

   - Data is loaded from JSON files
   - Deduplication removes duplicate products
   - Results are cached in memory

3. **Frontend Phase**
   - Client fetches data from API
   - Data is displayed with filtering and sorting
   - User interactions trigger new API requests

## Testing

The application includes comprehensive tests:

### Test Structure

```
__tests__/
├── scraper.test.js        # Scraper functionality tests
├── dataValidation.test.js # Data validation tests
└── api.test.js           # API endpoint tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

The application is deployed on Vercel with automatic deployments on pushes to the main branch.

### Environment Variables

No special environment variables are required for basic operation.

## Future Enhancements

### Planned Features

1. **User Accounts**: Save favorites and preferences
2. **Notifications**: Price drop alerts
3. **Advanced Analytics**: Price history tracking
4. **Mobile App**: Native mobile experience

### Scalability Considerations

1. **Database Migration**: Move from JSON files to a proper database
2. **Microservices**: Separate scraper services for better scaling
3. **CDN**: Content delivery network for images
4. **Load Balancing**: Distribute API requests across multiple instances

## Contributing

See CONTRIBUTING.md for detailed contribution guidelines.

## License

This project is licensed under the MIT License - see LICENSE for details.
