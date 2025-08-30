#!/bin/bash

# Railway Setup Script for Islamic Event Backend
echo "🚀 Setting up Railway deployment for Islamic Event Backend..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed. Installing now..."
    npm install -g @railway/cli
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo "❌ Not logged in to Railway. Please login first:"
    echo "railway login"
    exit 1
fi

# Check if project is already linked
if [ ! -f ".railway" ]; then
    echo "🔗 Linking project to Railway..."
    railway link
else
    echo "✅ Project already linked to Railway"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the project
echo "🏗️ Building the project..."
npm run build

echo "✅ Setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Railway dashboard"
echo "2. Add a PostgreSQL database"
echo "3. Add a Redis database (optional)"
echo "4. Configure environment variables"
echo "5. Deploy with: ./scripts/deploy.sh"
echo ""
echo "📖 For detailed instructions, see: RAILWAY_DEPLOYMENT.md"
