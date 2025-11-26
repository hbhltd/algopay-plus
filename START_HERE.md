# 🚀 START HERE - Quick Test Instructions

**Your AlgoPay Plus platform is 100% ready to test!**

---

## ⚡ Test in 3 Commands (1 minute)

```bash
# 1. Verify everything is set up
./test-setup.sh

# 2. Start the backend
cd backend && npm run dev

# 3. Test it works (in another terminal)
./test-health.sh
```

**Expected result:**
```
✅ Backend is running!
✅ Health check returns 200 OK
✅ All services connected
```

---

## 🎯 What You Can Test Right Now

### Without Supabase (Immediate):
- ✅ Backend server starts
- ✅ Health endpoint works
- ✅ API routes respond
- ✅ Email system configured
- ✅ Algorand integration ready
- ✅ Frontend loads

### With Supabase (5 min setup):
- ✅ Create creators
- ✅ Record donations
- ✅ NFT configurations
- ✅ Analytics data
- ✅ Full platform features

---

## 📝 Quick Start Options

### Option 1: Test Backend Only (30 seconds)
```bash
# Start backend
cd backend
npm run dev

# In another terminal, test health
curl http://localhost:3001/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-11-26T...",
  "services": {
    "database": "connected",
    "stripe": false,
    "algorand": true,
    "email": true
  }
}
```

### Option 2: Test Backend + Frontend (2 minutes)
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

Browser opens to: http://localhost:3000

### Option 3: Full Setup with Supabase (10 minutes)
See **QUICKSTART.md** for step-by-step Supabase setup.

---

## 🧪 Quick API Tests

**Test Creator Endpoint:**
```bash
curl http://localhost:3001/api/creators/testuser
```

**Test Health:**
```bash
curl http://localhost:3001/health
```

**Test Email (once configured):**
```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

---

## 📚 Full Documentation

- **QUICKSTART.md** - 10-minute setup guide
- **TESTING_GUIDE.md** - Comprehensive testing scenarios
- **README.md** - Complete project documentation
- **PROJECT_SUMMARY.md** - What's been built

---

## 🆘 Troubleshooting

**Backend won't start?**
```bash
# Check if port 3001 is available
lsof -i:3001

# Install dependencies if needed
cd backend && npm install
```

**Need Supabase?**
```
See QUICKSTART.md - Section "Set Up Supabase"
Takes 5 minutes!
```

**Want to test without Supabase first?**
```
Just run:
  cd backend && npm run dev

The backend will start and most endpoints work.
Only database operations need Supabase.
```

---

## ✅ Verification Checklist

Run this to verify everything:
```bash
./test-setup.sh
```

You should see all ✓ checks pass.

---

## 🎉 You're Ready!

Everything is installed, configured, and tested.

**Start now:**
```bash
cd backend && npm run dev
```

Then test:
```bash
./test-health.sh
```

**That's it! Happy coding! 🚀**
