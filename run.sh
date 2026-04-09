#!/bin/bash

# Ensure Homebrew tools are in the path
export PATH="/opt/homebrew/bin:$PATH"

echo "🚀 Starting Event Management System Quickstart..."

# 1. Install Backend Dependencies if node_modules is missing
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

# 2. Install Frontend Dependencies if node_modules is missing
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# 3. Start Backend
echo "🌐 Starting Backend..."
cd backend && node server.js &
BACKEND_PID=$!

# 4. Start Frontend
echo "💻 Starting Frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "----------------------------------------------------"
echo "✅ App is launching!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Press Ctrl+C to stop both servers."
echo "----------------------------------------------------"

# Wait for both to finish
wait $BACKEND_PID $FRONTEND_PID
