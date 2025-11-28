# ✅ Mac Testing Checklist - AlgoPay Plus

**Date:** November 28, 2025
**Prepared for:** Local Mac Testing
**Estimated Time:** 1-2 hours

---

## 🎯 Objective

Test the entire AlgoPay Plus platform locally on your Mac to ensure everything works before deploying to production.

---

## 📋 Pre-Testing Setup

### Step 1: Open Terminal Windows

You'll need **3 terminal windows/tabs**:
- **Terminal 1:** Backend server
- **Terminal 2:** Frontend server
- **Terminal 3:** Testing commands

### Step 2: Navigate to Project

```bash
cd ~/algopay-plus  # or wherever you cloned the project
```

---

## 🚀 Part 1: Backend Testing (15-20 minutes)

### Backend Startup

**Terminal 1:**
```bash
cd backend
npm run dev
```

**Expected Output:**
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

✅ **Checklist:**
- [ ] Backend starts without errors
- [ ] No red error messages in console
- [ ] Shows "Server running on port 3001"

---

### Test 1: Health Check

**Terminal 3:**
```bash
curl http://localhost:3001/health | python3 -m json.tool
```

**Expected Response:**
```json
{
    "status": "ok",
    "timestamp": "2025-11-28T...",
    "services": {
        "database": "connected",
        "stripe": false,
        "algorand": true,
        "email": true
    }
}
```

✅ **Checklist:**
- [ ] Status is "ok"
- [ ] Database is "connected"
- [ ] Algorand is true
- [ ] Email is true
- [ ] Stripe is false (expected, not configured yet)

---

### Test 2: Email Notification

**Terminal 3:**
```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

**Expected Response:**
```json
{
    "success": true,
    "message": "Test email sent!"
}
```

**In Terminal 1 (backend logs), look for:**
```
📧 [DEV MODE] Email would be sent to your-email@example.com: ✅ Test Email from Supportly
```

✅ **Checklist:**
- [ ] API responds with success: true
- [ ] Email logged in Terminal 1 (backend)
- [ ] No errors in backend console

---

### Test 3: Create Test Creator

**Terminal 3:**
```bash
curl -X POST http://localhost:3001/api/creators \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testmac",
    "displayName": "Test Mac Creator",
    "bio": "Testing AlgoPay on Mac",
    "email": "testmac@example.com",
    "walletAddress": "YOUR_ALGORAND_WALLET_ADDRESS_HERE"
  }' | python3 -m json.tool
```

**Expected Response:**
```json
{
    "id": "...",
    "username": "testmac",
    "displayName": "Test Mac Creator",
    ...
}
```

**In Terminal 1, look for:**
```
📧 [DEV MODE] Email would be sent to testmac@example.com: 👋 Welcome to Supportly!
```

✅ **Checklist:**
- [ ] Creator created successfully
- [ ] Returns creator object with ID
- [ ] Welcome email logged in backend
- [ ] No errors

---

### Test 4: Get Creator Profile

**Terminal 3:**
```bash
curl http://localhost:3001/api/creators/testmac | python3 -m json.tool
```

**Expected Response:**
```json
{
    "id": "...",
    "username": "testmac",
    "displayName": "Test Mac Creator",
    "bio": "Testing AlgoPay on Mac",
    "email": "testmac@example.com",
    "walletAddress": "...",
    "totalDonations": 0,
    "supportersCount": 0
}
```

✅ **Checklist:**
- [ ] Returns creator data
- [ ] All fields populated correctly
- [ ] totalDonations is 0
- [ ] supportersCount is 0

---

### Test 5: Analytics Endpoints

**Terminal 3:**
```bash
# Get the creator ID from the previous response, then:

# Dashboard analytics
curl "http://localhost:3001/api/analytics/dashboard/{CREATOR_ID}" | python3 -m json.tool

# Revenue analytics
curl "http://localhost:3001/api/analytics/revenue/{CREATOR_ID}" | python3 -m json.tool

# Supporter analytics
curl "http://localhost:3001/api/analytics/supporters/{CREATOR_ID}" | python3 -m json.tool
```

✅ **Checklist:**
- [ ] Dashboard returns metrics (even if zero)
- [ ] Revenue returns empty array or zero data
- [ ] Supporters returns empty array
- [ ] No errors

---

## 🌐 Part 2: Frontend Testing (20-30 minutes)

### Frontend Startup

**Terminal 2:**
```bash
cd frontend
npm start
```

**Wait for compilation (30-60 seconds)**

Browser should automatically open to: `http://localhost:3000`

If not, manually open: http://localhost:3000

