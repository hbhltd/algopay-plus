-- =====================================================
-- MIGRATION: Add Payment Keys to Creators Table
-- Date: 2025-11-29
-- Description: Adds Stripe payment configuration fields
-- =====================================================

-- Add new columns to creators table
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_publishable_key TEXT,
ADD COLUMN IF NOT EXISTS payment_settings JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN creators.stripe_account_id IS 'Stripe Connect account ID for direct payments';
COMMENT ON COLUMN creators.stripe_publishable_key IS 'Stripe publishable key for creator account';
COMMENT ON COLUMN creators.payment_settings IS 'JSON configuration for payment preferences and settings';

-- Verify migration
SELECT 'Payment keys migration completed successfully!' as status;
