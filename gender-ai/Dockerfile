# Use a standard Python image
FROM python:3.9-slim-bookworm

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the AI code
COPY . .

# Expose port
EXPOSE 10000

# Start command (Since we are in rootDir 'gender-ai', app.api is correct)
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "10000"]
