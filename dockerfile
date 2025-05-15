# Frontend build stage with latest LTS Node
FROM node:20-bullseye AS frontend-builder
WORKDIR /app/frontend
# Copy package files first for better caching
COPY frontend/package*.json ./
# Use --production flag to avoid dev dependencies
RUN npm install
COPY frontend/ .
RUN npm run build

# Backend stage with latest Python
FROM python:3.11-slim-bookworm AS backend
WORKDIR /app

# Create a non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install only required packages and clean up in the same layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir --upgrade pip

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ ./backend
COPY --from=frontend-builder /app/frontend/dist ./frontend_dist

# Install only what's needed for production
RUN pip install --no-cache-dir fastapi "uvicorn[standard]"

# Copy the entrypoint script
COPY backend/main.py .

# Use non-root user for runtime
USER appuser

# Expose the port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]