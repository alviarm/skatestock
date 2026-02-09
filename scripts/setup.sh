#!/bin/bash
#
# SkateStock Setup Script
# Production-Grade E-commerce Data Intelligence Platform
#
# Usage: ./scripts/setup.sh [--help]
#

set -e

# ==========================================
# COLORS FOR OUTPUT
# ==========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# ==========================================
# HELPER FUNCTIONS
# ==========================================

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ $1${NC}"
}

print_step() {
    echo -e "${BOLD}→ $1${NC}"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to compare versions
version_gte() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

# Function to get version number (extracts numbers from version string)
get_version() {
    "$1" --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1
}

# Function to wait for a service to be healthy
wait_for_service() {
    local service_name=$1
    local health_check=$2
    local max_attempts=${3:-30}
    local wait_seconds=${4:-2}
    
    print_info "Waiting for $service_name to be ready..."
    
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if eval "$health_check" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep $wait_seconds
        attempt=$((attempt + 1))
    done
    
    echo ""
    print_error "$service_name failed to become ready after $((max_attempts * wait_seconds)) seconds"
    return 1
}

# Function to show help
show_help() {
    cat << EOF
SkateStock Setup Script
=======================

Usage: ./scripts/setup.sh [OPTIONS]

Options:
    --help, -h      Show this help message
    --skip-build    Skip Docker build step
    --skip-db       Skip database setup
    --reset-db      Reset database (drops and recreates)

Description:
    This script sets up the SkateStock development environment with all
    required dependencies, Docker containers, and initial data.

Prerequisites:
    - Docker (version 20.10+)
    - Docker Compose (version 2.0+)
    - Node.js (version 18+)
    - Python (version 3.9+)

Services Started:
    - PostgreSQL (port 5432)
    - Redis (port 6379)
    - Kafka (port 9092)
    - Zookeeper (port 2181)
    - Schema Registry (port 8081)
    - Kafka UI (port 8080)
    - Redis Insight (port 5540)
    - API (port 8000)
    - Dashboard (port 8050)
    - Kafka Producer
    - Kafka Consumer

Examples:
    ./scripts/setup.sh              # Full setup
    ./scripts/setup.sh --skip-build # Skip building Docker images
    ./scripts/setup.sh --reset-db   # Reset database and re-run setup

EOF
}

# ==========================================
# PARSE ARGUMENTS
# ==========================================
SKIP_BUILD=false
SKIP_DB=false
RESET_DB=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-db)
            SKIP_DB=true
            shift
            ;;
        --reset-db)
            RESET_DB=true
            shift
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# ==========================================
# STEP 1: PREREQUISITES CHECK
# ==========================================
print_header "Step 1: Checking Prerequisites"

# Check Docker
if ! command_exists docker; then
    print_error "Docker is not installed"
    echo ""
    echo "Installation instructions:"
    echo "  macOS:   brew install --cask docker"
    echo "  Ubuntu:  https://docs.docker.com/engine/install/ubuntu/"
    echo "  Windows: https://docs.docker.com/desktop/install/windows/"
    exit 1
fi

DOCKER_VERSION=$(get_version docker)
print_success "Docker found: version $DOCKER_VERSION"

if ! version_gte "$DOCKER_VERSION" "20.10"; then
    print_error "Docker version 20.10+ required, found $DOCKER_VERSION"
    exit 1
fi

# Check Docker Compose
if command_exists docker-compose; then
    COMPOSE_VERSION=$(docker-compose --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
    COMPOSE_CMD="docker-compose"
    print_success "Docker Compose found: version $COMPOSE_VERSION"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker compose version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
    COMPOSE_CMD="docker compose"
    print_success "Docker Compose (plugin) found: version $COMPOSE_VERSION"
else
    print_error "Docker Compose is not installed"
    echo ""
    echo "Installation instructions:"
    echo "  macOS:   brew install docker-compose"
    echo "  Ubuntu:  sudo apt-get install docker-compose-plugin"
    exit 1
fi

if ! version_gte "$COMPOSE_VERSION" "2.0"; then
    print_warning "Docker Compose version 2.0+ recommended, found $COMPOSE_VERSION"
fi

# Check Node.js
if ! command_exists node; then
    print_error "Node.js is not installed"
    echo ""
    echo "Installation instructions:"
    echo "  macOS:   brew install node@18"
    echo "  Ubuntu:  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "           sudo apt-get install -y nodejs"
    echo "  Or use:  https://github.com/nvm-sh/nvm"
    exit 1
fi

NODE_VERSION=$(get_version node)
print_success "Node.js found: version $NODE_VERSION"

if ! version_gte "$NODE_VERSION" "18.0"; then
    print_error "Node.js version 18+ required, found $NODE_VERSION"
    exit 1
fi

# Check Python
if ! command_exists python3; then
    print_error "Python is not installed"
    echo ""
    echo "Installation instructions:"
    echo "  macOS:   brew install python@3.9"
    echo "  Ubuntu:  sudo apt-get install python3.9"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | grep -oE '[0-9]+\.[0-9]+(\.[0-9]+)?' | head -1)
