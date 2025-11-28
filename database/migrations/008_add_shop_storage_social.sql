-- =====================================================
-- Migration 008: Add Donor Shop, Storage Connections, and Social Media
-- =====================================================

-- Page Builder Sessions (for anonymous page building before purchase)
CREATE TABLE IF NOT EXISTS page_builder_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  config JSONB NOT NULL, -- All builder choices (logo, payment methods, social media, etc.)
  logo_temp_url TEXT, -- Temporarily stored logo (24h expiry)
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '24 hours',
  converted_to_creator_id UUID REFERENCES creators(id) ON DELETE SET NULL,
  INDEX idx_builder_sessions_email (email),
  INDEX idx_builder_sessions_token (session_token),
  INDEX idx_builder_sessions_expires (expires_at)
);

-- Donor Shop Items
CREATE TABLE IF NOT EXISTS shop_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2), -- NULL for free items
  is_exclusive BOOLEAN DEFAULT true, -- Only for donors
  required_donation_amount DECIMAL(10, 2), -- Min donation to access (NULL = any amount)
  for_wings_only BOOLEAN DEFAULT false, -- Only Wings (recurring) subscribers
  stock_quantity INTEGER, -- NULL = unlimited
  current_stock INTEGER DEFAULT 0,
  storage_url TEXT, -- Link to S3/R2/etc where actual file is stored
  storage_provider TEXT, -- 's3', 'r2', 'b2', 'spaces', 'gcs', 'custom'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_shop_items_creator (creator_id),
  INDEX idx_shop_items_active (is_active)
);

-- Donor Shop Access Tokens (for accessing exclusive shop items)
CREATE TABLE IF NOT EXISTS shop_access_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  donor_wallet TEXT,
  donor_email TEXT,
  donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  token_value DECIMAL(10, 2) NOT NULL, -- How much they donated
  is_wings_subscriber BOOLEAN DEFAULT false, -- Recurring supporter
  wings_subscription_id TEXT, -- External subscription ID (Stripe, PayPal, etc.)
  expires_at TIMESTAMP, -- NULL for Wings = unlimited access
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_shop_tokens_creator (creator_id),
  INDEX idx_shop_tokens_token (token),
  INDEX idx_shop_tokens_wings (is_wings_subscriber),
  INDEX idx_shop_tokens_expires (expires_at)
);

-- Shop Item Purchases (tracking what donors have claimed)
CREATE TABLE IF NOT EXISTS shop_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_item_id UUID REFERENCES shop_items(id) ON DELETE CASCADE,
  access_token_id UUID REFERENCES shop_access_tokens(id) ON DELETE CASCADE,
  donor_wallet TEXT,
  donor_email TEXT,
  purchased_at TIMESTAMP DEFAULT NOW(),
  download_url TEXT, -- Temporary signed URL (expires in 24h)
  download_expires_at TIMESTAMP,
  times_downloaded INTEGER DEFAULT 0,
  INDEX idx_shop_purchases_item (shop_item_id),
  INDEX idx_shop_purchases_token (access_token_id)
);

-- Creator Storage Connections (connect creator's own S3/R2/etc buckets)
CREATE TABLE IF NOT EXISTS creator_storage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('s3', 'r2', 'b2', 'spaces', 'gcs', 'custom')),
  bucket_name TEXT,
  region TEXT,
  endpoint_url TEXT, -- For custom S3-compatible services
  access_key_encrypted TEXT NOT NULL, -- Encrypted with AES-256-GCM
  secret_key_encrypted TEXT NOT NULL, -- Encrypted with AES-256-GCM
  encryption_iv TEXT NOT NULL, -- Initialization vector for decryption
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Primary storage for this creator
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(creator_id, provider, bucket_name),
  INDEX idx_creator_storage_creator (creator_id),
  INDEX idx_creator_storage_active (is_active)
);

-- Social Media Connections (connect creator's social media accounts)
CREATE TABLE IF NOT EXISTS social_media_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter', 'x', 'instagram', 'youtube', 'tiktok', 'facebook', 'linkedin', 'twitch', 'discord')),
  username TEXT,
  profile_url TEXT,
  auto_post_enabled BOOLEAN DEFAULT false, -- Auto-post donation thank-yous
  api_key_encrypted TEXT, -- For platforms with API access
  api_secret_encrypted TEXT,
  encryption_iv TEXT,
  oauth_token_encrypted TEXT, -- For OAuth platforms
  oauth_refresh_token_encrypted TEXT,
  is_verified BOOLEAN DEFAULT false, -- Verified ownership
  is_active BOOLEAN DEFAULT true,
  last_post_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(creator_id, platform),
  INDEX idx_social_connections_creator (creator_id),
  INDEX idx_social_connections_platform (platform),
  INDEX idx_social_connections_active (is_active)
);

