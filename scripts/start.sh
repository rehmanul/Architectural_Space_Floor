#!/bin/bash
set -e

echo "🚀 Starting Architectural Space Analyzer in production mode..."

# Set environment variables
export NODE_ENV=production
export PORT=${PORT:-10000}

# Ensure directories exist
mkdir -p uploads exports

# Run database migrations if needed
if [ -n "$DATABASE_URL" ]; then
  echo "📊 Running database setup..."
  npm run db:push || echo "Database setup skipped or failed"
fi

echo "✅ Starting server on port $PORT..."
exec node server/index.js