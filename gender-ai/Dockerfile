# Use a stable Python image
FROM python:3.9-slim-bookworm

# Set working directory
WORKDIR /app

# Install system dependencies for image processing and PyTorch
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first to leverage Docker cache
COPY requirements.txt .

# Install dependencies with a timeout and memory-efficient flags
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app
COPY . .

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

# Expose port
EXPOSE 10000

# Start command
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "10000"]
