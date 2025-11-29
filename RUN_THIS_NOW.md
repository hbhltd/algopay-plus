# ⚡ URGENT: Run Database Migration on Production Supabase

Your environment has been updated to point to production Supabase!

**Production Supabase:** https://htugrxwhoojenhooaohk.supabase.co

---

## 🎯 Step 1: Run This SQL NOW (2 minutes)

**Go here:** https://supabase.com/dashboard/project/htugrxwhoojenhooaohk/sql/new

**Copy this ENTIRE SQL block and click RUN:**

```sql
-- Add payment keys columns to creators table
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}'::jsonb;

-- Add comments
COMMENT ON COLUMN creators.stripe_account_id IS 'Stripe Connect account ID';
COMMENT ON COLUMN creators.stripe_publishable_key IS 'Stripe publishable key';  
COMMENT ON COLUMN creators.payment_settings IS 'Payment configuration JSON';

-- Verify it worked
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'creators'
  AND column_name IN ('stripe_account_id', 'stripe_publishable_key', 'payment_settings');
```

✅ **You should see 3 rows returned showing the new columns**

---

## 🔑 Step 2: Get Your Service Key

You need to update your backend with the Supabase SERVICE KEY:

1. **Go here:** https://supabase.com/dashboard/project/htugrxwhoojenhooaohk/settings/api
2. Find **"service_role"** key
3. Click **"Reveal"** and copy it
4. It's a long JWT token starting with `eyJhbGci...`

**Update backend/.env locally:**
```env
SUPABASE_SERVICE_KEY=<paste-your-service-key-here>
```

⚠️ **IMPORTANT:** Don't share this key! It has full database access.

---

## 🚂 Step 3: Update Railway Environment Variables

**In Railway Dashboard:**

1. Go to your AlgoPay backend project
2. **Settings → Variables**
3. **Update or add these:**
   ```
   SUPABASE_URL=https://htugrxwhoojenhooaohk.supabase.co
   SUPABASE_KEY=sb_publishable_yrmks0E2VZmVLxEojI-92Q_Cn6XaJQf
   SUPABASE_SERVICE_KEY=<your-service-key-from-step-2>
   ```
4. Click **"Redeploy"**

---

## ✅ Quick Verification

After Railway deploys, test:

```bash
curl https://your-backend-url.railway.app/health
```

Should return: `{"status": "ok", "services": {"database": "connected", ...}}`

---

## 📁 What Changed

✅ **Your local .env files** now point to production Supabase:
   - `backend/.env` - Updated SUPABASE_URL
   - `frontend/.env` - Updated REACT_APP_SUPABASE_URL

✅ **Database migration ready** in:
   - `database/migrations/001_add_payment_keys.sql`

✅ **Code is ready:**
   - Backend accepts payment keys
   - Frontend shows payment settings fields
   - All committed and pushed to Git

---

## 🆘 Problems?

**"Column already exists"** → Good! Migration already ran.

**"Permission denied"** → Make sure you're logged into correct Supabase account.

**Backend won't connect** → Double-check you used the SERVICE KEY (not publishable key).

---

**See PRODUCTION_DEPLOY.md for full details**

🚀 **START WITH STEP 1 - RUN THE SQL!**
