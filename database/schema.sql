-- =====================================================
-- SUPPORTLY DATABASE SCHEMA
-- Supabase PostgreSQL Database
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CREATORS TABLE
-- =====================================================
CREATE TABLE creators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  email TEXT,
  wallet_address TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  twitter_url TEXT,
  youtube_url TEXT,
  website_url TEXT,
  subscription_tier TEXT DEFAULT 'basic',
  subscription_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_payment')),
  suspension_reason TEXT,
  last_payment_check TIMESTAMP,
  payment_retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for creators
CREATE INDEX idx_creators_username ON creators(username);
CREATE INDEX idx_creators_wallet ON creators(wallet_address);
CREATE INDEX idx_creators_active ON creators(is_active);
CREATE INDEX idx_creators_account_status ON creators(account_status);
CREATE INDEX idx_creators_payment_check ON creators(last_payment_check);

-- =====================================================
-- DONATIONS TABLE
-- =====================================================
CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  donor_wallet TEXT,
  donor_name TEXT,
  donor_email TEXT,
  message TEXT,
  tx_hash TEXT,
  payment_method TEXT DEFAULT 'crypto', -- 'crypto' or 'card'
  status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  nft_minted BOOLEAN DEFAULT false,
  nft_asset_id BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for donations
CREATE INDEX idx_donations_creator ON donations(creator_id);
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_created ON donations(created_at DESC);
CREATE INDEX idx_donations_tx_hash ON donations(tx_hash);

-- =====================================================
-- NFT CONFIGS TABLE
-- =====================================================
CREATE TABLE nft_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  min_donation_amount DECIMAL(10, 2) NOT NULL CHECK (min_donation_amount > 0),
  image_url TEXT NOT NULL,
  max_supply INTEGER DEFAULT 1000,
  current_supply INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for nft_configs
CREATE INDEX idx_nft_configs_creator ON nft_configs(creator_id);
CREATE INDEX idx_nft_configs_active ON nft_configs(active);

