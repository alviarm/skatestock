# Resume Update Prompt for SkateStock

Use this prompt with an AI resume assistant or follow it manually to accurately portray your SkateStock project:

---

## PROMPT:

Help me rewrite the SkateStock project description on my resume to be technically accurate while still sounding impressive. Here are the ACTUAL technical details of the project:

### PROJECT OVERVIEW:

**SkateStock** - A web application that aggregates skateboarding product sales from 5 independent skate shops (Seasons, Premier, Labor, NJ Skateshop, Black Sheep) into a single platform.

### ACTUAL TECH STACK:

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes (Node.js)
- **Data Collection:** Custom web scrapers using Axios + Cheerio
- **Deployment:** Vercel (serverless)
- **Testing:** Jest with mocked HTTP requests

### ACTUAL ARCHITECTURE (Be honest about this):

- **5 modular scrapers** (one per shop) with custom parsers for each site's HTML structure
- **Sequential execution** using async/await (NOT parallel processing)
- **Data normalization layer** that maps different product type naming conventions to a unified schema
- **In-memory caching** with 5-minute TTL to reduce file system reads
- **File-based storage** (JSON files, not a database)
- **RESTful API** with pagination, filtering, and search capabilities

### KEY FEATURES I BUILT (These are true):

1. **Modular scraper architecture** - Each shop has its own scraper module that can be updated independently
2. **Data validation & normalization** - Standardizes product types (e.g., "t-shirts", "t-shirt" → "T-Shirts") across different shops
3. **Deduplication algorithm** - Removes duplicate products using title+price hashing
4. **Error handling** - Graceful failure when a shop's site changes structure
5. **Rate-conscious scraping** - Respects shop websites (can add delays between requests)
6. **API optimization** - Pagination and caching for fast frontend performance

### WHAT I SHOULD NOT CLAIM (Previous false claims to remove):

❌ Kafka or message queues (none exist)
❌ AWS VPC/IAM/CloudWatch (deployed on Vercel)
❌ "5,000+ daily events" (it's ~5 shops scraped periodically)
❌ "1TB monthly data" (actual data is ~400KB)
❌ "99.9% uptime" (no monitoring exists)
❌ "Python threading" (it's JavaScript, sequential execution)
❌ "40% latency reduction" (no benchmarks)
❌ GitHub Actions CI/CD (Vercel auto-deploys, no custom CI/CD)

### ACCURATE METRICS I CAN USE:

- 5 independent skate shop data sources
- ~300-500 products tracked across all shops
- Modular architecture supporting easy addition of new shops
- 5-minute API cache for performance
- Comprehensive test coverage with mocked HTTP calls

### DEPLOYMENT:

- Live at: https://skatestock.vercel.app
- Serverless deployment via Vercel
- Auto-deploys on git push to main branch

---

## DESIRED OUTPUT:

Create 2-3 versions of resume bullet points:

### Option 1: Entry-Level/Fresh Graduate Focus

(Emphasize learning, architecture, and modern stack)

### Option 2: Mid-Level/Engineering Focus

(Emphasize technical decisions, scalability considerations, data processing)

### Option 3: Product/Full-Stack Focus

(Emphasize end-to-end ownership, user experience, business value)

---

## SAMPLE ACCURATE BULLETS TO GET YOU STARTED:

**Technical Implementation:**

- "Architected modular web scraping system using Node.js + Cheerio to aggregate product data from 5 independent e-commerce sources"
- "Built data normalization layer mapping heterogeneous product schemas to unified type system"
- "Implemented RESTful API with pagination, filtering, and in-memory caching (5-min TTL) for sub-second response times"
- "Created comprehensive test suite with Jest, mocking HTTP requests to ensure scraper reliability"

**Architecture & Design:**

- "Designed loosely-coupled scraper architecture allowing independent updates when vendor site structures change"
- "Implemented deduplication algorithm using title+price hashing to eliminate duplicate products across sources"
- "Deployed serverless application on Vercel with automatic CI/CD from GitHub repository"

**If you want to mention "scalability" (be careful):**

- "Architected with scalability in mind: modular scrapers can be extended to additional shops, file-based storage can migrate to database"
- "Implemented caching layer to reduce I/O operations and improve API response times"

---

## ADDITIONAL CONTEXT FOR SPECIFIC ROLES:

### If applying to Backend/Data Engineering roles:

- Emphasize: data normalization, ETL-like processes, API design, error handling
- Mention: could easily extend to use Redis/PostgreSQL for production scale

### If applying to Full-Stack roles:

- Emphasize: end-to-end ownership, Next.js full-stack capabilities, TypeScript
- Mention: responsive UI, image optimization, client-side filtering

### If applying to DevOps/Platform roles:

- Emphasize: serverless deployment, Vercel edge network, automated deployments
- Be honest: "Auto-deployment via Vercel" not "custom CI/CD pipeline"

---

## QUESTIONS TO ASK YOUR RESUME REVIEWER:

1. Do any of these claims sound inflated or misleading?
2. Am I using buzzwords (Kafka, AWS, high-throughput) without justification?
3. Would I be comfortable explaining each technical detail in an interview?
4. Does this accurately represent what I built?

---

## INTERVIEW PREPARATION NOTES:

**Be ready to answer:**

- "Why did you choose file-based storage over a database?"
  - Answer: "For simplicity and cost. With ~500 products, JSON files are sufficient. Next step would be PostgreSQL for user accounts and price history."
- "How do you handle it when a shop's website changes?"
  - Answer: "Each scraper is modular. If one fails, others continue. I monitor for failures and can update the specific scraper without affecting the system."
- "How would you scale this to 100 shops?"
  - Answer: "Would need: (1) Queue system (Redis/Bull) for parallel processing, (2) Database (PostgreSQL), (3) Rate limiting per domain, (4) Monitoring/alerting."
- "Why no database?"
  - Answer: "This is a portfolio project focused on demonstrating scraping and API skills. Production would use PostgreSQL + Redis."

---

**Remember: Interviewers respect honesty. It's better to say "I built this as a learning project with room to scale" than to claim enterprise infrastructure you don't have.**
