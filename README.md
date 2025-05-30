# SkateStock - Skateboarding Sale Aggregator

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Available-success)](https://skatestock.vercel.app)

**Discover deals, support local skate shops.** SkateStock aggregates sales from independent skate shops into one platform, helping enthusiasts find gear while supporting skater-owned businesses.

https://skatestock.vercel.app

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

# Start development server
npm run dev

Visit http://localhost:3000 in your browser
Running Scrapers
bash

# From project root
npm run scrape

# Or directly
node src/scraper.js

Deployment

Automatically deployed via Vercel on push to main branch:
https://skatestock.vercel.app

Deploy with Vercel
Contributing

We welcome contributions! Here's how to help:

    Report issues using GitHub Issues

    Suggest features through discussions

    Submit pull requests:

bash

git checkout -b feature/your-feature
git commit -m 'Add feature'
git push origin feature/your-feature

Development Tips

    Add new shops by modifying scraper.js

    Improve UI in components/

    Add tests in __tests__/ directory

Future Roadmap

    User accounts with saved favorites

    Price drop notifications

    Shop location mapping

    Mobile app (React Native)

    Community deal sharing

Challenges & Solutions
Challenge	Solution Implemented
Diverse shop HTML structures	Custom scrapers per shop
Frequent site changes	Monitoring system with alerts
Performance with large data	Pagination + virtual scrolling
Accurate product comparison	Normalization algorithms
Acknowledgments

    The global skateboarding community for inspiration

    Independent shops keeping skate culture alive

    Open-source maintainers whose work enables this project

License

Distributed under the MIT License - see LICENSE for details
Contact

Matthew Alviar
Email: matthewalviar@gmail.com
GitHub: alviarm
```