print_success "Python found: version $PYTHON_VERSION"

if ! version_gte "$PYTHON_VERSION" "3.9"; then
    print_error "Python version 3.9+ required, found $PYTHON_VERSION"
    exit 1
fi

print_success "All prerequisites satisfied!"

# ==========================================
# STEP 2: ENVIRONMENT SETUP
# ==========================================
print_header "Step 2: Environment Setup"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Check if .env file exists
if [ -f ".env" ]; then
    print_success ".env file already exists"
    
    # If --reset-db flag is set, ask about keeping env
    if [ "$RESET_DB" = true ]; then
        print_info "Using existing .env file"
    fi
else
    # Check if .env.template exists
    if [ -f ".env.template" ]; then
        print_step "Creating .env from .env.template"
        cp .env.template .env
        print_success ".env file created from template"
    else
        # Create default .env file
        print_step "Creating default .env file"
        cat > .env << 'EOF'
# SkateStock Environment Configuration
# Generated by setup.sh - review and modify as needed

# Database
DATABASE_URL=postgresql://skatestock:skatestock_dev_password@localhost:5432/skatestock

# Cache
REDIS_URL=redis://localhost:6379/0

# Message Queue
KAFKA_BROKERS=localhost:9092

# Security
JWT_SECRET=skatestock_dev_secret_key_change_in_production

# API Settings
API_RATE_LIMIT=100

# Logging
LOG_LEVEL=INFO

# Development Settings
NODE_ENV=development
PYTHON_ENV=development
EOF
        print_success "Default .env file created"
    fi
    
    print_warning "Please review and edit the .env file if needed"
    echo ""
    read -p "Press Enter to continue or Ctrl+C to exit and edit .env..."
fi

# ==========================================
# STEP 3: DOCKER BUILD
# ==========================================
if [ "$SKIP_BUILD" = false ]; then
    print_header "Step 3: Building Docker Images"
    
    print_step "Building all Docker images..."
    echo "This may take a few minutes..."
    echo ""
    
    # Build all services
    $COMPOSE_CMD build --parallel 2>&1 | while read line; do
        echo "  $line"
    done
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_success "All Docker images built successfully"
    else
        print_error "Docker build failed"
        exit 1
    fi
else
    print_header "Step 3: Skipping Docker Build (--skip-build)"
fi

# ==========================================
# STEP 4: DATABASE SETUP
# ==========================================
if [ "$RESET_DB" = true ]; then
    print_header "Step 4: Resetting Database"
    
    print_warning "This will delete all data in the database!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        print_step "Stopping services and removing volumes..."
        $COMPOSE_CMD down -v postgres 2>/dev/null || true
        docker volume rm skatestock_postgres-data 2>/dev/null || true
        print_success "Database volumes removed"
    else
        print_info "Database reset cancelled"
        RESET_DB=false
    fi
elif [ "$SKIP_DB" = true ]; then
    print_header "Step 4: Skipping Database Setup (--skip-db)"
fi

# ==========================================
# STEP 5: START SERVICES
# ==========================================
print_header "Step 5: Starting Services"

# Start infrastructure services first
print_step "Starting infrastructure services (PostgreSQL, Redis, Kafka, Zookeeper)..."
$COMPOSE_CMD up -d zookeeper kafka postgres redis schema-registry

# Wait for PostgreSQL
wait_for_service "PostgreSQL" "docker exec skatestock-postgres pg_isready -U skatestock" 30 2

