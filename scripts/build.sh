#!/bin/bash
set -e

echo "🏗️ Building Architectural Space Analyzer for Render.com..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build client
echo "🔨 Building client application..."
npm run build:client

# Build server  
echo "🔧 Building server application..."
npm run build:server

# Create production structure
echo "📋 Setting up production structure..."
mkdir -p dist/uploads dist/exports

# Copy necessary files
cp package.production.json dist/package.json
cp drizzle.config.js dist/
cp -r shared dist/ 2>/dev/null || true

echo "✅ Build completed successfully!"