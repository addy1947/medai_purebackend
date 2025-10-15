#!/bin/bash

# MedAI Backend Startup Script

echo "🚀 Starting MedAI Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration before running again."
    echo "   Required variables:"
    echo "   - MONGODB_URI"
    echo "   - JWT_SECRET"
    echo "   - CLOUDINARY_* (if using image uploads)"
    echo "   - GOOGLE_API_KEY (if using AI features)"
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the application
echo "🌟 Starting MedAI Backend Server..."
npm start
