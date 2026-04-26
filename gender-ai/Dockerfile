# Use the official PyTorch CPU image (Everything is already installed!)
FROM bitnami/pytorch:2.0.1

# Set working directory
USER root
WORKDIR /app

# Install only the small web-related libraries
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# We only need to install FastAPI and Uvicorn now (Torch is already there!)
RUN pip install --no-cache-dir fastapi uvicorn python-multipart pillow

# Copy your AI code
COPY . .

# Fix permissions for the bitnami image
RUN chmod -R 777 /app

# Expose port
EXPOSE 10000

# Start command
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "10000"]
