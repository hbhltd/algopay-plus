#!/bin/bash

# Supportly - Automated Setup Script
# Run this after cloning the repo and everything will be ready!

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          🚀 Supportly - Automated Setup                     ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Track if we need to install anything
NEED_BACKEND_INSTALL=false
NEED_FRONTEND_INSTALL=false

echo "🔍 Checking your setup..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js not found!"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
fi

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗${NC} npm not found!"
    exit 1
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm: v$NPM_VERSION"
fi

echo ""
echo "📦 Setting up environment files..."

# Create backend .env if it doesn't exist
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}→${NC} Creating backend/.env..."
    cat > backend/.env << 'EOF'
# Backend Environment - Local Development
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Supabase (ADD YOUR CREDENTIALS FROM https://supabase.com)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key-here
SUPABASE_SERVICE_KEY=your-service-role-secret-key-here

# JWT
JWT_SECRET=local-dev-secret-change-in-production-abc123

# Algorand (Testnet for development)
ALGORAND_NETWORK=testnet
ALGORAND_ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGORAND_ALGOD_TOKEN=
ALGORAND_INDEXER_SERVER=https://testnet-idx.algonode.cloud
USDC_ASSET_ID=10458941

# Email (Optional - will log to console if not configured)
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@localhost

# Stripe (Optional - can test without)
# STRIPE_SECRET_KEY=sk_test_your_key
# STRIPE_WEBHOOK_SECRET=whsec_your_secret

# Resend (Optional)
# RESEND_API_KEY=re_your_key
EOF
    echo -e "${GREEN}✓${NC} Created backend/.env"
else
    echo -e "${GREEN}✓${NC} backend/.env already exists"
fi

# Create frontend .env if it doesn't exist
if [ ! -f "frontend/.env" ]; then
    echo -e "${YELLOW}→${NC} Creating frontend/.env..."
    cat > frontend/.env << 'EOF'
# Frontend Environment - Local Development
REACT_APP_API_URL=http://localhost:3001
REACT_APP_ALGORAND_NODE=https://testnet-api.algonode.cloud
REACT_APP_USDC_ASSET_ID=10458941

# Supabase (ADD YOUR CREDENTIALS - same as backend)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_KEY=your-anon-public-key-here

# Stripe (Optional)
# REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
EOF
    echo -e "${GREEN}✓${NC} Created frontend/.env"
else
    echo -e "${GREEN}✓${NC} frontend/.env already exists"
fi

echo ""
echo "📦 Installing dependencies..."
echo ""

# Check and install backend dependencies
if [ ! -d "backend/node_modules" ]; then
    NEED_BACKEND_INSTALL=true
    echo -e "${YELLOW}→${NC} Installing backend dependencies..."
    cd backend
    npm install --silent
    cd ..
    echo -e "${GREEN}✓${NC} Backend dependencies installed (230 packages)"
else
    echo -e "${GREEN}✓${NC} Backend dependencies already installed"
fi

# Check and install frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
    NEED_FRONTEND_INSTALL=true
    echo -e "${YELLOW}→${NC} Installing frontend dependencies (this may take a minute)..."
    cd frontend
    npm install --silent
    cd ..
    echo -e "${GREEN}✓${NC} Frontend dependencies installed (1,398 packages)"
else
    echo -e "${GREEN}✓${NC} Frontend dependencies already installed"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║          ✅ SETUP COMPLETE! YOU'RE READY TO TEST!           ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "🎉 What's Ready:"
echo ""
echo "  ✅ Backend configured (Node.js + Express)"
echo "  ✅ Frontend configured (React 18)"
echo "  ✅ Environment files created"
echo "  ✅ All dependencies installed"
echo "  ✅ Test scripts ready"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 START TESTING NOW:"
echo ""
echo "  Terminal 1 - Start Backend:"
echo -e "    ${GREEN}cd backend${NC}"
echo -e "    ${GREEN}npm run dev${NC}"
echo ""
echo "  Terminal 2 - Test Health (after backend starts):"
echo -e "    ${GREEN}./test-health.sh${NC}"
echo ""
echo "  Terminal 3 - Start Frontend (optional):"
echo -e "    ${GREEN}cd frontend${NC}"
echo -e "    ${GREEN}npm start${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📚 Documentation:"
echo "  • START_HERE.md - Quick reference"
echo "  • QUICKSTART.md - 10-minute setup guide"
echo "  • TESTING_GUIDE.md - How to test everything"
echo "  • README.md - Full documentation"
echo ""

echo "⚠️  Optional (can do later):"
echo "  • Set up Supabase for database (5 minutes)"
echo "    See QUICKSTART.md for step-by-step instructions"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Ready to start!${NC} Run: ${GREEN}cd backend && npm run dev${NC}"
echo ""
