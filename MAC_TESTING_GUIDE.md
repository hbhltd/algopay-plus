# 🍎 Mac Testing Guide for AlgoPay Plus

## Prerequisites
- Node.js 18+ installed (check with `node --version`)
- npm installed (check with `npm --version`)
- Git installed
- Pera Wallet browser extension (for Algorand wallet testing)
- Terminal or iTerm2

---

## 🚀 Quick Start Testing on Mac

### Step 1: Clone and Navigate
```bash
cd ~/Projects  # or your preferred directory
git clone <your-repo-url> algopay-plus
cd algopay-plus
```

### Step 2: Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../frontend
npm install
```

### Step 3: Verify Environment Files

**Backend** (backend/.env):
```bash
cat backend/.env
```
Should show:
- ✅ SUPABASE_URL configured
- ✅ SUPABASE_SERVICE_KEY configured
- ✅ ALGORAND_ALGOD_SERVER configured
- ✅ EMAIL_PROVIDER set to 'console' for testing

**Frontend** (frontend/.env):
```bash
cat frontend/.env
```
Should show:
- ✅ REACT_APP_API_URL=http://localhost:3001
- ✅ REACT_APP_SUPABASE_URL configured
- ✅ REACT_APP_ALGORAND_NODE configured

### Step 4: Start Backend Server

**Terminal 1:**
```bash
cd backend
npm run dev
```

Expected output:
```
  ╔════════════════════════════════════════╗
  ║     🚀 AlgoPay Plus API Server        ║
  ║                                        ║
  ║  Server running on port 3001         ║
  ║  Environment: development              ║
  ║                                        ║
  ║  Health: http://localhost:3001/health  ║
  ╚════════════════════════════════════════╝
```

### Step 5: Test Backend Health

**Terminal 2:**
```bash
# Test 1: Health Check
curl http://localhost:3001/health | jq .

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2025-11-28T...",
#   "services": {
#     "database": "connected",
#     "stripe": false,
#     "algorand": true,
#     "email": true
#   }
# }

# Test 2: Test Email Endpoint
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'

# Test 3: Create Test Creator
curl -X POST http://localhost:3001/api/creators \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testcreator",
    "displayName": "Test Creator",
    "bio": "Testing AlgoPay Plus",
    "email": "creator@test.com",
    "walletAddress": "ALGORAND_WALLET_ADDRESS_HERE"
  }'

# Test 4: Get Creator
curl http://localhost:3001/api/creators/testcreator | jq .
```

### Step 6: Start Frontend

**Terminal 3:**
```bash
cd frontend
npm start
```

Browser should automatically open to: **http://localhost:3000**

### Step 7: Frontend Testing Checklist

Open http://localhost:3000 in your browser:

- [ ] Page loads without errors
- [ ] Check browser console (Cmd+Option+J) - no critical errors
- [ ] Homepage displays properly
- [ ] "Support a Creator" section visible
- [ ] "Become a Creator" section visible
- [ ] Navigation works
- [ ] Responsive design works (resize browser)

---

## 🧪 Complete Feature Testing

### Test 1: Creator Profile Creation
1. Go to creator signup page
2. Fill in all fields:
   - Username (unique)
   - Display name
   - Bio
   - Email
   - Connect Pera Wallet for wallet address
3. Submit form
4. Check Terminal 1 (backend) for welcome email log
5. Verify creator exists: `curl http://localhost:3001/api/creators/[username]`

### Test 2: Crypto Donation Flow (Algorand USDC)
1. Navigate to creator page: http://localhost:3000/@testcreator
2. Click "Support with Crypto"
3. Enter donation amount (e.g., 5 USDC)
4. Add optional message
5. Connect Pera Wallet
6. Sign transaction in Pera Wallet
7. Verify success message
8. Check backend logs for donation notification

