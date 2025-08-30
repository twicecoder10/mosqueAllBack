#!/bin/bash

# Railway Deployment Script for Islamic Event Backend
echo "🚀 Starting Railway deployment..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please login first:"
    echo "railway login"
    exit 1
fi

# Build the project
echo "📦 Building the project..."
npm run build

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment completed!"
echo "🔗 Your app should be available at the Railway URL"
echo "📊 Check the Railway dashboard for deployment status"
