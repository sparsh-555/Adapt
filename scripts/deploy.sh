#!/bin/bash

# Adapt Deployment Script
# This script handles deployment to Vercel with proper environment configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Adapt deployment process...${NC}"

# Check if required tools are installed
command -v vercel >/dev/null 2>&1 || { 
    echo -e "${RED}❌ Vercel CLI is required but not installed. Install with: npm i -g vercel${NC}" 
    exit 1
}

command -v supabase >/dev/null 2>&1 || { 
    echo -e "${RED}❌ Supabase CLI is required but not installed. Install with: npm i -g supabase${NC}" 
    exit 1
}

# Environment check
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  No .env.local file found. Creating from .env.example...${NC}"
    cp .env.example .env.local
    echo -e "${YELLOW}📝 Please update .env.local with your actual values before continuing.${NC}"
    read -p "Press Enter to continue after updating environment variables..."
fi

# Check if this is production deployment
if [ "$1" = "production" ] || [ "$1" = "prod" ]; then
    echo -e "${GREEN}🌟 Deploying to production...${NC}"
    DEPLOYMENT_ENV="production"
else
    echo -e "${YELLOW}🧪 Deploying to preview...${NC}"
    DEPLOYMENT_ENV="preview"
fi

# Run pre-deployment checks
echo -e "${GREEN}🔍 Running pre-deployment checks...${NC}"

# TypeScript check
echo "Checking TypeScript..."
npm run type-check || {
    echo -e "${RED}❌ TypeScript check failed. Please fix errors before deploying.${NC}"
    exit 1
}

# Lint check
echo "Running linter..."
npm run lint || {
    echo -e "${RED}❌ Linting failed. Please fix errors before deploying.${NC}"
    exit 1
}

# Build check
echo "Testing build..."
npm run build || {
    echo -e "${RED}❌ Build failed. Please fix errors before deploying.${NC}"
    exit 1
}

echo -e "${GREEN}✅ All pre-deployment checks passed!${NC}"

# Supabase migration check
echo -e "${GREEN}🗄️  Checking Supabase migrations...${NC}"
if [ -d "supabase/migrations" ] && [ "$(ls -A supabase/migrations)" ]; then
    echo "Found migrations. Applying to remote database..."
    
    # Check if user wants to apply migrations
    read -p "Apply migrations to remote Supabase project? (y/N): " apply_migrations
    if [ "$apply_migrations" = "y" ] || [ "$apply_migrations" = "Y" ]; then
        supabase db push || {
            echo -e "${YELLOW}⚠️  Migration push failed. Please check manually.${NC}"
        }
    fi
fi

# Deploy to Vercel
echo -e "${GREEN}🚀 Deploying to Vercel...${NC}"

if [ "$DEPLOYMENT_ENV" = "production" ]; then
    vercel --prod || {
        echo -e "${RED}❌ Production deployment failed.${NC}"
        exit 1
    }
else
    vercel || {
        echo -e "${RED}❌ Preview deployment failed.${NC}"
        exit 1
    }
fi

# Post-deployment verification
echo -e "${GREEN}🔍 Running post-deployment verification...${NC}"

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --format plain | head -n 1 | awk '{print $2}')

if [ -n "$DEPLOYMENT_URL" ]; then
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo -e "${GREEN}🌍 URL: https://${DEPLOYMENT_URL}${NC}"
    
    # Test API endpoints
    echo "Testing API endpoints..."
    
    # Test health endpoint (if exists)
    if curl -s "https://${DEPLOYMENT_URL}/api/health" > /dev/null; then
        echo -e "${GREEN}✅ API health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  API health check failed or endpoint doesn't exist${NC}"
    fi
    
    # Test tracking endpoint
    if curl -s -X OPTIONS "https://${DEPLOYMENT_URL}/api/track" > /dev/null; then
        echo -e "${GREEN}✅ Tracking API accessible${NC}"
    else
        echo -e "${YELLOW}⚠️  Tracking API check failed${NC}"
    fi
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}📊 Monitor your deployment at: https://vercel.com/dashboard${NC}"
    
    if [ "$DEPLOYMENT_ENV" = "production" ]; then
        echo -e "${GREEN}🔗 Production URL: https://${DEPLOYMENT_URL}${NC}"
        echo -e "${GREEN}📚 API Documentation: https://${DEPLOYMENT_URL}/api/docs${NC}"
    fi
    
else
    echo -e "${RED}❌ Could not retrieve deployment URL${NC}"
    exit 1
fi

echo -e "${GREEN}✨ All done! Your Adapt deployment is ready.${NC}"