-- Creator Payment Methods (which payment methods each creator accepts)
CREATE TABLE IF NOT EXISTS creator_payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('stripe', 'paypal', 'pera', 'lightning', 'circle', 'noah', 'cashapp')),
  is_enabled BOOLEAN DEFAULT true,

  -- Payment provider credentials (all encrypted)
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  webhook_secret_encrypted TEXT,
  encryption_iv TEXT,

  -- Account identifiers
  account_identifier TEXT, -- Wallet address, PayPal email, Stripe account ID, etc.
  account_type TEXT, -- 'mainnet', 'testnet', 'sandbox', 'production'

  -- Method-specific configuration
  config JSONB, -- Flexible storage for method-specific settings

  -- Status
  is_verified BOOLEAN DEFAULT false, -- Verified the credentials work
  last_verified_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(creator_id, method),
  INDEX idx_payment_methods_creator (creator_id),
  INDEX idx_payment_methods_enabled (is_enabled)
);

-- QR Codes for Donations (creators can generate QR codes for offline donations)
CREATE TABLE IF NOT EXISTS donation_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  qr_code_id TEXT UNIQUE NOT NULL, -- Short ID for the QR code (e.g., 'QR-ABC123')
  payment_method TEXT NOT NULL, -- Which payment method this QR is for
  amount DECIMAL(10, 2), -- Preset amount, NULL = donor chooses
  description TEXT, -- What this QR code is for
  qr_image_url TEXT, -- Generated QR code image
  page_url TEXT, -- URL the QR code points to
  times_scanned INTEGER DEFAULT 0,
  total_donations_received DECIMAL(10, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- NULL = never expires
  INDEX idx_qr_codes_creator (creator_id),
  INDEX idx_qr_codes_id (qr_code_id),
  INDEX idx_qr_codes_active (is_active)
);

-- Update donations table to track Boost vs Wings
ALTER TABLE donations ADD COLUMN IF NOT EXISTS donation_type TEXT DEFAULT 'boost' CHECK (donation_type IN ('boost', 'wings'));
ALTER TABLE donations ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE donations ADD COLUMN IF NOT EXISTS recurring_subscription_id TEXT; -- External subscription ID
ALTER TABLE donations ADD COLUMN IF NOT EXISTS recurring_frequency TEXT; -- 'monthly', 'yearly'

-- Indexes for new donation fields
CREATE INDEX IF NOT EXISTS idx_donations_type ON donations(donation_type);
CREATE INDEX IF NOT EXISTS idx_donations_recurring ON donations(is_recurring);
CREATE INDEX IF NOT EXISTS idx_donations_subscription ON donations(recurring_subscription_id);

-- Comments
COMMENT ON TABLE page_builder_sessions IS 'Temporary sessions for anonymous page building before purchase';
COMMENT ON TABLE shop_items IS 'Exclusive items/content creators can offer to donors';
COMMENT ON TABLE shop_access_tokens IS 'Access tokens for donors to claim shop items';
COMMENT ON TABLE shop_purchases IS 'Record of shop items claimed by donors';
COMMENT ON TABLE creator_storage IS 'Creator-owned storage bucket connections (S3, R2, etc.)';
COMMENT ON TABLE social_media_connections IS 'Creator social media account connections';
COMMENT ON TABLE creator_payment_methods IS 'Payment methods each creator accepts';
COMMENT ON TABLE donation_qr_codes IS 'QR codes for offline/print donations';

COMMENT ON COLUMN donations.donation_type IS '"boost" for one-time, "wings" for recurring';
COMMENT ON COLUMN donations.is_recurring IS 'True if this is a recurring Wings subscription';

-- =====================================================
-- Security: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE page_builder_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_qr_codes ENABLE ROW LEVEL SECURITY;

-- Page builder sessions: Public can create, creator can view their own
CREATE POLICY "Public can create page builder sessions" ON page_builder_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own sessions" ON page_builder_sessions
  FOR SELECT USING (email = current_setting('app.user_email', true));

