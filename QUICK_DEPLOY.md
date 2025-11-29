# Quick Deploy Guide - Payment Keys Update

Follow these steps to deploy the payment keys feature.

## ⚡ Quick Steps

### 1. Update Supabase (2 minutes)

**Go to:** https://app.supabase.com/project/jygcuixcfjsndutjpomu

1. Click **SQL Editor** (left sidebar)
2. Click **New Query**
3. **Copy & paste** this SQL:

```sql
-- Add payment keys columns
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}'::jsonb;

-- Add documentation
COMMENT ON COLUMN creators.stripe_account_id IS 'Stripe Connect account ID';
COMMENT ON COLUMN creators.stripe_publishable_key IS 'Stripe publishable key';
COMMENT ON COLUMN creators.payment_settings IS 'Payment configuration JSON';

-- Verify
SELECT 'Migration completed!' as status;
```

4. Click **RUN** ▶️
5. ✅ Should see "Migration completed!"

---

### 2. Deploy Backend to Railway (5 minutes)

**Option A - Railway Dashboard:**

1. Go to https://railway.app
2. Find your AlgoPay backend project
3. Click **"Deploy"** or **"Redeploy"**
4. Wait for deployment to complete
5. ✅ Check health: `https://your-backend.railway.app/health`

**Option B - Git Push (if auto-deploy enabled):**

```bash
# Your changes are already committed
# Just merge to your main/production branch
git checkout main
git merge claude/algorand-email-notifications-01CShn1ALRoikaUP8oChiTZ7
git push origin main

# Railway will auto-deploy
```

**Option C - Railway CLI:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
cd backend
railway up
```

---

### 3. Deploy Frontend (5 minutes)

**For Vercel:**

```bash
cd frontend
npx vercel --prod
```

**For Netlify:**

```bash
cd frontend
npm run build
npx netlify deploy --prod --dir=build
```

---

### 4. Test Everything (2 minutes)

1. **Visit your frontend URL**
2. **Click "Get Started"**
3. **Check for new fields:**
   - Should see "Payment Settings (Optional)"
   - Should see "Stripe Account ID" field
   - Should see "Stripe Publishable Key" field
4. **Try creating a test account**
5. ✅ Verify account creates successfully

---

## 🔍 Verification Checklist

Run these checks:

### Database Check:
```sql
-- In Supabase SQL Editor
SELECT column_name FROM information_schema.columns
WHERE table_name = 'creators'
  AND column_name LIKE '%stripe%';
```
✅ Should show: `stripe_account_id`, `stripe_publishable_key`

### Backend Check:
```bash
curl https://your-backend.railway.app/health
```
✅ Should return `{"status": "ok"}`

### Frontend Check:
- Visit signup page
- ✅ New payment fields visible
- ✅ Form still works without payment keys
- ✅ Form accepts payment keys when provided

---

## 🚨 If Something Goes Wrong

### Database migration fails:
- **"Column already exists"** → Migration already ran, you're good!
- **Permission denied** → Check you're using service key, not anon key

### Backend won't deploy:
- Check Railway logs for errors
- Verify environment variables are set
- Check syntax in `backend/server.js`

### Frontend shows old version:
- Clear browser cache (Ctrl+Shift+R)
- Check deployment completed successfully
- Verify you're on production URL, not localhost

---

## 📁 Files Changed

✅ `frontend/src/App.jsx` - Added payment fields to signup
✅ `backend/server.js` - Accepts payment keys
✅ `database/schema.sql` - Added columns
✅ `database/migrations/001_add_payment_keys.sql` - Migration script
✅ `docs/PAYMENT_SETUP.md` - Creator documentation

---

## 📞 Need Help?

See detailed guides:
- **Full deployment guide:** `docs/DEPLOYMENT_UPDATE.md`
- **Payment setup guide:** `docs/PAYMENT_SETUP.md`
- **Update script:** `scripts/update-supabase.sh`

---

**Total time: ~15 minutes** ⏱️

🎉 **Ready to go!** Creators can now configure their own payment settings!
