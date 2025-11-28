# 🧪 Supportly Testing Guide

Complete guide to test all features of the Supportly creator platform.

---

## 📋 Pre-Testing Checklist

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env and fill in:
# - DATABASE_URL (Supabase PostgreSQL)
# - STRIPE_SECRET_KEY (test key: sk_test_...)
# - SUPABASE_URL and SUPABASE_SERVICE_KEY
```

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Run Database Migrations
```bash
npm run migrate
```

Expected output: ✅ 6 migrations successful

---

## ✅ Step-by-Step Testing

### Test 1: Start the Server
```bash
cd backend
npm start
```

Visit: http://localhost:3001/health

Expected: `{"status": "ok"}`

---

### Test 2: Create a Test Creator
```bash
curl -X POST http://localhost:3001/api/creators \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testcreator",
    "displayName": "Test Creator",
    "bio": "Testing Supportly",
    "email": "test@example.com",
    "walletAddress": "TEST123456789"
  }'
```

Save the returned `id` - you'll need it!

---

### Test 3: View Subscription Tiers
```bash
curl http://localhost:3001/api/subscriptions/tiers
```

Should show:
- Free Trial ($0)
- Supportly Creator ($49.95/year)

---

### Test 4: Create Paid Subscription
```bash
curl -X POST http://localhost:3001/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{
    "creatorId": "YOUR_CREATOR_ID_HERE",
    "tier": "paid",
    "email": "test@example.com"
  }'
```

---

### Test 5: Test Donation
```bash
curl -X POST http://localhost:3001/api/donations \
  -H "Content-Type: application/json" \
  -d '{
    "creatorId": "YOUR_CREATOR_ID",
    "amount": 25,
    "donorName": "Test Donor",
    "donorEmail": "donor@test.com",
    "message": "Great work!",
    "txHash": "TEST123",
    "paymentMethod": "crypto"
  }'
```

This should trigger:
- Email notification
- Discord notification (if configured)
- Zapier event (if configured)
- QuickBooks sync (if configured)

---

## 🎯 Success Criteria

- [ ] Server starts without errors
- [ ] Migrations complete successfully
- [ ] Creator can be created
- [ ] Subscription can be created at $49.95
- [ ] Donations can be recorded
- [ ] Integrations trigger (Discord, Zapier, QuickBooks)

---

## 🐛 Troubleshooting

**Database errors?**
- Check DATABASE_URL in .env
- Ensure Supabase is accessible

**Stripe errors?**
- Use test key: sk_test_...
- Test card: 4242 4242 4242 4242

**Migrations fail?**
- Run them individually from database/migrations/

---

Ready to test? Start with Step 1! 🚀
