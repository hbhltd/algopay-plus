-- =====================================================
-- Migration 009: Add Community Subscribers (Email List)
-- =====================================================

-- Community Subscribers Table (Email-only subscribers)
CREATE TABLE IF NOT EXISTS community_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  subscribed_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMP,

  -- GDPR Compliance
  consent_given BOOLEAN DEFAULT true,
  consent_ip TEXT,
  consent_user_agent TEXT,

  -- Email preferences
  receive_newsletters BOOLEAN DEFAULT true,
  receive_updates BOOLEAN DEFAULT true,
  receive_promotions BOOLEAN DEFAULT false,

  -- Tracking
  source TEXT DEFAULT 'join_community_button', -- How they subscribed
  last_email_sent_at TIMESTAMP,
  email_sent_count INTEGER DEFAULT 0,

  -- Verification
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  verification_sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure one email per creator
  UNIQUE(creator_id, email),

  INDEX idx_community_subscribers_creator (creator_id),
  INDEX idx_community_subscribers_email (email),
  INDEX idx_community_subscribers_active (is_active),
  INDEX idx_community_subscribers_verified (email_verified)
);

-- Enable RLS
ALTER TABLE community_subscribers ENABLE ROW LEVEL SECURITY;

-- Creators can view their own subscribers
CREATE POLICY "Creators can view own subscribers" ON community_subscribers
  FOR SELECT USING (creator_id = current_setting('app.user_id', true)::uuid);

-- Creators can manage their own subscribers
CREATE POLICY "Creators can manage own subscribers" ON community_subscribers
  FOR ALL USING (creator_id = current_setting('app.user_id', true)::uuid);

-- Public can subscribe (insert only)
CREATE POLICY "Public can subscribe" ON community_subscribers
  FOR INSERT WITH CHECK (true);

-- Update timestamp trigger
CREATE TRIGGER trigger_community_subscribers_updated_at
  BEFORE UPDATE ON community_subscribers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE community_subscribers IS 'Email-only subscribers who joined the creator community without donating';
COMMENT ON COLUMN community_subscribers.consent_given IS 'GDPR: User explicitly consented to receive emails';
COMMENT ON COLUMN community_subscribers.consent_ip IS 'GDPR: IP address when consent was given';
COMMENT ON COLUMN community_subscribers.source IS 'How the subscriber joined (join_community_button, page_footer, etc.)';

-- =====================================================
-- Subscriber Statistics View
-- =====================================================

CREATE OR REPLACE VIEW creator_subscriber_stats AS
SELECT
  c.id as creator_id,
  c.username,
  c.display_name,
  COUNT(cs.id) as total_subscribers,
  COUNT(cs.id) FILTER (WHERE cs.is_active = true) as active_subscribers,
  COUNT(cs.id) FILTER (WHERE cs.email_verified = true) as verified_subscribers,
  COUNT(cs.id) FILTER (WHERE cs.created_at >= NOW() - INTERVAL '7 days') as subscribers_last_7_days,
  COUNT(cs.id) FILTER (WHERE cs.created_at >= NOW() - INTERVAL '30 days') as subscribers_last_30_days
FROM creators c
LEFT JOIN community_subscribers cs ON c.id = cs.creator_id
GROUP BY c.id, c.username, c.display_name;

COMMENT ON VIEW creator_subscriber_stats IS 'Summary statistics of community subscribers per creator';

-- =====================================================
-- Function: Unsubscribe Subscriber
-- =====================================================

CREATE OR REPLACE FUNCTION unsubscribe_community_member(
  p_email TEXT,
  p_creator_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE community_subscribers
  SET
    is_active = false,
    unsubscribed_at = NOW(),
    updated_at = NOW()
  WHERE
    email = p_email
    AND creator_id = p_creator_id
    AND is_active = true;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unsubscribe_community_member IS 'Unsubscribe a community member from a creator email list';

-- =====================================================
-- Function: Generate Verification Token
-- =====================================================

CREATE OR REPLACE FUNCTION generate_verification_token(
  p_subscriber_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generate unique token
  v_token := encode(gen_random_bytes(32), 'base64');

  -- Update subscriber record
  UPDATE community_subscribers
  SET
    verification_token = v_token,
    verification_sent_at = NOW()
  WHERE id = p_subscriber_id;

  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION generate_verification_token IS 'Generate email verification token for new subscriber';

-- =====================================================
-- Function: Verify Email
-- =====================================================

CREATE OR REPLACE FUNCTION verify_subscriber_email(
  p_token TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE community_subscribers
  SET
    email_verified = true,
    verification_token = NULL,
    updated_at = NOW()
  WHERE
    verification_token = p_token
    AND email_verified = false
    AND verification_sent_at > NOW() - INTERVAL '7 days'; -- Token expires after 7 days

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_subscriber_email IS 'Verify subscriber email using verification token';

SELECT 'Migration 009 completed: Community subscribers table created!' as status;
