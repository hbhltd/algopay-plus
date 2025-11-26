#!/bin/bash

# AlgoPay Plus - Setup Test Script
# Tests that everything is configured correctly

echo "🧪 AlgoPay Plus - Setup Verification"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Found: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found! Please install Node.js 18+"
    exit 1
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} Found: v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found!"
    exit 1
fi

# Check backend directory
echo -n "Checking backend directory... "
if [ -d "backend" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} backend/ directory not found!"
    exit 1
fi

# Check frontend directory
echo -n "Checking frontend directory... "
if [ -d "frontend" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} frontend/ directory not found!"
    exit 1
fi

# Check backend .env
echo -n "Checking backend/.env... "
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓${NC}"

    # Check for Supabase URL
    if grep -q "SUPABASE_URL=https://your-project.supabase.co" backend/.env; then
        echo -e "  ${YELLOW}⚠${NC}  WARNING: Supabase URL not configured!"
        echo "     Edit backend/.env and add your Supabase credentials"
    fi
else
    echo -e "${RED}✗${NC} backend/.env not found!"
    echo "  Run: cp backend/.env.example backend/.env"
fi

# Check frontend .env
echo -n "Checking frontend/.env... "
if [ -f "frontend/.env" ]; then
    echo -e "${GREEN}✓${NC}"

    # Check for API URL
    if grep -q "REACT_APP_API_URL=http://localhost:3001" frontend/.env; then
        echo -e "  ${GREEN}✓${NC}  API URL configured for local development"
    fi
else
    echo -e "${RED}✗${NC} frontend/.env not found!"
    echo "  Run: cp frontend/.env.example frontend/.env"
fi

# Check backend dependencies
echo -n "Checking backend dependencies... "
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}  Not installed"
    echo "  Run: cd backend && npm install"
fi

# Check frontend dependencies
echo -n "Checking frontend dependencies... "
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠${NC}  Not installed"
    echo "  Run: cd frontend && npm install"
fi

# Check database schema
echo -n "Checking database schema... "
if [ -f "database/schema.sql" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC} database/schema.sql not found!"
fi

echo ""
echo "======================================"
echo "Next Steps:"
echo ""
echo "1. Set up Supabase:"
echo "   - Go to https://supabase.com"
echo "   - Create project & run database/schema.sql"
echo "   - Copy credentials to backend/.env"
echo ""
echo "2. Start backend:"
echo "   ${GREEN}cd backend && npm run dev${NC}"
echo ""
echo "3. Start frontend (in another terminal):"
echo "   ${GREEN}cd frontend && npm start${NC}"
echo ""
echo "4. Test health endpoint:"
echo "   ${GREEN}curl http://localhost:3001/health${NC}"
echo ""
echo "======================================"
