-- =====================================================
-- MIGRATION: Add Password Auth and Social Media Fields
-- =====================================================

-- 1. Add password field for traditional authentication
ALTER TABLE creators
ADD COLUMN password_hash TEXT;

-- 2. Make wallet_address optional (not required for all creators)
ALTER TABLE creators
ALTER COLUMN wallet_address DROP NOT NULL;

-- 3. Drop the unique constraint on wallet_address temporarily
ALTER TABLE creators
DROP CONSTRAINT IF EXISTS creators_wallet_address_key;

-- 4. Add unique constraint that allows NULL values
CREATE UNIQUE INDEX creators_wallet_address_unique
ON creators(wallet_address)
WHERE wallet_address IS NOT NULL;

-- 5. Add new social media fields
ALTER TABLE creators
ADD COLUMN instagram_url TEXT,
ADD COLUMN tiktok_url TEXT,
ADD COLUMN linkedin_url TEXT,
ADD COLUMN facebook_url TEXT;

-- 6. Add payment method preferences for creator subscriptions
ALTER TABLE creators
ADD COLUMN subscription_payment_method TEXT DEFAULT 'stripe';
-- Options: 'stripe', 'usdc', 'pera', 'noah', 'paypal'

-- 7. Add email as required field with constraint
-- First update any null emails
UPDATE creators SET email = username || '@temp.supportly.io' WHERE email IS NULL;

-- Then add NOT NULL constraint
ALTER TABLE creators
ALTER COLUMN email SET NOT NULL;

-- 8. Update subscription tier pricing (drop old tiers)
-- Update existing subscriptions to new flat rate
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
ADD CONSTRAINT creators_subscription_payment_method_check
CHECK (subscription_payment_method IN ('stripe', 'usdc', 'pera', 'noah', 'paypal'));

-- 11. Update creators table default subscription tier
ALTER TABLE creators
ALTER COLUMN subscription_tier SET DEFAULT 'annual';

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN creators.password_hash IS 'Bcrypt hashed password for traditional auth';
COMMENT ON COLUMN creators.wallet_address IS 'Optional Algorand wallet address for crypto features';
COMMENT ON COLUMN creators.instagram_url IS 'Creator Instagram profile URL';
COMMENT ON COLUMN creators.tiktok_url IS 'Creator TikTok profile URL';
COMMENT ON COLUMN creators.linkedin_url IS 'Creator LinkedIn profile URL';
COMMENT ON COLUMN creators.facebook_url IS 'Creator Facebook profile URL';
COMMENT ON COLUMN creators.subscription_payment_method IS 'Payment method used for creator subscription';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration 002 completed successfully!' as status;
