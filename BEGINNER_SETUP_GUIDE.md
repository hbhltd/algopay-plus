# 🚀 Supportly - Complete Beginner's Setup Guide

**Welcome!** This guide will walk you through EVERY step to get Supportly running. No coding experience needed!

---

## 📋 What You Already Have (Good News!)

### ✅ Systems Already Built For You:

1. **Auto-Repayment System** ✅
   - Creators pay $49.95/year via Stripe
   - Automatic renewals every year
   - 7-day grace period if payment fails
   - Email reminders before renewal

2. **Account Suspension System** ✅
   - If creator doesn't pay → 7-day grace period
   - After grace period → Account downgraded to free tier
   - Payment history tracked automatically
   - Status: `active`, `suspended`, or `pending_payment`

3. **What's NOT Built Yet:**
   - ❌ Visual notice on creator page saying "Creator will return shortly"
   - ❌ Newsletter composer UI (backend is ready!)
   - ❌ Community subscriber UI (backend is ready!)
   - ❌ Shop items UI (backend is ready!)

---

## 🎯 Your Complete Checklist

### Phase 1: Setup Your Computer (30 minutes)
- [ ] Step 1: Install Node.js
- [ ] Step 2: Get Supabase account ready
- [ ] Step 3: Get Stripe account (test mode)
- [ ] Step 4: Copy environment files

### Phase 2: Apply Database Migrations (10 minutes)
- [ ] Step 5: Run migration 008 (Shop & Storage)
- [ ] Step 6: Run migration 009 (Community Subscribers)
- [ ] Step 7: Run migration 010 (Newsletter System)
- [ ] Step 8: Run migration 011 (QR Code Tracking)

### Phase 3: Start Development (15 minutes)
- [ ] Step 9: Install backend packages
- [ ] Step 10: Install frontend packages
- [ ] Step 11: Start backend server
- [ ] Step 12: Start frontend server
- [ ] Step 13: Test the website!

### Phase 4: Add Missing Features (1-2 hours)
- [ ] Step 14: Add suspension notice to creator pages
- [ ] Step 15: Test suspension notice
- [ ] Step 16: Choose color scheme and logo

### Phase 5: Deploy to Internet (Optional)
- [ ] Step 17: Deploy to Vercel (frontend)
- [ ] Step 18: Deploy to Railway (backend)
- [ ] Step 19: Test live website

---

## 📖 Detailed Step-by-Step Instructions

---

### PHASE 1: Setup Your Computer

#### ✅ Step 1: Install Node.js

**What is Node.js?** It's the software that runs your backend server.

1. Go to: https://nodejs.org/
2. Download the **LTS version** (left button, green)
3. Install it (click Next, Next, Finish)
4. **Test it worked:**
   - Open Terminal (Mac) or Command Prompt (Windows)
   - Type: `node --version`
   - You should see something like `v18.17.0`

---

#### ✅ Step 2: Get Supabase Account Ready

**What is Supabase?** Your database - where all creator info, donations, etc. are stored.

**You already have Supabase!** Your project ID is: `htugrxwhoojenhooaohk`

**To get your credentials:**

