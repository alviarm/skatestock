# SkateStock - Skateboarding Sale Aggregator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Available-success)](https://skatestock.vercel.app)

**Discover deals, support local skate shops.** SkateStock aggregates sales from independent skate shops into one platform, helping enthusiasts find gear while supporting skater-owned businesses.

https://skatestock.vercel.app

## Recent Improvements

### Enhanced Architecture

- Modular scraper system with separate files per shop
- Improved data validation and normalization
- API caching for better performance
- Better error handling and logging

### Performance Improvements

- Cached API responses reduce file system reads
- Pagination support for better frontend performance
- Data deduplication to remove duplicate products
- Optimized image loading with proper error handling

### Developer Experience

- Structured logging with timestamps
- Better error messages and handling
- Modular code organization
- Improved documentation

## Key Features

- **Local Shop Focus**  
  Exclusively features independent, skater-owned shops - no big-box retailers
- **Real-time Deal Aggregation**  
  Web scraping collects current sales across multiple shops
- **Smart Product Discovery**  
  Filter by type (decks, shoes, trucks) and sort by price/discount
- **Performance Optimized**  
  Fast loading with efficient data processing
- **Community Driven**  
  Open-source platform welcoming contributions

## Tech Stack

| Area          | Technologies                               |
| ------------- | ------------------------------------------ |
| Frontend      | Next.js, React, Tailwind CSS, TypeScript   |
| Backend       | Node.js, Express                           |
| Data Scraping | Axios, Cheerio                             |
| Deployment    | Vercel, GitHub Actions                     |
| Analytics     | (Optional: Add Google Analytics/Plausible) |

## Getting Started

### Prerequisites

- Node.js v18+
- npm v9+

### Installation

```bash
# Clone repository
git clone https://github.com/alviarm/skatestock.git
cd skatestock

# Install dependencies
npm install
```

### Running the Application

```bash
# Start development server
npm run dev
```

Visit http://localhost:3000 in your browser to view the application.

### Running Scrapers

```bash
# From project root
npm run scrape

# Or directly
node src/runScrapers.js
```

### API Endpoints

The application provides a RESTful API for accessing scraped data:

- `GET /api/scraped-data` - Get all products with pagination
- Query parameters:
  - `page` - Page number (default: 1)
  - `limit` - Items per page (default: 20)
  - `shop` - Filter by shop name
  - `type` - Filter by product type
  - `search` - Search by product title

### Deployment

Automatically deployed via Vercel on push to main branch:
https://skatestock.vercel.app

### Contributing

We welcome contributions! Here's how to help:

1. Report issues using GitHub Issues
2. Suggest features through discussions
3. Submit pull requests:

```bash
git checkout -b feature/your-feature
git commit -m 'Add feature'
git push origin feature/your-feature
```

### Development Tips

- Add new shops by creating a new scraper in `src/scrapers/`
- Improve UI in `src/app/page.tsx` and related components
- Add tests in `__tests__/` directory
- Update validation rules in `src/utils/dataValidation.js`

### Future Roadmap

- User accounts with saved favorites
- Price drop notifications
- Shop location mapping
- Mobile app (React Native)
- Community deal sharing

### Challenges & Solutions

| Challenge                    | Solution Implemented           |
| ---------------------------- | ------------------------------ |
| Diverse shop HTML structures | Custom scrapers per shop       |
| Frequent site changes        | Monitoring system with alerts  |
| Performance with large data  | Pagination + virtual scrolling |
| Accurate product comparison  | Normalization algorithms       |

### Acknowledgments

- The global skateboarding community for inspiration
- Independent shops keeping skate culture alive
- Open-source maintainers whose work enables this project

### License

Distributed under the MIT License - see LICENSE for details

### Contact

Matthew Alviar
Email: matthewalviar@gmail.com
GitHub: alviarm