-- Shop items: Public can view active items, creators can manage their own
CREATE POLICY "Public can view active shop items" ON shop_items
  FOR SELECT USING (is_active = true);

CREATE POLICY "Creators can manage their own shop items" ON shop_items
  FOR ALL USING (creator_id = current_setting('app.user_id', true)::uuid);

-- Shop access tokens: Donors can view their own
CREATE POLICY "Donors can view their own tokens" ON shop_access_tokens
  FOR SELECT USING (
    donor_wallet = current_setting('app.user_wallet', true) OR
    donor_email = current_setting('app.user_email', true)
  );

-- Storage: Only creator can view/manage
CREATE POLICY "Creators can manage their own storage" ON creator_storage
  FOR ALL USING (creator_id = current_setting('app.user_id', true)::uuid);

-- Social media: Public can view, creator can manage
CREATE POLICY "Public can view active social connections" ON social_media_connections
  FOR SELECT USING (is_active = true);

CREATE POLICY "Creators can manage their own social connections" ON social_media_connections
  FOR ALL USING (creator_id = current_setting('app.user_id', true)::uuid);

-- Payment methods: Only creator can view/manage (sensitive!)
CREATE POLICY "Creators can manage their own payment methods" ON creator_payment_methods
  FOR ALL USING (creator_id = current_setting('app.user_id', true)::uuid);

-- QR codes: Public can view active, creator can manage
CREATE POLICY "Public can view active QR codes" ON donation_qr_codes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Creators can manage their own QR codes" ON donation_qr_codes
  FOR ALL USING (creator_id = current_setting('app.user_id', true)::uuid);

-- =====================================================
-- Functions for Shop Access
-- =====================================================

-- Function to check if a donor has access to a shop item
CREATE OR REPLACE FUNCTION check_shop_access(
  p_item_id UUID,
  p_token TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_item shop_items%ROWTYPE;
  v_token shop_access_tokens%ROWTYPE;
BEGIN
  -- Get shop item
  SELECT * INTO v_item FROM shop_items WHERE id = p_item_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Get access token
  SELECT * INTO v_token FROM shop_access_tokens WHERE token = p_token;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if token is for this creator
  IF v_token.creator_id != v_item.creator_id THEN
    RETURN false;
  END IF;

  -- Check if token has expired
  IF v_token.expires_at IS NOT NULL AND v_token.expires_at < NOW() THEN
    RETURN false;
  END IF;

  -- Check if item requires Wings and token is not Wings
  IF v_item.for_wings_only AND NOT v_token.is_wings_subscriber THEN
    RETURN false;
  END IF;

  -- Check if item requires minimum donation
  IF v_item.required_donation_amount IS NOT NULL AND
     v_token.token_value < v_item.required_donation_amount THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate shop access token after donation
CREATE OR REPLACE FUNCTION generate_shop_token(
  p_donation_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_donation donations%ROWTYPE;
  v_token TEXT;
  v_expires_at TIMESTAMP;
BEGIN
  -- Get donation
  SELECT * INTO v_donation FROM donations WHERE id = p_donation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Donation not found';
  END IF;

  -- Generate unique token
  v_token := encode(gen_random_bytes(32), 'base64');

  -- Set expiry: Wings = NULL (never expires), Boost = 1 year
  IF v_donation.is_recurring THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := NOW() + INTERVAL '1 year';
  END IF;

  -- Insert access token
  INSERT INTO shop_access_tokens (
    creator_id,
    donor_wallet,
    donor_email,
    donation_id,
    token,
    token_value,
    is_wings_subscriber,
    wings_subscription_id,
    expires_at
  ) VALUES (
    v_donation.creator_id,
    v_donation.donor_wallet,
    v_donation.donor_email,
    v_donation.id,
    v_token,
    v_donation.amount,
    v_donation.is_recurring,
    v_donation.recurring_subscription_id,
    v_expires_at
  );

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Triggers
-- =====================================================

-- Auto-generate shop token after donation
CREATE OR REPLACE FUNCTION auto_generate_shop_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    PERFORM generate_shop_token(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_shop_token
  AFTER UPDATE ON donations
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_shop_token();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shop_items_updated_at
  BEFORE UPDATE ON shop_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_creator_storage_updated_at
  BEFORE UPDATE ON creator_storage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_social_connections_updated_at
  BEFORE UPDATE ON social_media_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_payment_methods_updated_at
  BEFORE UPDATE ON creator_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