1. Go to: https://supabase.com/dashboard
2. Click on your project: `htugrxwhoojenhooaohk`
3. Click "Settings" (gear icon, bottom left)
4. Click "API"
5. **Copy these 3 things** (you'll need them later):
   - `Project URL` (looks like: `https://htugrxwhoojenhooaohk.supabase.co`)
   - `anon public` key (long string starting with `eyJ...`)
   - `service_role` key (long string starting with `eyJ...`)

**To get your DATABASE_URL:**

1. Still in Supabase, click "Database" (left menu)
2. Click "Connection Pooler"
3. Mode: Select "Transaction"
4. Copy the **Connection string**
5. It looks like: `postgresql://postgres.htugrxwhoojenhooaohk:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
6. Replace `[PASSWORD]` with your database password

---

#### ✅ Step 3: Get Stripe Account (Test Mode)

**What is Stripe?** Handles credit card payments for creator subscriptions.

1. Go to: https://stripe.com
2. Sign up for free
3. **Stay in TEST mode** (you'll see "Test mode" toggle at top)
4. Go to: https://dashboard.stripe.com/test/apikeys
5. **Copy these 2 keys:**
   - `Publishable key` (starts with `pk_test_...`)
   - `Secret key` (starts with `sk_test_...`)

---

#### ✅ Step 4: Copy Environment Files

**What are .env files?** They hold your secret keys and passwords.

**Open your terminal and navigate to your project:**

```bash
cd /home/user/algopay-plus
```

**Create backend .env file:**

```bash
cd backend
cp .env.example .env
```

**Now edit backend/.env file:**

📂 **File location:** `/home/user/algopay-plus/backend/.env`

**Replace these values:**

```env
# ============== DATABASE ==============
DATABASE_URL=postgresql://postgres.htugrxwhoojenhooaohk:[YOUR_PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://htugrxwhoojenhooaohk.supabase.co
SUPABASE_SERVICE_KEY=eyJ... (your service_role key from Step 2)
SUPABASE_ANON_KEY=eyJ... (your anon key from Step 2)

# ============== STRIPE PAYMENTS ==============
STRIPE_SECRET_KEY=sk_test_... (your secret key from Step 3)
STRIPE_PUBLISHABLE_KEY=pk_test_... (your publishable key from Step 3)
STRIPE_WEBHOOK_SECRET=whsec_... (we'll set this up later)

# ============== EMAIL SERVICES ==============
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=support@supportly.com
FROM_NAME=Supportly

# ============== ALGORAND (Already configured for testnet) ==============
ALGORAND_ALGOD_SERVER=https://testnet-api.algonode.cloud
USDC_ASSET_ID=10458941
```

**Create frontend .env file:**

```bash
cd ../frontend
cp .env.example .env
```

📂 **File location:** `/home/user/algopay-plus/frontend/.env`

**Replace these values:**

```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SUPABASE_URL=https://htugrxwhoojenhooaohk.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ... (your anon key from Step 2)
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_... (your publishable key from Step 3)
REACT_APP_ALGORAND_ALGOD_SERVER=https://testnet-api.algonode.cloud
REACT_APP_USDC_ASSET_ID=10458941
```

---

### PHASE 2: Apply Database Migrations

**What are migrations?** They add new tables to your database (like adding new filing cabinets to your office).

**You have 4 pending migrations to apply:**

#### ✅ Step 5: Run Migration 008 (Shop & Storage)

**This adds:**
- Shop items (exclusive content for donors)
- Storage connections (S3, R2, etc.)
- Social media connections
- Payment method tracking
- QR codes for donations

**How to apply:**

1. Go to Supabase: https://supabase.com/dashboard/project/htugrxwhoojenhooaohk
2. Click **"SQL Editor"** (left sidebar)
3. Click **"New Query"**
4. Open this file: `/home/user/algopay-plus/database/migrations/008_add_shop_storage_social.sql`
5. Copy **ALL the contents** of that file
6. Paste into Supabase SQL Editor
7. Click **"Run"** (bottom right)
8. ✅ You should see "Success. No rows returned"

---

#### ✅ Step 6: Run Migration 009 (Community Subscribers)

**This adds:**
- Email-only community members
- GDPR-compliant consent tracking
- Subscriber management

**How to apply:**

1. Still in Supabase SQL Editor
2. Click **"New Query"**
3. Open this file: `/home/user/algopay-plus/database/migrations/009_add_community_subscribers.sql`
4. Copy **ALL the contents**
5. Paste into Supabase SQL Editor
6. Click **"Run"**
7. ✅ Success!

---

#### ✅ Step 7: Run Migration 010 (Newsletter System)

**This adds:**
- Newsletter campaigns
- Email templates
- Send tracking
- Analytics

**How to apply:**

1. Click **"New Query"**
2. Open this file: `/home/user/algopay-plus/database/migrations/010_add_newsletter_system.sql`
3. Copy **ALL the contents**
4. Paste into Supabase SQL Editor
5. Click **"Run"**
6. ✅ Success!

---

#### ✅ Step 8: Run Migration 011 (QR Code Scan Tracking)

**This adds:**
- QR code scan tracking function
- Analytics for QR code usage

**How to apply:**

1. Click **"New Query"**
2. Open this file: `/home/user/algopay-plus/database/migrations/011_add_qr_scan_function.sql`
3. Copy **ALL the contents**
4. Paste into Supabase SQL Editor
5. Click **"Run"**
6. ✅ Success!

---

### PHASE 3: Start Development

#### ✅ Step 9: Install Backend Packages

**What does this do?** Downloads all the code libraries your backend needs.

**In your terminal:**

```bash
cd /home/user/algopay-plus/backend
npm install
```

**This will take 2-3 minutes.** You'll see lots of text scroll by - that's normal!

✅ **You'll see:** "added 342 packages" or similar

---

#### ✅ Step 10: Install Frontend Packages

**In your terminal:**

```bash
cd /home/user/algopay-plus/frontend
npm install
```

**This will take 3-5 minutes.**

✅ **You'll see:** "added 1453 packages" or similar

---

#### ✅ Step 11: Start Backend Server

**Open Terminal #1:**

```bash
cd /home/user/algopay-plus/backend
npm run dev
```

✅ **You should see:**
```
🚀 Supportly backend running on http://localhost:3001
📊 Health check: http://localhost:3001/health
✅ Database connected
```

**KEEP THIS TERMINAL OPEN!** The backend server is now running.

---

#### ✅ Step 12: Start Frontend Server

**Open Terminal #2 (new terminal window):**

```bash
cd /home/user/algopay-plus/frontend
npm start
```

✅ **You should see:**
```
Compiled successfully!
You can now view supportly in the browser.
  Local: http://localhost:3000
```

**KEEP THIS TERMINAL OPEN TOO!**

---

#### ✅ Step 13: Test the Website!

**Open your browser and go to:**

🌐 **http://localhost:3000**

✅ **You should see:** The Supportly homepage!

**Test the backend health:**

🌐 **http://localhost:3001/health**

✅ **You should see:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-11-28T..."
}
```

---

### PHASE 4: Add Missing Features

#### ✅ Step 14: Add Suspension Notice to Creator Pages

**What this does:** When a creator's subscription expires, show a notice on their page:

> "⚠️ Creator will return shortly - updates in progress"

**I'll create this for you!** See the next section.

---

#### ✅ Step 15: Test Suspension Notice

**To test this:**

1. Go to Supabase SQL Editor
2. Run this query to simulate a suspended account:

```sql
-- Suspend a test creator
UPDATE creators
SET account_status = 'suspended'
WHERE username = 'testcreator';
```

3. Visit: http://localhost:3000/@testcreator
4. ✅ You should see the suspension notice!

**To unsuspend:**

```sql
UPDATE creators
SET account_status = 'active'
WHERE username = 'testcreator';
```

---

#### ✅ Step 16: Choose Color Scheme and Logo

**Current branding questions:**

1. **Primary color?** (e.g., purple, blue, green)
2. **Logo style?** (text only, icon + text, mascot)
3. **Vibe?** (professional, playful, minimalist, bold)

**I've prepared some color scheme options for you below!**

---

### PHASE 5: Deploy to Internet (Optional)

**For now, SKIP THIS!**

**Why?** You should:
1. Test everything locally first
2. Create some demo creator pages
3. Run test donations
4. Make sure everything works

**Then we'll deploy later.**

**Benefits of deploying:**
- ✅ Real URL (not localhost)
- ✅ Test on phones
- ✅ Share with others
- ✅ Supabase is already hosted (no extra work)

**When you're ready to deploy, I'll help you!**

---

## 🎨 Color Scheme & Branding Options

Since you haven't picked colors yet, here are **3 complete themes:**

### Option 1: "Supportly Purple" (Warm & Friendly)
```
Primary: #8B5CF6 (Purple)
Secondary: #EC4899 (Pink)
Accent: #F59E0B (Amber)
Background: #FFFFFF (White)
Text: #1F2937 (Dark Gray)

Vibe: Warm, approachable, creator-focused
Best for: Artists, content creators, musicians
```

### Option 2: "Trust Blue" (Professional & Reliable)
```
Primary: #3B82F6 (Blue)
Secondary: #10B981 (Green)
Accent: #F59E0B (Orange)
Background: #F9FAFB (Light Gray)
Text: #111827 (Almost Black)

Vibe: Professional, trustworthy, financial
Best for: Tech creators, educators, coaches
```

### Option 3: "Bold Teal" (Modern & Energetic)
```
Primary: #14B8A6 (Teal)
Secondary: #8B5CF6 (Purple)
Accent: #EF4444 (Red)
Background: #FFFFFF (White)
Text: #0F172A (Navy)

Vibe: Modern, energetic, innovative
Best for: Streamers, gamers, tech content
```

**Which one do you like?** Or want a custom color?

---

## 📝 Migration Files - Quick Reference

**Location:** `/home/user/algopay-plus/database/migrations/`

| File | Status | What It Does |
|------|--------|--------------|
| `001_enhance_subscriptions.sql` | ✅ Applied | Subscription history, invoices |
| `002_add_discord_integration.sql` | ✅ Applied | Discord webhooks |
| `003_add_zapier_integration.sql` | ✅ Applied | Zapier automation |
| `004_add_quickbooks_integration.sql` | ✅ Applied | QuickBooks sync |
| `005_add_social_media_integration.sql` | ✅ Applied | Social media posts |
| `006_add_digital_products.sql` | ✅ Applied | Digital product sales |
| `007_add_account_status.sql` | ✅ Applied | **Account suspension system** |
| `008_add_shop_storage_social.sql` | ⏳ **PENDING** | Shop items, storage, QR codes |
| `009_add_community_subscribers.sql` | ⏳ **PENDING** | Email community members |
| `010_add_newsletter_system.sql` | ⏳ **PENDING** | Newsletter campaigns |
| `011_add_qr_scan_function.sql` | ⏳ **PENDING** | QR code tracking |

---

## 🚨 Common Beginner Mistakes (And How to Avoid Them)

### ❌ Mistake #1: Forgetting to replace [PASSWORD] in DATABASE_URL
**Fix:** Make sure you put your actual Supabase password in the DATABASE_URL

### ❌ Mistake #2: Mixing up test keys and live keys
**Fix:** Always use `pk_test_` and `sk_test_` keys from Stripe (NOT `pk_live_`)

### ❌ Mistake #3: Not keeping terminal windows open
**Fix:** You need BOTH terminals running (backend AND frontend)

### ❌ Mistake #4: Running migrations twice
**Fix:** If you accidentally run a migration twice, it's OK! The `IF NOT EXISTS` checks prevent duplicates.

### ❌ Mistake #5: Forgetting to save .env files
**Fix:** After editing .env, press Ctrl+S (Windows) or Cmd+S (Mac) to save!

---

## 📞 What To Do If You Get Stuck

### Backend won't start?
**Check:**
1. Is your `.env` file in `/home/user/algopay-plus/backend/.env`?
2. Did you replace ALL the placeholder values?
3. Is your Supabase password correct?

**Test database connection:**
```bash
cd /home/user/algopay-plus/backend
node -e "const {createClient} = require('@supabase/supabase-js'); const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY); console.log('Connected!');"
```

### Frontend shows errors?
**Check:**
1. Is backend running? (Check Terminal #1)
2. Did you create `/home/user/algopay-plus/frontend/.env`?
3. Open browser console (F12) and look for error messages

### Migrations fail?
**Check:**
1. Are you logged into the correct Supabase project? (`htugrxwhoojenhooaohk`)
2. Did you copy the ENTIRE migration file?
3. Look at the error message - it usually tells you what's wrong

---

## 🎯 What Happens Next?

After you complete these steps, you'll have:

✅ A fully working Supportly platform on your computer
✅ Auto-repayment system for creators ($49.95/year via Stripe)
✅ Account suspension system (7-day grace period)
✅ Database with all tables created
✅ Backend API running (40+ endpoints)
✅ Frontend React app running
✅ Testnet configuration (safe to experiment!)

**Then we'll add:**
1. ⏳ Suspension notice banner on creator pages
2. ⏳ Newsletter composer UI
3. ⏳ Community subscriber management UI
4. ⏳ Your chosen branding and colors

---

## 🎉 You're Ready!

**Start with Step 1** and work through each phase.

**Don't rush!** Take your time, read each step carefully.

**Questions?** Just ask! I'm here to help.

**Let me know when you:**
1. Complete Phase 1 (setup)
2. Complete Phase 2 (migrations)
3. Complete Phase 3 (servers running)

Then I'll help you with Phase 4 (adding the suspension notice and branding)!

---

**You've got this! 🚀**
