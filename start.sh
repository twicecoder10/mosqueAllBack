#!/bin/bash

echo "🚀 Starting Islamic Event Backend..."

# Check if environment variables are set
echo "📋 Environment check:"
echo "NODE_ENV: ${NODE_ENV:-'not set'}"
echo "PORT: ${PORT:-'not set'}"
echo "DATABASE_URL: ${DATABASE_URL:-'not set'}"

# Start the application
echo "🏃 Starting Node.js application..."
exec npm start