# Wait for Redis
wait_for_service "Redis" "docker exec skatestock-redis redis-cli ping" 30 2

# Wait for Kafka
wait_for_service "Kafka" "docker exec skatestock-kafka kafka-broker-api-versions --bootstrap-server localhost:9092" 30 2

print_success "Infrastructure services are ready!"

# ==========================================
# STEP 6: DATABASE MIGRATIONS & SEEDING
# ==========================================
if [ "$SKIP_DB" = false ]; then
    print_header "Step 6: Database Setup"
    
    print_step "Waiting for database initialization..."
    sleep 3
    
    # Check if tables already exist
    TABLES_EXIST=$(docker exec skatestock-postgres psql -U skatestock -d skatestock -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'products');" 2>/dev/null | xargs || echo "f")
    
    if [ "$TABLES_EXIST" = "t" ] && [ "$RESET_DB" = false ]; then
        print_warning "Database tables already exist, skipping initialization"
        print_info "Use --reset-db to recreate the database"
    else
        print_step "Running database migrations..."
        
        # The init scripts in infrastructure/postgres/init/ are automatically
        # executed by PostgreSQL on first startup
        
        # Verify tables were created
        sleep 2
        
        print_step "Verifying database schema..."
        
        # Check key tables
        TABLES=("products" "shops" "product_categories" "brands" "price_history")
        for table in "${TABLES[@]}"; do
            if docker exec skatestock-postgres psql -U skatestock -d skatestock -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '$table');" 2>/dev/null | grep -q "t"; then
                print_success "Table '$table' exists"
            else
                print_warning "Table '$table' may not exist yet (will be created by init scripts)"
            fi
        done
        
        print_step "Seeding initial data..."
        
        # Seed shops data (in case init script didn't run)
        docker exec -i skatestock-postgres psql -U skatestock -d skatestock << 'EOF' 2>/dev/null || true
-- Seed shops data
INSERT INTO shops (id, name, display_name, website_url, location) VALUES
(1, 'seasons', 'Seasons Skate Shop', 'https://seasonsskateshop.com', 'Albany, NY'),
(2, 'premier', 'Premier Store', 'https://thepremierstore.com', 'Virginia Beach, VA'),
(3, 'labor', 'Labor Skate Shop', 'https://laborskateshop.com', 'New York, NY'),
(4, 'nj', 'NJ Skate Shop', 'https://njskateshop.com', 'New Jersey'),
(5, 'blacksheep', 'Black Sheep Skate Shop', 'https://blacksheepskateshop.com', 'Charlotte, NC')
ON CONFLICT (id) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    website_url = EXCLUDED.website_url,
    location = EXCLUDED.location;
EOF
        
        # Seed categories
        docker exec -i skatestock-postgres psql -U skatestock -d skatestock << 'EOF' 2>/dev/null || true
-- Seed product categories
INSERT INTO product_categories (name, display_name, description) VALUES
('decks', 'Decks', 'Skateboard decks from various brands'),
('trucks', 'Trucks', 'Skateboard trucks and hardware'),
('wheels', 'Wheels', 'Skateboard wheels'),
('bearings', 'Bearings', 'Skateboard bearings'),
('shoes', 'Shoes', 'Skate shoes and sneakers'),
('apparel', 'Apparel', 'Skate clothing and accessories'),
('t-shirts', 'T-Shirts', 'Skate t-shirts'),
('sweatshirts', 'Sweatshirts & Hoodies', 'Sweatshirts and hoodies'),
('pants', 'Pants & Shorts', 'Skate pants and shorts'),
('hats', 'Hats & Beanies', 'Hats, caps, and beanies'),
('accessories', 'Accessories', 'Skate accessories and misc items'),
('videos', 'Videos & DVDs', 'Skate videos and DVDs'),
('hardware', 'Hardware', 'Skateboard hardware')
ON CONFLICT (name) DO NOTHING;
EOF
        
        # Verify seeded data
        SHOPS_COUNT=$(docker exec skatestock-postgres psql -U skatestock -d skatestock -t -c "SELECT COUNT(*) FROM shops;" 2>/dev/null | xargs || echo "0")
        CATEGORIES_COUNT=$(docker exec skatestock-postgres psql -U skatestock -d skatestock -t -c "SELECT COUNT(*) FROM product_categories;" 2>/dev/null | xargs || echo "0")
        
        print_success "Seeded $SHOPS_COUNT shops and $CATEGORIES_COUNT categories"
    fi