-- =====================================================
-- NFTS TABLE (Minted NFTs)
-- =====================================================
CREATE TABLE nfts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID REFERENCES nft_configs(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  owner_wallet TEXT NOT NULL,
  token_id TEXT UNIQUE NOT NULL,
  asset_id BIGINT,
  donation_id UUID REFERENCES donations(id),
  metadata_url TEXT,
  minted_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for nfts
CREATE INDEX idx_nfts_config ON nfts(config_id);
CREATE INDEX idx_nfts_owner ON nfts(owner_wallet);
CREATE INDEX idx_nfts_creator ON nfts(creator_id);

-- =====================================================
-- SUBSCRIPTIONS TABLE (Creator Subscriptions)
-- =====================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  tier TEXT NOT NULL, -- 'basic', 'pro', 'premium'
  status TEXT DEFAULT 'active', -- 'active', 'canceled', 'expired'
  amount DECIMAL(10, 2) NOT NULL,
  payment_tx_hash TEXT,
  starts_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_creator ON subscriptions(creator_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);

-- =====================================================
-- CONTENT TABLE (For Content Gating - Future)
-- =====================================================
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL, -- 'video', 'image', 'post', 'file'
  content_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_gated BOOLEAN DEFAULT false,
  required_nft_config_id UUID REFERENCES nft_configs(id),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for content
CREATE INDEX idx_content_creator ON content(creator_id);
CREATE INDEX idx_content_gated ON content(is_gated);

-- =====================================================
-- ANALYTICS EVENTS TABLE (Optional - for detailed tracking)
-- =====================================================
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'page_view', 'donation_attempt', 'wallet_connect', etc.
  event_data JSONB,
  user_wallet TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics_events
CREATE INDEX idx_analytics_creator ON analytics_events(creator_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);

-- =====================================================
-- EMAIL PREFERENCES TABLE
-- =====================================================
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,
  welcome_email BOOLEAN DEFAULT true,
  donation_notifications BOOLEAN DEFAULT true,
  weekly_reports BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ACCOUNT STATUS HISTORY TABLE
-- =====================================================
CREATE TABLE account_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by TEXT, -- 'system' or admin user ID
  metadata JSONB, -- Additional context like payment details, admin notes, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for account status history
CREATE INDEX idx_account_status_history_creator ON account_status_history(creator_id);
CREATE INDEX idx_account_status_history_created ON account_status_history(created_at DESC);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to creators
CREATE TRIGGER update_creators_updated_at
BEFORE UPDATE ON creators
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to nft_configs
CREATE TRIGGER update_nft_configs_updated_at
BEFORE UPDATE ON nft_configs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to content
CREATE TRIGGER update_content_updated_at
BEFORE UPDATE ON content
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically log account status changes
CREATE OR REPLACE FUNCTION log_account_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if account_status actually changed
  IF (OLD.account_status IS DISTINCT FROM NEW.account_status) THEN
    INSERT INTO account_status_history (
      creator_id,
      old_status,
      new_status,
      reason,
      changed_by,
      metadata
    ) VALUES (
      NEW.id,
      OLD.account_status,
      NEW.account_status,
      NEW.suspension_reason,
      'system',
      jsonb_build_object(
        'payment_retry_count', NEW.payment_retry_count,
        'last_payment_check', NEW.last_payment_check
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log status changes
CREATE TRIGGER log_creator_status_change
AFTER UPDATE ON creators
FOR EACH ROW
EXECUTE FUNCTION log_account_status_change();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_status_history ENABLE ROW LEVEL SECURITY;

-- Public read access to creators (for donation pages)
CREATE POLICY "Creators are viewable by everyone"
ON creators FOR SELECT
USING (is_active = true);

-- Creators can update their own data
CREATE POLICY "Creators can update own data"
ON creators FOR UPDATE
USING (auth.uid()::text = id::text);

-- Public read access to donations (anonymized)
CREATE POLICY "Donations are viewable by everyone"
ON donations FOR SELECT
USING (true);

-- Anyone can create donations
CREATE POLICY "Anyone can create donations"
ON donations FOR INSERT
WITH CHECK (true);

-- Public read access to NFT configs
CREATE POLICY "NFT configs are viewable by everyone"
ON nft_configs FOR SELECT
USING (active = true);

-- Creators can manage their NFT configs
CREATE POLICY "Creators can manage own NFT configs"
ON nft_configs FOR ALL
USING (auth.uid()::text = creator_id::text);

-- Public read access to content
CREATE POLICY "Content is viewable based on gating"
ON content FOR SELECT
USING (NOT is_gated OR creator_id IN (
  SELECT creator_id FROM nfts WHERE owner_wallet = auth.uid()::text
));

-- Creators can view their own status history
CREATE POLICY "Creators can view own status history"
ON account_status_history FOR SELECT
USING (auth.uid()::text = creator_id::text);

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert a sample creator (uncomment for testing)
-- INSERT INTO creators (username, display_name, bio, email, wallet_address)
-- VALUES (
--   'testcreator',
--   'Test Creator',
--   'A test creator account for development',
--   'test@example.com',
--   'LZWWTDBHVJKYHFAKCJ3BIQICLZR67OALLE26NL4NTQXLUUHEBNEKHLCHA'
-- );

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Creator revenue summary view
CREATE OR REPLACE VIEW creator_revenue_summary AS
SELECT
  c.id as creator_id,
  c.username,
  c.display_name,
  COUNT(d.id) as total_donations,
  COALESCE(SUM(d.amount), 0) as total_revenue,
  COUNT(DISTINCT d.donor_wallet) as unique_supporters,
  COALESCE(AVG(d.amount), 0) as avg_donation
FROM creators c
LEFT JOIN donations d ON c.id = d.creator_id AND d.status = 'completed'
GROUP BY c.id, c.username, c.display_name;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE creators IS 'Creator accounts and profiles';
COMMENT ON TABLE donations IS 'Donation records from supporters to creators';
COMMENT ON TABLE nft_configs IS 'NFT reward tier configurations';
COMMENT ON TABLE nfts IS 'Minted NFT records';
COMMENT ON TABLE subscriptions IS 'Creator subscription payments to use the platform';
COMMENT ON TABLE content IS 'Content uploads for gating features';
COMMENT ON TABLE analytics_events IS 'Detailed event tracking for analytics';
COMMENT ON TABLE email_preferences IS 'Email notification preferences for creators';
COMMENT ON TABLE account_status_history IS 'Audit log of all account status changes for creators';

-- =====================================================
-- GRANTS (Adjust based on your Supabase setup)
-- =====================================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- DATABASE SETUP COMPLETE
-- =====================================================

SELECT 'Database schema created successfully!' as status;