✅ **Checklist:**
- [ ] Frontend compiles successfully
- [ ] Browser opens automatically
- [ ] No critical errors in terminal
- [ ] Source map warnings are OK (harmless)

---

### Test 6: Homepage Load

**In your browser at http://localhost:3000:**

✅ **Visual Checklist:**
- [ ] Page loads completely
- [ ] "Supportly" logo/title visible
- [ ] "Support a Creator" section visible
- [ ] "Become a Creator" section visible
- [ ] Navigation menu works
- [ ] No blank/broken sections

**Open Browser Console (Cmd+Option+J):**

✅ **Console Checklist:**
- [ ] No red errors
- [ ] Yellow warnings are OK
- [ ] Network tab shows API calls to localhost:3001

---

### Test 7: Creator Signup Flow

**In Browser:**
1. Click "Become a Creator" or navigate to creator signup
2. Fill out the form:
   - Username: `mactester`
   - Display Name: `Mac Test User`
   - Bio: `Testing on Mac`
   - Email: `mac@test.com`
   - Wallet: (You'll need to connect Pera Wallet - see below)

**Pera Wallet Setup (if not already done):**
1. Install Pera Wallet browser extension
2. Create/import wallet
3. Switch to **Testnet** in wallet settings
4. Get testnet ALGO from faucet: https://bank.testnet.algorand.network/
5. Connect wallet to the form

3. Submit form

✅ **Checklist:**
- [ ] Form validates properly
- [ ] Wallet connects successfully
- [ ] Form submits without errors
- [ ] Success message displayed
- [ ] Check Terminal 1 for welcome email log
- [ ] Creator profile loads after creation

---

### Test 8: Creator Profile Page

**In Browser:**
1. Navigate to: `http://localhost:3000/@mactester`
2. Your creator profile should load

✅ **Visual Checklist:**
- [ ] Profile displays correctly
- [ ] Display name shows
- [ ] Bio shows
- [ ] Wallet address visible (truncated)
- [ ] "Support" buttons visible
- [ ] Stats show (0 donations, 0 supporters)

---

### Test 9: Search/Browse Creators

**In Browser:**
1. Navigate to creators list/search page
2. Search for "mactester"

✅ **Checklist:**
- [ ] Creator appears in search results
- [ ] Can click to view profile
- [ ] Profile data loads correctly

---

### Test 10: Algorand Donation Flow (Advanced)

**Prerequisites:**
- Pera Wallet installed and set to Testnet
- Testnet ALGO in wallet (from faucet)
- Opted into testnet USDC (Asset ID: 10458941)
- Testnet USDC in wallet

**Steps:**
1. Go to creator page: `http://localhost:3000/@testmac`
2. Click "Support with Crypto"
3. Enter amount: `5` USDC
4. Add message: "Test donation from Mac"
5. Click "Send Donation"
6. Pera Wallet popup appears
7. Review transaction in wallet
8. Sign transaction

✅ **Checklist:**
- [ ] Donation form loads
- [ ] Can enter amount and message
- [ ] Pera Wallet connects
- [ ] Transaction details correct in wallet
- [ ] Transaction signs successfully
- [ ] Success message appears
- [ ] Check Terminal 1 for donation notification email
- [ ] Donation appears in creator's stats
- [ ] Donor receives receipt email (logged in Terminal 1)

**Troubleshooting:**
- If USDC opt-in needed: Use Pera Wallet to add Asset ID 10458941
- If insufficient USDC: You may need a testnet USDC faucet (harder to find)
- For testing, you can also test with just ALGO instead

---

### Test 11: Responsive Design

**In Browser:**
1. Resize browser window to different sizes:
   - Desktop (full screen)
   - Tablet (medium width)
   - Mobile (narrow width)

✅ **Checklist:**
- [ ] Layout adapts to screen size
- [ ] Text remains readable
- [ ] Buttons remain clickable
- [ ] No horizontal scrolling on mobile
- [ ] Navigation works on all sizes

---

### Test 12: Different Browsers

**Test on at least 2 browsers:**
- [ ] Chrome/Brave
- [ ] Safari
- [ ] Firefox

✅ **Checklist:**
- [ ] Page loads in all browsers
- [ ] Styling consistent
- [ ] Functionality works
- [ ] Wallet connects (where applicable)

---

## 🔍 Part 3: Integration Testing (15-20 minutes)

### Test 13: Backend-Frontend Integration

**Verify data flows from frontend to backend:**

1. Create a creator via frontend (already done in Test 7)
2. In Terminal 3, verify it's in database:
```bash
curl http://localhost:3001/api/creators/mactester | python3 -m json.tool
```

✅ **Checklist:**
- [ ] Creator exists in backend
- [ ] Data matches what was entered in frontend
- [ ] Stats are synchronized

---

### Test 14: Real-time Updates

1. Make a donation via frontend (if possible)
2. Refresh creator profile page
3. Stats should update

✅ **Checklist:**
- [ ] Donation count increases
- [ ] Total donations increases
- [ ] Supporter count increases
- [ ] Recent donations show

---

### Test 15: Error Handling

**Test various error scenarios:**

**Invalid Creator:**
```bash
curl http://localhost:3001/api/creators/nonexistent
```
Expected: Error message, not crash

**Invalid Data:**
```bash
curl -X POST http://localhost:3001/api/creators \
  -H "Content-Type: application/json" \
  -d '{"username": "a"}'
```
Expected: Validation error

**In Frontend:**
- Try to create creator with existing username
- Try to donate with invalid amount (0 or negative)
- Try to submit forms with missing required fields

✅ **Checklist:**
- [ ] Errors are caught gracefully
- [ ] Error messages are user-friendly
- [ ] App doesn't crash
- [ ] Backend logs errors appropriately

---

## 📊 Part 4: Performance Testing (10 minutes)

### Test 16: Load Time

**In Browser DevTools:**
1. Open Network tab (Cmd+Option+J > Network)
2. Reload homepage (Cmd+R)
3. Check load time

✅ **Performance Checklist:**
- [ ] Page loads in < 3 seconds
- [ ] API calls complete in < 1 second
- [ ] No failed requests (red items)
- [ ] No excessive requests (< 50 requests)

---

### Test 17: Memory Usage

**In Activity Monitor (Mac):**
1. Open Activity Monitor (Cmd+Space > "Activity Monitor")
2. Find "node" processes
3. Check memory and CPU usage

✅ **Checklist:**
- [ ] Backend uses < 200MB RAM
- [ ] CPU usage < 50% when idle
- [ ] No memory leaks (usage stays stable)

---

## 🧹 Part 5: Cleanup & Verification (5 minutes)

### Test 18: Logs Review

**Review all terminal logs for:**

✅ **Backend (Terminal 1):**
- [ ] No unhandled errors
- [ ] All emails logged correctly
- [ ] Database connections stable
- [ ] No deprecation warnings (or only harmless ones)

✅ **Frontend (Terminal 2):**
- [ ] Compilation successful
- [ ] No build errors
- [ ] ESLint warnings are minor (unused vars, etc.)
- [ ] Source map warnings OK

---

### Test 19: Environment Variables Check

**Verify all configs are correct:**

```bash
# Backend
cat backend/.env

# Frontend
cat frontend/.env
```

✅ **Checklist:**
- [ ] All required variables present
- [ ] URLs point to correct endpoints
- [ ] API keys are valid (if configured)
- [ ] Testnet configuration (not mainnet!)

---

## 📝 Test Results Summary

### Overall Status

**Backend:** ✅ / ⚠️ / ❌
**Frontend:** ✅ / ⚠️ / ❌
**Integration:** ✅ / ⚠️ / ❌
**Performance:** ✅ / ⚠️ / ❌

### Issues Found

| Issue | Severity | Description | Status |
|-------|----------|-------------|--------|
| 1.    | High/Med/Low |             | Open/Fixed |
| 2.    |              |             |            |
| 3.    |              |             |            |

### Notes

```
Add any observations, concerns, or questions here:







```

---

## ✅ Sign-Off

If all critical tests pass:

- [x] **Backend is ready** for production deployment
- [x] **Frontend is ready** for production deployment
- [x] **Integration works** as expected
- [x] **Ready to proceed** to Option B (SendGrid setup) or Option C (Production deployment)

**Tester:** _________________
**Date:** _________________
**Time Spent:** _________ hours

---

## 🚦 Next Steps

Based on test results:

### If All Tests Pass ✅
Proceed to:
1. **Option B:** Set up SendGrid integration
2. **Option C:** Deploy to production (follow PRODUCTION_DEPLOY.md)

### If Issues Found ⚠️
1. Document all issues above
2. Prioritize fixes
3. Make necessary code changes
4. Re-run tests
5. Repeat until all tests pass

### If Critical Failures ❌
1. Stop here
2. Debug issues
3. Check logs thoroughly
4. Review code
5. Ask for help if needed

---

## 📞 Support

If you encounter issues:
- Check backend logs (Terminal 1)
- Check browser console (Cmd+Option+J)
- Review TESTING_GUIDE.md for more details
- Check MAC_TESTING_GUIDE.md for Mac-specific help

---

**Good luck testing! 🚀**
