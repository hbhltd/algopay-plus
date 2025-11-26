#!/bin/bash

# Quick health check for backend

echo "🏥 Testing Backend Health..."
echo ""

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is running!"
    echo ""
    echo "Health check response:"
    curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/health
    echo ""
else
    echo "❌ Backend is not running on port 3001"
    echo ""
    echo "To start the backend:"
    echo "  cd backend"
    echo "  npm run dev"
    echo ""
    exit 1
fi

echo ""
echo "🎉 Backend is healthy and ready!"
