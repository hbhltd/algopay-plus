# 🚀 Deploy New Features to Production

## Changes to Deploy:
- ✅ Password authentication
- ✅ Optional wallet (no longer required)
- ✅ Flat $49.95/year pricing
- ✅ Multiple payment methods
- ✅ Social media integration (Twitter, YouTube, Instagram, TikTok, LinkedIn, Facebook)

---

## Step 1: Run Database Migration (REQUIRED)

**Go to:** https://supabase.com/dashboard/project/htugrxwhoojenhooaohk/sql/new

**Copy and paste this SQL, then click RUN:**

```sql
-- =====================================================
-- MIGRATION: Add Password Auth and Social Media Fields
-- =====================================================

-- 1. Add password field for traditional authentication
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- 2. Make wallet_address optional (not required for all creators)
ALTER TABLE creators
ALTER COLUMN wallet_address DROP NOT NULL;

-- 3. Drop the unique constraint on wallet_address temporarily
ALTER TABLE creators
DROP CONSTRAINT IF EXISTS creators_wallet_address_key;

-- 4. Add unique constraint that allows NULL values
DROP INDEX IF EXISTS creators_wallet_address_unique;
CREATE UNIQUE INDEX creators_wallet_address_unique
ON creators(wallet_address)
WHERE wallet_address IS NOT NULL;

-- 5. Add new social media fields
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS tiktok_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- 6. Add payment method preferences for creator subscriptions
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS subscription_payment_method TEXT DEFAULT 'stripe';

-- 7. Make email required (update any null emails first)
UPDATE creators SET email = username || '@temp.supportly.io' WHERE email IS NULL;
ALTER TABLE creators
ALTER COLUMN email SET NOT NULL;

-- 8. Update subscription tier pricing (drop old tiers)
UPDATE subscriptions
SET tier = 'annual', amount = 49.95
WHERE tier IN ('basic', 'pro', 'premium');

-- 9. Add check constraint for valid subscription tiers
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_tier_check
CHECK (tier IN ('annual'));

-- 10. Add check constraint for valid payment methods
ALTER TABLE creators
DROP CONSTRAINT IF EXISTS creators_subscription_payment_method_check;

ALTER TABLE creators
ADD CONSTRAINT creators_subscription_payment_method_check
CHECK (subscription_payment_method IN ('stripe', 'usdc', 'pera', 'noah', 'paypal'));

-- 11. Update creators table default subscription tier
ALTER TABLE creators
ALTER COLUMN subscription_tier SET DEFAULT 'annual';

-- Verify migration succeeded
SELECT 'Migration 002 completed successfully!' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'creators'
  AND column_name IN ('password_hash', 'instagram_url', 'tiktok_url', 'linkedin_url',
                      'facebook_url', 'subscription_payment_method', 'wallet_address')
ORDER BY column_name;
```

**Expected Result:** You should see "Migration 002 completed successfully!" and 7 rows showing the new columns.

---

## Step 2: Add JWT_SECRET Environment Variable

You need a secure secret key for JWT token generation.

**Generate a secure random key:**
```bash
# On Mac/Linux
openssl rand -base64 32

# Or use any random string generator
```

**Add to your environment:**

### If deploying to Railway:
1. Go to Railway dashboard → Your backend project
2. **Settings → Variables**
3. Add new variable:
   ```
   JWT_SECRET=<your-secure-random-32-char-string>
   ```

### If running locally for testing:
Update `backend/.env`:
```env
JWT_SECRET=your-secure-random-key-here
```

---

## Step 3: Deploy to Cloud (Railway)

### Option A - If you're using Railway:

1. **Push your code to main/master branch** (or create PR and merge)
   ```bash
   git checkout main
   git merge claude/algorand-email-notifications-01CShn1ALRoikaUP8oChiTZ7
   git push origin main
   ```

2. **Railway will auto-deploy** if you have it connected to GitHub

3. **Verify deployment:**
   ```bash
   curl https://your-backend-url.railway.app/health
   ```

### Option B - If you're using another host (Vercel, Heroku, etc.):

1. Deploy backend with the new code
2. Make sure these environment variables are set:
   ```
   SUPABASE_URL=https://htugrxwhoojenhooaohk.supabase.co
   SUPABASE_SERVICE_KEY=<your-service-key>
   JWT_SECRET=<your-jwt-secret>
   ```

3. Deploy frontend with updated code
4. Update frontend environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-url
   ```

---

## Step 4: Test Everything

### 1. Test Signup with Password:
- Visit your frontend URL
- Click "Get Started"
- Fill out signup form with:
  - Username
  - Email
  - Password
  - Social media links (optional)
- Should create account WITHOUT requiring wallet

### 2. Test Login:
- Click "Log In"
- Enter email and password
- Should log you in successfully

### 3. Test Optional Wallet:
- During signup, the Pera wallet section should say "Optional Features"
- You should be able to skip it

### 4. Test Creator Page:
- Visit `/@yourusername`
- Social media icons should appear if you added links
- Icons should link to your social profiles

### 5. Test Logout:
- Dashboard should have "Log Out" button
- Should clear session and return to landing page

---

## 🆘 Troubleshooting

**"Invalid token" errors:**
- Make sure JWT_SECRET is set in production environment
- Make sure it's the same value that was used to create tokens

**"Username or email already taken":**
- Database migration ran successfully
- Try different username/email

**Social media icons not showing:**
- Make sure you saved social URLs during signup
- Check browser console for errors

**Can't login with old wallet-only accounts:**
- Old accounts need to set a password
- You may need to create a password reset feature OR
- Manually update password_hash in database for existing users

---

## Current Status:

- ✅ Code changes committed to Git
- ✅ Changes pushed to branch: `claude/algorand-email-notifications-01CShn1ALRoikaUP8oChiTZ7`
- ❌ Database migration NOT yet run on production
- ❌ NOT yet deployed to cloud hosting
- ❌ JWT_SECRET NOT yet set

---

## Quick Checklist:

- [ ] Run database migration SQL in Supabase
- [ ] Set JWT_SECRET environment variable
- [ ] Merge branch to main (or deploy directly)
- [ ] Deploy backend to cloud
- [ ] Deploy frontend to cloud
- [ ] Test signup with password
- [ ] Test login
- [ ] Test creator page shows social icons
- [ ] Test logout

**Estimated Time:** 15-20 minutes

🚀 **Start with Step 1 - Run the database migration!**
