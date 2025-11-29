# Deployment Update Guide - Payment Keys Feature

This guide will help you deploy the new payment keys feature to Supabase and Railway.

## Overview

The payment keys feature adds the ability for creators to configure their own Stripe payment credentials during signup. This requires:

1. **Database migration** - Add new columns to Supabase
2. **Backend deployment** - Deploy updated server.js to Railway
3. **Frontend deployment** - Deploy updated App.jsx to your hosting

---

## Step 1: Update Supabase Database

You need to run the migration to add payment configuration columns to the `creators` table.

### Option A: Supabase SQL Editor (Recommended)

1. **Log into Supabase:**
   - Go to https://app.supabase.com
   - Select your project: `jygcuixcfjsndutjpomu`

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the migration:**
   Copy and paste this SQL:

```sql
-- Add payment keys columns to creators table
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN creators.stripe_account_id IS 'Stripe Connect account ID for direct payments';
COMMENT ON COLUMN creators.stripe_publishable_key IS 'Stripe publishable key for creator account';
COMMENT ON COLUMN creators.payment_settings IS 'JSON configuration for payment preferences and settings';

-- Verify migration
SELECT 'Payment keys migration completed successfully!' as status;
```

4. **Click "Run"** - You should see "Payment keys migration completed successfully!"

5. **Verify:**
   Run this query to confirm the columns exist:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'creators'
  AND column_name IN ('stripe_account_id', 'stripe_publishable_key', 'payment_settings');
```

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref jygcuixcfjsndutjpomu

# Run migration
npx supabase db execute -f database/migrations/001_add_payment_keys.sql
```

---

## Step 2: Deploy Backend to Railway

Your backend code has been updated to handle the new payment keys. Deploy it to Railway:

### Option A: Railway Dashboard (Easiest)

1. **Log into Railway:**
   - Go to https://railway.app
   - Find your AlgoPay Plus backend project

2. **Trigger Deployment:**
   - Railway auto-deploys from Git
   - Go to your project → Settings → "Deploy"
   - Click "Redeploy" or push your latest changes

3. **Verify Environment Variables:**
   Ensure these are set in Railway:
   ```
   NODE_ENV=production
   PORT=3001
   FRONTEND_URL=<your-frontend-url>
   SUPABASE_URL=https://jygcuixcfjsndutjpomu.supabase.co
   SUPABASE_SERVICE_KEY=<your-service-key>
   # ... other variables
   ```

### Option B: Using Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Deploy backend
cd backend
railway up
```

### Option C: Git Push (if configured)

```bash
# Commit your changes (already done)
git push origin claude/algorand-email-notifications-01CShn1ALRoikaUP8oChiTZ7

# Railway will auto-deploy from your main/production branch
# Merge your branch to trigger deployment
```

---

## Step 3: Deploy Frontend

Your frontend has the new payment setup UI. Deploy to your hosting:

### For Vercel:

```bash
cd frontend

# If not already installed
npm install -g vercel

# Deploy
vercel --prod
```

### For Netlify:

```bash
cd frontend

# Build
npm run build

# Deploy (manual upload or CLI)
netlify deploy --prod --dir=build
```

### For Railway (if hosting frontend there):

```bash
cd frontend
railway up
```

---

## Step 4: Verify Deployment

### 1. Check Database Migration

Run this query in Supabase SQL Editor:
```sql
SELECT * FROM creators LIMIT 1;
```

You should see the new columns:
- `stripe_account_id`
- `stripe_publishable_key`
- `payment_settings`

### 2. Test Backend

Check your backend health endpoint:
```bash
curl https://your-backend-url.railway.app/health
```

Should return:
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "stripe": true,
    ...
  }
}
```

### 3. Test Frontend Signup

1. Visit your frontend URL
2. Click "Get Started"
3. Connect wallet
4. Fill out signup form
5. **Verify new fields appear:**
   - "Payment Settings (Optional)" section
   - Stripe Account ID field
   - Stripe Publishable Key field

### 4. Create Test Account

Try creating a test account:
1. Fill in all fields (leave Stripe fields empty)
2. Submit
3. Check Supabase to verify the creator was created
4. Verify `stripe_account_id` and `stripe_publishable_key` are NULL (which is correct)

---

## Rollback (if needed)

If something goes wrong, you can rollback:

### Database Rollback:
```sql
ALTER TABLE creators
DROP COLUMN IF EXISTS stripe_account_id,
DROP COLUMN IF EXISTS stripe_publishable_key,
DROP COLUMN IF EXISTS payment_settings;
```

### Code Rollback:
```bash
# Revert to previous commit
git revert HEAD
git push origin your-branch

# Railway will auto-deploy the rollback
```

---

## Environment Variables

Make sure these are set in Railway (backend):

```env
# Already configured
SUPABASE_URL=https://jygcuixcfjsndutjpomu.supabase.co
SUPABASE_SERVICE_KEY=<your-service-key>

# Platform Stripe keys (optional - for platform payments)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Other required variables
JWT_SECRET=<your-jwt-secret>
EMAIL_PROVIDER=resend
RESEND_API_KEY=<your-resend-key>
EMAIL_FROM=noreply@yourdomain.com
```

Frontend (.env in Vercel/Netlify):
```env
REACT_APP_API_URL=https://your-backend-url.railway.app
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
REACT_APP_ALGORAND_NODE=https://mainnet-api.algonode.cloud
REACT_APP_USDC_ASSET_ID=31566704
```

---

## Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel/Netlify
- [ ] Health check returns 200 OK
- [ ] Signup page shows new payment fields
- [ ] Can create account with payment keys
- [ ] Can create account without payment keys
- [ ] Creator data saves correctly in Supabase

---

## Troubleshooting

### "Column already exists" error
If you see this error in Supabase, the migration already ran. You're good!

### Backend won't start on Railway
- Check Railway logs
- Verify all environment variables are set
- Check for syntax errors in server.js

### Frontend shows old signup form
- Clear browser cache (Ctrl+Shift+R)
- Check if frontend deployed successfully
- Verify you're viewing the production URL

### Payment keys not saving
- Check browser console for errors
- Verify backend is receiving the data (check Railway logs)
- Test the API directly:
```bash
curl -X POST https://your-backend-url/api/creators \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "displayName": "Test User",
    "walletAddress": "TESTADDRESS",
    "stripeAccountId": "acct_test123",
    "stripePublishableKey": "pk_test_123"
  }'
```

---

## Support

If you encounter issues:
1. Check Railway logs for backend errors
2. Check browser console for frontend errors
3. Verify Supabase migration ran successfully
4. Test each component individually

---

**Deployment completed!** 🎉

Your creators can now configure their payment settings during signup.
