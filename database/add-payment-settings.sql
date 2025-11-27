-- =====================================================
-- ADD PAYMENT SETTINGS TABLE
-- Run this in Supabase SQL Editor to add payment settings
-- =====================================================

-- Create payment_settings table
CREATE TABLE IF NOT EXISTS payment_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID UNIQUE REFERENCES creators(id) ON DELETE CASCADE,

  -- Crypto (Algorand USDC) - Always available since they have wallet
  crypto_enabled BOOLEAN DEFAULT true,

  -- Stripe (Credit Cards, Apple Pay, Google Pay)
  stripe_enabled BOOLEAN DEFAULT false,
  stripe_publishable_key TEXT,
  stripe_secret_key TEXT, -- Encrypted in production

  -- PayPal
  paypal_enabled BOOLEAN DEFAULT false,
  paypal_client_id TEXT,
  paypal_client_secret TEXT, -- Encrypted in production

  -- Cash App
  cashapp_enabled BOOLEAN DEFAULT false,
  cashapp_tag TEXT, -- e.g., $username

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_payment_settings_creator ON payment_settings(creator_id);

-- RLS Policy
ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own payment settings
CREATE POLICY "Creators can manage own payment settings"
ON payment_settings FOR ALL
USING (auth.uid()::text = creator_id::text);

-- Anyone can view payment settings (to know which methods are available)
CREATE POLICY "Payment settings are viewable by everyone"
ON payment_settings FOR SELECT
USING (true);

-- Auto-update timestamp
CREATE TRIGGER update_payment_settings_updated_at
BEFORE UPDATE ON payment_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create default payment settings for existing creators
INSERT INTO payment_settings (creator_id, crypto_enabled)
SELECT id, true FROM creators
ON CONFLICT (creator_id) DO NOTHING;

SELECT 'Payment settings table created successfully!' as status;
