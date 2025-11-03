#!/bin/bash

# Oura Integration Edge Functions Deployment Script
# This script deploys all Oura-related Edge Functions to Supabase

set -e  # Exit on error

echo "🚀 Deploying Oura Integration Edge Functions to Supabase..."
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"
echo ""

# Function to deploy with error handling
deploy_function() {
    local func_name=$1
    echo -e "${YELLOW}Deploying ${func_name}...${NC}"

    if supabase functions deploy "$func_name" --no-verify-jwt 2>&1 | tee /tmp/deploy-log.txt; then
        echo -e "${GREEN}✓ ${func_name} deployed successfully${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ Failed to deploy ${func_name}${NC}"
        echo "Check the output above for errors"
        return 1
    fi
}

# Deploy each function
echo "================================================"
echo "  Deploying Oura OAuth Functions"
echo "================================================"
echo ""

deploy_function "oura-auth-initiate"
deploy_function "oura-auth"

echo ""
echo "================================================"
echo "  Deploying Oura Data Sync Functions"
echo "================================================"
echo ""

deploy_function "fetch-oura-data"
deploy_function "fetch-oura-auto"

echo ""
echo "================================================"
echo "  Deployment Summary"
echo "================================================"
echo ""

# List deployed functions
echo "Checking deployed functions..."
supabase functions list

echo ""
echo -e "${GREEN}✅ All functions deployed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Set Oura API credentials:"
echo "   supabase secrets set OURA_CLIENT_ID=\"your_client_id\""
echo "   supabase secrets set OURA_CLIENT_SECRET=\"your_client_secret\""
echo ""
echo "2. Apply database migration:"
echo "   supabase db push"
echo ""
echo "3. Test OAuth flow at:"
echo "   https://predictiv.netlify.app/settings"
echo ""
echo "See DEPLOYMENT_GUIDE.md for detailed instructions"
