# 🚀 Production Deployment - AlgoPay Plus Payment Keys

## Your Production Supabase Instance
**URL:** https://htugrxwhoojenhooaohk.supabase.co
**Project ID:** htugrxwhoojenhooaohk

---

## ⚡ QUICK START (Do This Now!)

### Step 1: Run Database Migration (2 minutes)

**Go directly to:** https://supabase.com/dashboard/project/htugrxwhoojenhooaohk/sql/new

**Copy & Paste this SQL and click RUN:**

```sql
-- =====================================================
-- ADD PAYMENT KEYS TO CREATORS TABLE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add payment configuration columns
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}'::jsonb;

-- Add documentation comments
COMMENT ON COLUMN creators.stripe_account_id IS 'Stripe Connect account ID for direct payments';
COMMENT ON COLUMN creators.stripe_publishable_key IS 'Stripe publishable key for creator account';
COMMENT ON COLUMN creators.payment_settings IS 'JSON configuration for payment preferences and settings';

-- Verify migration succeeded
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'creators'
  AND column_name IN ('stripe_account_id', 'stripe_publishable_key', 'payment_settings')
ORDER BY column_name;

-- Success message
SELECT '✅ Payment keys migration completed successfully!' as status;
```

**Expected Result:** You should see 3 rows showing the new columns and a success message.

---

### Step 2: Get Your Supabase Service Key

⚠️ **IMPORTANT:** Your backend needs the SERVICE KEY (not the publishable key).

1. Go to: https://supabase.com/dashboard/project/htugrxwhoojenhooaohk/settings/api
2. Find **"service_role secret"** - Click "Reveal" and copy it
3. It will look like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long JWT token)

**Update your backend/.env:**
```env
SUPABASE_SERVICE_KEY=eyJhbGci... # Paste your actual service key here
```

---

### Step 3: Deploy Backend to Railway

Your `.env` files are now updated with production Supabase. Deploy to Railway:

**Option A - Railway Dashboard:**
1. Go to https://railway.app
2. Find your AlgoPay backend
3. **Settings → Variables**
4. Update these variables:
   ```
   SUPABASE_URL=https://htugrxwhoojenhooaohk.supabase.co
   SUPABASE_KEY=sb_publishable_yrmks0E2VZmVLxEojI-92Q_Cn6XaJQf
   SUPABASE_SERVICE_KEY=<your-service-key-from-step-2>
   ```
5. **Deploy → Redeploy**

---

## ✅ Verification Steps

### 1. Check Database Migration
Run in Supabase SQL Editor:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'creators'
  AND column_name LIKE '%stripe%';
```
✅ Should return 2 rows: `stripe_account_id`, `stripe_publishable_key`

### 2. Test Signup Form
1. Visit your production frontend URL
2. Click "Get Started"
3. **Scroll down - you should see:**
   - "Payment Settings (Optional)" section
   - Stripe Account ID field
   - Stripe Publishable Key field

---

**Total Time:** ~10 minutes ⏱️

🚀 **Start with Step 1 - Run the database migration!**
