#!/bin/bash

# AlgoPay Plus - Supabase Database Update Script
# This script helps update your Supabase database with the payment keys migration

set -e

echo "======================================="
echo "AlgoPay Plus - Database Update"
echo "Payment Keys Migration"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f "../backend/.env" ]; then
    echo -e "${RED}Error: backend/.env file not found${NC}"
    echo "Please create .env file with your Supabase credentials"
    exit 1
fi

# Load environment variables
source ../backend/.env

# Check if Supabase credentials are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}Error: SUPABASE_URL or SUPABASE_SERVICE_KEY not set in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Supabase Project:${NC} $SUPABASE_URL"
echo ""

# Show migration SQL
echo -e "${YELLOW}Migration SQL:${NC}"
echo "-----------------------------------"
cat ../database/migrations/001_add_payment_keys.sql
echo "-----------------------------------"
echo ""

# Confirm before proceeding
read -p "Do you want to run this migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Migration cancelled"
    exit 0
fi

echo ""
echo -e "${YELLOW}Running migration...${NC}"

# Run migration using curl and Supabase REST API
# Note: This requires the supabase CLI or manual execution
echo -e "${YELLOW}Please run the migration manually:${NC}"
echo ""
echo "1. Go to https://app.supabase.com"
echo "2. Select your project"
echo "3. Click 'SQL Editor'"
echo "4. Copy and paste the SQL from:"
echo "   database/migrations/001_add_payment_keys.sql"
echo "5. Click 'Run'"
echo ""
echo -e "${GREEN}Or use the Supabase CLI:${NC}"
echo "   npx supabase db execute -f database/migrations/001_add_payment_keys.sql"
echo ""

# Option to open migration file
read -p "Open migration file now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code ../database/migrations/001_add_payment_keys.sql
    elif command -v nano &> /dev/null; then
        nano ../database/migrations/001_add_payment_keys.sql
    else
        cat ../database/migrations/001_add_payment_keys.sql
    fi
fi

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Run the migration in Supabase SQL Editor"
echo "2. Deploy backend to Railway"
echo "3. Deploy frontend to Vercel/Netlify"
echo "4. See docs/DEPLOYMENT_UPDATE.md for details"
echo ""
