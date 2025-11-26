# 🚀 Quick Start Guide - AlgoPay Plus

**Get your donation platform running in 10 minutes!**

---

## ⚡ Prerequisites Check

Before starting, make sure you have:
- [x] Node.js 18+ installed (`node --version`)
- [x] npm installed (`npm --version`)
- [x] Git installed
- [x] A code editor (VS Code recommended)

---

## 📝 Step 1: Set Up Supabase (5 minutes)

### 1.1 Create Account
1. Go to https://supabase.com
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Name: `algopay-plus`
   - Database Password: (save this!)
   - Region: Choose closest to you
5. Wait for project to initialize (~2 minutes)

### 1.2 Run Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy entire contents of `database/schema.sql`
4. Paste and click "Run"
5. You should see "Database schema created successfully!"

### 1.3 Get Your Credentials
1. Go to **Settings** → **API**
2. Copy these values:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key

---

## 🔧 Step 2: Configure Backend (2 minutes)

```bash
# Navigate to backend
cd backend

# Copy environment template
cp .env.example .env

# Edit .env file
nano .env  # or use your favorite editor
```

### Required Environment Variables:

```env
# Supabase (paste your values from Step 1.3)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# For local development, these are fine:
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

# Algorand (testnet for development)
ALGORAND_ALGOD_SERVER=https://testnet-api.algonode.cloud
USDC_ASSET_ID=10458941

# Email (optional for testing - will just log)
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@yourdomain.com

# Stripe (can skip for now, add later)
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...

# JWT Secret (generate a random string)
JWT_SECRET=your-random-secret-key-change-this
```

**Save the file!**

---

## 🎨 Step 3: Configure Frontend (1 minute)

```bash
# Navigate to frontend
cd ../frontend

# Copy environment template
cp .env.example .env

# Edit .env file
nano .env
```

### Required Environment Variables:

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_KEY=your-anon-key
REACT_APP_ALGORAND_NODE=https://testnet-api.algonode.cloud
REACT_APP_USDC_ASSET_ID=10458941

# Stripe (can skip for now)
# REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Save the file!**

---

## 📦 Step 4: Install Dependencies (2 minutes)

### Backend:
```bash
cd backend
npm install
```

Expected packages:
- express, cors, dotenv
- @supabase/supabase-js
- algosdk
- nodemailer, resend, @sendgrid/mail
- stripe
- node-cron

### Frontend:
```bash
cd ../frontend
npm install
```

Expected packages:
- react, react-dom, react-scripts
- @perawallet/connect
- algosdk
- @stripe/stripe-js, @stripe/react-stripe-js
- recharts

**Total install time: ~2 minutes**

---

## 🚀 Step 5: Start Development Servers

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

You should see:
```
╔════════════════════════════════════════╗
║     🚀 AlgoPay Plus API Server        ║
║                                        ║
║  Server running on port 3001          ║
║  Environment: development              ║
║                                        ║
║  Health: http://localhost:3001/health  ║
╚════════════════════════════════════════╝
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm start
```

Browser should open automatically to `http://localhost:3000`

---

## ✅ Step 6: Verify Everything Works

### 6.1 Test Backend Health
```bash
curl http://localhost:3001/health
```

Expected response:
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

### 6.2 Test Frontend
1. Open browser to `http://localhost:3000`
2. You should see the landing page
3. Click "Get Started"
4. You should see signup form

---

## 🎉 You're Ready!

### What You Can Do Now:

**1. Create a Creator Account:**
- Click "Get Started"
- Connect Pera Wallet (install extension if needed)
- Fill in creator details
- Submit!

**2. Set Up Your Page:**
- Go to Dashboard
- Configure NFT reward tiers
- Customize your profile

**3. Test a Donation:**
- Visit your creator page: `http://localhost:3000/@yourusername`
- Try making a test donation

---

## 🧪 Optional: Add Stripe for Card Payments

### 1. Create Stripe Account
1. Go to https://stripe.com
2. Sign up
3. Activate test mode

### 2. Get API Keys
1. Dashboard → Developers → API Keys
2. Copy:
   - Publishable key (`pk_test_...`)
   - Secret key (`sk_test_...`)

### 3. Add to .env Files

**Backend .env:**
```env
STRIPE_SECRET_KEY=sk_test_your_key_here
```

**Frontend .env:**
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 4. Set Up Webhook (for production)
```bash
# Install Stripe CLI
npm install -g stripe

# Login
stripe login

# Forward webhooks (for local testing)
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

Copy the webhook secret and add to backend .env:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 5. Restart Servers
Restart both backend and frontend to pick up new environment variables.

---

## 📧 Optional: Add Email Notifications

### Option 1: Resend (Easiest)
1. Sign up at https://resend.com
2. Get API key
3. Add to backend .env:
```env
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=re_your_key
```

### Option 2: SendGrid
1. Sign up at https://sendgrid.com
2. Create API key
3. Add to backend .env:
```env
EMAIL_PROVIDER=sendgrid
EMAIL_FROM=noreply@yourdomain.com
SENDGRID_API_KEY=SG.your_key
```

### Option 3: Gmail SMTP
```env
EMAIL_PROVIDER=smtp
EMAIL_FROM=your-email@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

**Note:** For Gmail, you need to create an "App Password" in your Google account settings.

### Test Email
```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

---

## 🐛 Troubleshooting

### Backend won't start
- Make sure `.env` file exists in `backend/` folder
- Check all required variables are filled in
- Verify Supabase credentials are correct
- Check port 3001 isn't already in use

### Frontend shows blank page
- Open browser console (F12)
- Check for error messages
- Verify `.env` file exists in `frontend/` folder
- Make sure backend is running

### "Cannot connect to database"
- Double-check Supabase URL and keys
- Make sure you ran `database/schema.sql` in Supabase
- Verify your Supabase project is active

### Wallet won't connect
- Install Pera Wallet browser extension
- Make sure you're on testnet
- Check console for errors

---

## 📚 Next Steps

1. **Read the full README.md** for detailed features
2. **Check docs/ folder** for API documentation
3. **Test donation flow** with testnet USDC
4. **Configure NFT rewards** for your creators
5. **Set up Stripe** for card payments
6. **Deploy to production** when ready!

---

## 💡 Pro Tips

- **Use test cards** when testing Stripe: `4242 4242 4242 4242`
- **Get testnet USDC** from Algorand testnet faucet
- **Enable email notifications** to see the full experience
- **Check backend logs** if something isn't working
- **Use browser DevTools** to debug frontend issues

---

## 🎯 Common Tasks

### Create a test creator:
1. Connect wallet
2. Go to `/signup`
3. Fill in details
4. Submit

### Test a donation:
1. Visit `/@username`
2. Enter amount
3. Connect wallet (or use card)
4. Confirm transaction

### View analytics:
1. Go to Dashboard
2. Check stats cards
3. Export data if needed

### Test email:
```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## 🆘 Need Help?

- Check the main **README.md** for detailed docs
- Review **docs/API.md** for API reference
- See **database/schema.sql** for database structure
- Test with provided examples
- Check console logs for errors

---

**Total setup time: ~10 minutes** ⏱️

**Now go build something amazing!** 🚀
