# Data Pipeline Docker Image
# Supports: Producers, Consumers, and Stream Processing

FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY data-pipeline/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY data-pipeline/ ./
COPY src/scrapers/ ./scrapers/

# Create necessary directories
RUN mkdir -p /app/logs /app/data

# Expose ports (for metrics endpoint)
EXPOSE 8001

# Default command (can be overridden)
CMD ["python", "-m", "kafka.consumers.product_consumer"]
