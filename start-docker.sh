#!/bin/bash
# Startup script for Society Management System Docker stack

# Ensure we exit on any error
set -e

echo "=========================================================="
echo "🚀 Starting Rajarshi Darshan Society Management System..."
echo "=========================================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Build and start containers
echo "📦 Building images and starting containers in the foreground..."
echo "💡 Press Ctrl+C to stop all containers."
echo ""

docker compose up --build
