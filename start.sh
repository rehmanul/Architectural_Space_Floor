#!/bin/bash

echo "🚀 Starting Architectural Space Analyzer..."

# Start the backend server
echo "📡 Starting backend server..."
tsx server/index.ts &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start the frontend development server
echo "🎨 Starting frontend development server..."
cd client && vite dev --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

echo "✅ Backend server running on http://0.0.0.0:5000"
echo "✅ Frontend server running on http://0.0.0.0:5173"
echo "📝 Backend PID: $BACKEND_PID"
echo "📝 Frontend PID: $FRONTEND_PID"

# Keep the script running
wait