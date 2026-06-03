#!/bin/bash

# FJ Analytics SaaS - Quick Setup Script
# Usage: ./scripts/setup.sh

set -e

echo "🚀 FJ Analytics SaaS - Quick Setup"
echo "=================================="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed. Aborting."; exit 1; }

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo ""
echo "📦 Creating environment file..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
else
    echo "⚠️  backend/.env already exists, skipping"
fi

echo ""
echo "🐋 Building Docker images..."
docker-compose build --parallel

echo ""
echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "🔍 Checking health..."
curl -s http://localhost:3000/api/health | head -20 || echo "Backend may still be starting..."

echo ""
echo "📋 Service Status:"
docker-compose ps

echo ""
echo "=================================="
echo "✅ Setup complete!"
echo ""
echo "🌐 Access the application at:"
echo "   Frontend: http://localhost:8080"
echo "   Backend:  http://localhost:3000"
echo ""
echo "🔐 Default credentials:"
echo "   Username: admin"
echo "   Password: Admin123!ChangeMe"
echo ""
echo "📚 For more commands:"
echo "   docker-compose logs -f backend  # View backend logs"
echo "   docker-compose restart         # Restart services"
echo "   docker-compose down            # Stop services"
echo "=================================="
