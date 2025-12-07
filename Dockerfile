# Intelekt Backend Dockerfile
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Fix NumPy compatibility with ChromaDB
RUN pip install --no-cache-dir 'numpy<2.0'

# Copy backend code
COPY backend/ .

# Create necessary directories
RUN mkdir -p data/chromadb generated_projects

# Expose port (Render uses PORT env var, default 8080)
EXPOSE 8080

# Set default port
ENV PORT=8080

# Run the application using shell form to expand $PORT
CMD uvicorn main:app --host 0.0.0.0 --port $PORT
