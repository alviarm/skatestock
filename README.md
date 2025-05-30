<!-- SkateStock - A Skateboarding Sale Aggregator
Overview

SkateStock is a web application that aggregates sale section links from independent skate shops, promoting support for local businesses and non-chain stores. Built with skateboarding enthusiasts in mind, SkateStock centralizes sale offerings in one easy-to-use platform, helping users discover the best deals on skateboarding gear.
Features

    Aggregated Sales: Collects sale section items from multiple independent skate shops to provide a comprehensive view of available discounts.

    Support Local Businesses: Promotes skater-owned, non-chain stores, encouraging support for local businesses.

    Web Scraping Integration: Implements web scraping techniques to gather data, ensuring real-time updates for deals.

    Intuitive UI/UX: Designed for user-friendliness and streamlined navigation, making it easy for skateboarding enthusiasts to find what they need.

    Efficient Data Processing: Focused on delivering smooth performance and quick loading times to improve user engagement.

    Product Filtering and Sorting: Users can filter products by type (e.g., skateboards, shoes, accessories) and sort by price, discount, or popularity.

Tech Stack

    Frontend: Next.js, React, Tailwind CSS for responsive and modern UI/UX.

    Backend: Node.js, Express for server-side operations.

    Web Scraping: Axios and Cheerio for data collection from independent skate shop websites.

    Deployment: Deployed using Vercel for a smooth, cost-effective hosting solution.

Installation

To set up SkateStock locally:

    Clone the repository:
    bash
    Copy

    git clone https://github.com/alviarm/skatestock.git

    Navigate to the project directory:
    bash
    Copy

    cd skatestock

    Install dependencies:
    bash
    Copy

    npm install

    Run the development server:
    bash
    Copy

    npm run dev

    Open your browser and visit http://localhost:3000 to view the app.

Running the Scrapers

To scrape data from skate shops:

    Navigate to the scraper file:
    bash
    Copy

    cd src

    Run the scraper script:
    bash
    Copy

    node scraper.js

    This will gather the latest sale data and update the platform accordingly.

Deployment

The project is deployed using Vercel, which supports seamless integration with GitHub. Any changes pushed to the main branch automatically update the live site.

You can access the live version of SkateStock here: https://skatestock.vercel.app/
Contributing

We welcome contributions to improve SkateStock!

    Fork the repository.

    Create a new branch:
    bash
    Copy

    git checkout -b feature-branch

    Commit your changes:
    bash
    Copy

    git commit -m 'Add new feature'

    Push the branch:
    bash
    Copy

    git push origin feature-branch

    Open a Pull Request.

License

This project is licensed under the MIT License - see the LICENSE file for details.
Acknowledgments

    Thanks to the skateboarding community for inspiring this project.

    Credit to all independent skate shops featured in SkateStock for their dedication to skateboarding culture.

Contact

For questions, suggestions, or collaboration opportunities, feel free to reach out:

    GitHub: alviarm

    Email: matthewalviar@gmail.com, alviarm@oregonstate.edu -->

# SkateStock - Skateboarding Sale Aggregator 🛹

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Live Demo](https://img.shields.io/badge/Live_Demo-Available-success)](https://skatestock.vercel.app)

**Discover deals, support local skate shops.** SkateStock aggregates sales from independent skate shops into one platform, helping enthusiasts find gear while supporting skater-owned businesses.

(https://skatestock.vercel.app)

## ✨ Key Features

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

## 🛠️ Tech Stack

| Area              | Technologies                               |
| ----------------- | ------------------------------------------ |
| **Frontend**      | Next.js, React, Tailwind CSS, TypeScript   |
| **Backend**       | Node.js, Express                           |
| **Data Scraping** | Axios, Cheerio                             |
| **Deployment**    | Vercel, GitHub Actions                     |
| **Analytics**     | (Optional: Add Google Analytics/Plausible) |

## 🚀 Getting Started

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

🌐 Deployment

Automatically deployed via Vercel on push to main branch:
https://skatestock.vercel.app

Vercel Deployment
🤝 Contributing

We welcome contributions! Here's how to help:

    Report issues using GitHub Issues

    Suggest features through discussions

    Submit pull requests:

bash

git checkout -b feature/your-feature
git commit -m 'Add awesome feature'
git push origin feature/your-feature

Development Tips

    Add new shops by modifying scraper.js

    Improve UI in components/

    Add tests in __tests__/ directory

📈 Future Roadmap

    User accounts with saved favorites

    Price drop notifications

    Shop location mapping

    Mobile app (React Native)

    Community deal sharing

⚠️ Challenges & Solutions
Challenge	Solution Implemented
Diverse shop HTML structures	Custom scrapers per shop
Frequent site changes	Monitoring system with alerts
Performance with large data	Pagination + virtual scrolling
Accurate product comparison	Normalization algorithms
🙏 Acknowledgments

    The global skateboarding community for inspiration

    Independent shops keeping skate culture alive

    Open-source maintainers whose work enables this project

📜 License

Distributed under the MIT License - see LICENSE for details
📬 Contact

Matthew Alviar
Email
GitHub

```