else
    print_header "Step 6: Skipping Database Setup"
fi

# ==========================================
# STEP 7: START REMAINING SERVICES
# ==========================================
print_header "Step 7: Starting Application Services"

print_step "Starting API, Dashboard, and Data Pipeline..."
$COMPOSE_CMD up -d api dashboard kafka-producer kafka-consumer kafka-ui redis-insight

# Wait for services to be healthy
print_info "Waiting for services to start..."
sleep 5

# Check service status
print_step "Checking service health..."
SERVICES=("skatestock-api" "skatestock-dashboard" "skatestock-kafka-ui" "skatestock-redis-insight")
for service in "${SERVICES[@]}"; do
    if docker ps --format "{{.Names}}" | grep -q "^${service}$"; then
        print_success "$service is running"
    else
        print_warning "$service may not be running (check with: docker ps -a)"
    fi
done

# ==========================================
# STEP 8: HEALTH CHECKS
# ==========================================
print_header "Step 8: Health Checks"

# API Health Check
print_step "Checking API health..."
if wait_for_service "API" "curl -s http://localhost:8000/health" 10 2; then
    API_STATUS="✓ Healthy"
else
    API_STATUS="⚠ Starting (may take a moment)"
fi

# Dashboard Check
print_step "Checking Dashboard..."
if curl -s http://localhost:8050 >/dev/null 2>&1; then
    DASHBOARD_STATUS="✓ Running"
else
    DASHBOARD_STATUS="⚠ Starting (may take a moment)"
fi

# Kafka UI Check
print_step "Checking Kafka UI..."
if curl -s http://localhost:8080 >/dev/null 2>&1; then
    KAFKA_UI_STATUS="✓ Running"
else
    KAFKA_UI_STATUS="⚠ Starting (may take a moment)"
fi

# Redis Insight Check
print_step "Checking Redis Insight..."
if curl -s http://localhost:5540 >/dev/null 2>&1; then
    REDIS_INSIGHT_STATUS="✓ Running"
else
    REDIS_INSIGHT_STATUS="⚠ Starting (may take a moment)"
fi

# ==========================================
# STEP 9: FINAL SUMMARY
# ==========================================
print_header "SkateStock is now running!"

cat << EOF

${GREEN}${BOLD}Services:${NC}
  ${CYAN}API:${NC}            http://localhost:8000        $API_STATUS
  ${CYAN}Dashboard:${NC}      http://localhost:8050        $DASHBOARD_STATUS
  ${CYAN}Kafka UI:${NC}       http://localhost:8080        $KAFKA_UI_STATUS
  ${CYAN}Redis Insight:${NC}  http://localhost:5540        $REDIS_INSIGHT_STATUS

${GREEN}${BOLD}Health Checks:${NC}
  ${CYAN}API Health:${NC}     http://localhost:8000/health
  ${CYAN}API Docs:${NC}       http://localhost:8000/api-docs  (if available)

${GREEN}${BOLD}Database:${NC}
  ${CYAN}PostgreSQL:${NC}     localhost:5432 (skatestock/skatestock_dev_password)
  ${CYAN}Redis:${NC}          localhost:6379
  ${CYAN}Kafka:${NC}          localhost:9092

${GREEN}${BOLD}Next Steps:${NC}
  1. Generate demo data:   ${YELLOW}make demo${NC}  or  ${YELLOW}python scripts/generate_demo_data.py${NC}
  2. Run scraper:          ${YELLOW}docker-compose restart kafka-producer${NC}
  3. View logs:            ${YELLOW}docker-compose logs -f${NC}
  4. Stop all services:    ${YELLOW}docker-compose down${NC}

${GREEN}${BOLD}Useful Commands:${NC}
  ${YELLOW}docker-compose ps${NC}              # List running services
  ${YELLOW}docker-compose logs -f api${NC}     # Follow API logs
  ${YELLOW}docker-compose logs -f kafka-producer${NC}  # Follow scraper logs
  ${YELLOW}./scripts/setup.sh --help${NC}      # Show setup script help

${BLUE}========================================${NC}

EOF

print_success "Setup complete! Happy skating! 🛹"