**Prerequisites:**
- Pera Wallet installed
- Testnet ALGO in wallet (get from https://bank.testnet.algorand.network/)
- Opted into USDC (Asset ID: 10458941)
- Testnet USDC in wallet

### Test 3: Stripe Card Payment (Optional)
**Note:** Requires Stripe configuration in backend/.env

1. Navigate to creator page
2. Click "Support with Card"
3. Enter test card: `4242 4242 4242 4242`
4. CVV: Any 3 digits
5. Expiry: Any future date
6. Complete payment
7. Check Stripe dashboard for payment

### Test 4: NFT Rewards
1. Create NFT tier:
```bash
curl -X POST http://localhost:3001/api/nft/config \
  -H "Content-Type: application/json" \
  -d '{
    "creatorId": "CREATOR_ID_FROM_DB",
    "name": "Gold Supporter",
    "description": "For $50+ donations",
    "minDonationAmount": 50,
    "imageUrl": "https://picsum.photos/200",
    "maxSupply": 100
  }'
```

2. Make donation >= $50
3. Check if NFT was minted:
```bash
curl http://localhost:3001/api/creators/testcreator/nfts | jq .
```

### Test 5: Analytics Dashboard
1. Create several test donations
2. Access analytics:
```bash
# Dashboard metrics
curl http://localhost:3001/api/analytics/dashboard/CREATOR_ID | jq .

# Revenue analytics
curl http://localhost:3001/api/analytics/revenue/CREATOR_ID | jq .

# Supporter analytics
curl http://localhost:3001/api/analytics/supporters/CREATOR_ID | jq .

# Export CSV
curl http://localhost:3001/api/analytics/export/csv/CREATOR_ID > donations.csv

# Export JSON
curl http://localhost:3001/api/analytics/export/json/CREATOR_ID > donations.json
```

### Test 6: Email Notifications
All emails log to console when `EMAIL_PROVIDER=console`

Check Terminal 1 (backend logs) after:
- Creating a creator (welcome email)
- Receiving a donation (notification to creator)
- Donor receives receipt

---

## 🔍 Troubleshooting Mac-Specific Issues

### Port Already in Use
```bash
# Find process using port 3001
lsof -i:3001

# Kill the process
kill -9 <PID>

# Find process using port 3000
lsof -i:3000
kill -9 <PID>
```

### Node Version Issues
```bash
# Check Node version
node --version

# If < 18, install latest
brew install node@20
```

### npm Permission Issues
```bash
# Fix npm permissions
sudo chown -R $USER:$(id -gn $USER) ~/.npm
sudo chown -R $USER:$(id -gn $USER) ~/.config
```

### Supabase Connection Issues
1. Check internet connection
2. Verify Supabase project is active: https://supabase.com/dashboard
3. Check SUPABASE_URL is accessible: `curl <SUPABASE_URL>/rest/v1/`
4. Verify API keys are correct

### Algorand Wallet Issues
1. Ensure Pera Wallet extension is installed
2. Switch to Testnet in Pera Wallet settings
3. Get testnet ALGO from faucet
4. Opt-in to USDC (Asset ID: 10458941)

### Frontend Build Errors
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Backend Dependencies
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

## 📊 Performance Testing on Mac

### Test Load Time
```bash
# Time the health check
time curl http://localhost:3001/health

# Should be < 100ms
```

### Test Concurrent Requests
```bash
# Install Apache Bench (if not installed)
brew install httpd

# Test 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3001/health
```

---

## 🎯 Mac Testing Checklist

### Backend ✅
- [ ] npm install completes without errors
- [ ] Backend starts on port 3001
- [ ] Health endpoint returns 200 OK
- [ ] All services show as connected
- [ ] Creator endpoints work
- [ ] Donation endpoints work
- [ ] Email notifications log to console
- [ ] No critical errors in logs

### Frontend ✅
- [ ] npm install completes without errors
- [ ] Frontend starts on port 3000
- [ ] Page loads in Safari, Chrome, Firefox
- [ ] No console errors (Cmd+Option+J)
- [ ] All components render
- [ ] Pera Wallet connects successfully
- [ ] Forms submit correctly
- [ ] Responsive design works on different screen sizes

### Integration ✅
- [ ] Frontend can reach backend API
- [ ] CORS works correctly
- [ ] Wallet connection works
- [ ] Donation flow completes end-to-end
- [ ] Supabase database operations work
- [ ] Algorand blockchain transactions work

### Production Readiness ✅
- [ ] No security warnings
- [ ] npm audit shows no critical vulnerabilities
- [ ] All environment variables documented
- [ ] Error handling works properly
- [ ] Loading states display correctly
- [ ] Success/error messages show

---

## 🚀 Next Steps After Testing

1. **Fix any issues found** during testing
2. **Configure production environment variables** (.env.production)
3. **Set up Stripe webhook endpoint** for production
4. **Configure email provider** (Resend/SendGrid) for production
5. **Switch to Algorand Mainnet** for production
6. **Deploy backend** to Railway/Render
7. **Deploy frontend** to Vercel
8. **Test production deployment** thoroughly

---

## 📝 Test Results Template

Use this template to document your test results:

```markdown
# Test Results - [Date]

## Environment
- Mac OS Version:
- Node Version:
- Browser:

## Backend Tests
- Health check: ✅/❌
- Creator creation: ✅/❌
- Donations: ✅/❌
- Analytics: ✅/❌
- Emails: ✅/❌

## Frontend Tests
- Page load: ✅/❌
- Wallet connect: ✅/❌
- Donation flow: ✅/❌
- Responsive design: ✅/❌

## Issues Found
1. [Issue description]
2. [Issue description]

## Performance
- Health check response time: [X]ms
- Page load time: [X]s
```

---

## 💡 Tips for Mac Testing

1. **Use Multiple Terminal Windows**
   - Terminal 1: Backend server
   - Terminal 2: Frontend server
   - Terminal 3: API testing with curl
   - Terminal 4: Monitoring logs

2. **Browser DevTools**
   - Cmd+Option+J: Open console
   - Cmd+Option+I: Open full DevTools
   - Network tab: Monitor API calls
   - Console tab: Check for errors

3. **Monitor Resource Usage**
   - Activity Monitor: Check CPU/Memory usage
   - Ensure backend doesn't use excessive resources

4. **Git Workflow**
   - Create feature branch before testing
   - Commit working configurations
   - Don't commit .env files!

---

**Happy Testing! 🎉**

For issues or questions, check:
- README.md - Project overview
- QUICKSTART.md - Setup guide
- TESTING_GUIDE.md - Comprehensive testing scenarios
- docs/API.md - API documentation
