-- =====================================================
-- Migration 010: Newsletter Management System
-- =====================================================

-- Newsletters Table (Store created newsletters)
CREATE TABLE IF NOT EXISTS newsletters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  -- Newsletter content
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  content_text TEXT, -- Plain text version for email clients that don't support HTML
  preview_text TEXT, -- Email preview text

  -- Status and scheduling
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,

  -- Targeting
  send_to TEXT DEFAULT 'all' CHECK (send_to IN ('all', 'verified_only', 'donors_only', 'custom')),
  custom_segment JSONB, -- For custom targeting criteria

  -- Statistics
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,

  -- Tracking
  open_rate DECIMAL(5, 2), -- Percentage
  click_rate DECIMAL(5, 2), -- Percentage

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_newsletters_creator (creator_id),
  INDEX idx_newsletters_status (status),
  INDEX idx_newsletters_sent_at (sent_at)
);

-- Newsletter Recipients (Track individual sends)
CREATE TABLE IF NOT EXISTS newsletter_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  newsletter_id UUID REFERENCES newsletters(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES community_subscribers(id) ON DELETE CASCADE,

  -- Recipient info (denormalized for historical accuracy)
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,

  -- Delivery status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,

  -- Engagement tracking
  opened BOOLEAN DEFAULT false,
  first_opened_at TIMESTAMP,
  open_count INTEGER DEFAULT 0,
  last_opened_at TIMESTAMP,

  clicked BOOLEAN DEFAULT false,
  first_clicked_at TIMESTAMP,
  click_count INTEGER DEFAULT 0,
  last_clicked_at TIMESTAMP,

  -- Error tracking
  error_message TEXT,
  bounce_type TEXT, -- 'hard', 'soft', 'complaint'

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_newsletter_recipients_newsletter (newsletter_id),
  INDEX idx_newsletter_recipients_subscriber (subscriber_id),
  INDEX idx_newsletter_recipients_email (recipient_email),
  INDEX idx_newsletter_recipients_status (status)
);

-- Newsletter Templates (Reusable email templates)
CREATE TABLE IF NOT EXISTS newsletter_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Template content
  subject_template TEXT,
  html_template TEXT NOT NULL,
  text_template TEXT,

  -- Variables that can be used in template
  available_variables JSONB, -- ['subscriber_name', 'creator_name', 'unsubscribe_link', etc.]

  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  times_used INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_newsletter_templates_creator (creator_id),
  INDEX idx_newsletter_templates_active (is_active)
);

-- Newsletter Clicks (Track link clicks)
CREATE TABLE IF NOT EXISTS newsletter_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  newsletter_id UUID REFERENCES newsletters(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES newsletter_recipients(id) ON DELETE CASCADE,

  link_url TEXT NOT NULL,
  clicked_at TIMESTAMP DEFAULT NOW(),

  -- Tracking
  ip_address TEXT,
  user_agent TEXT,

  INDEX idx_newsletter_clicks_newsletter (newsletter_id),
  INDEX idx_newsletter_clicks_recipient (recipient_id),
  INDEX idx_newsletter_clicks_clicked_at (clicked_at)
);

-- Email Service Settings (Per creator email service configuration)
CREATE TABLE IF NOT EXISTS email_service_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,

  -- Service provider
  provider TEXT DEFAULT 'platform' CHECK (provider IN ('platform', 'sendgrid', 'mailgun', 'resend', 'ses')),

  -- API credentials (encrypted)
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  encryption_iv TEXT,

  -- Sender information
  from_email TEXT,
  from_name TEXT,
  reply_to_email TEXT,

  -- Domain verification
  domain TEXT,
  domain_verified BOOLEAN DEFAULT false,
  domain_verified_at TIMESTAMP,

  -- Service-specific config
  config JSONB,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  test_status TEXT, -- 'success', 'failed'
  test_error TEXT,

  -- Limits and usage
  monthly_send_limit INTEGER,
  monthly_sends_used INTEGER DEFAULT 0,
  last_reset_at TIMESTAMP DEFAULT NOW(),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_email_service_settings_creator (creator_id),
  INDEX idx_email_service_settings_active (is_active)
);

-- Enable RLS
ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_service_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Creators can manage own newsletters" ON newsletters
  FOR ALL USING (creator_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY "Creators can view own recipients" ON newsletter_recipients
  FOR SELECT USING (
    newsletter_id IN (SELECT id FROM newsletters WHERE creator_id = current_setting('app.user_id', true)::uuid)
  );

CREATE POLICY "Creators can manage own templates" ON newsletter_templates
  FOR ALL USING (creator_id = current_setting('app.user_id', true)::uuid);

CREATE POLICY "Creators can view own email settings" ON email_service_settings
  FOR ALL USING (creator_id = current_setting('app.user_id', true)::uuid);

-- Update timestamp triggers
CREATE TRIGGER trigger_newsletters_updated_at
  BEFORE UPDATE ON newsletters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_newsletter_templates_updated_at
  BEFORE UPDATE ON newsletter_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_email_service_settings_updated_at
  BEFORE UPDATE ON email_service_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE newsletters IS 'Email newsletters created and sent by creators';
COMMENT ON TABLE newsletter_recipients IS 'Individual recipients of each newsletter with engagement tracking';
COMMENT ON TABLE newsletter_templates IS 'Reusable email templates for newsletters';
COMMENT ON TABLE newsletter_clicks IS 'Link click tracking for newsletters';
COMMENT ON TABLE email_service_settings IS 'Creator-specific email service provider configurations';

-- =====================================================
-- Newsletter Functions
-- =====================================================

-- Function: Calculate newsletter statistics
CREATE OR REPLACE FUNCTION calculate_newsletter_stats(p_newsletter_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE newsletters
  SET
    total_sent = (SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND status IN ('sent', 'delivered')),
    total_delivered = (SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND status = 'delivered'),
    total_opened = (SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND opened = true),
    total_clicked = (SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND clicked = true),
    total_bounced = (SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND bounce_type IS NOT NULL),
    open_rate = CASE
      WHEN (SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND status = 'delivered') > 0
      THEN ((SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND opened = true)::DECIMAL /
            (SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND status = 'delivered')::DECIMAL * 100)
      ELSE 0
    END,
    click_rate = CASE
      WHEN (SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND opened = true) > 0
      THEN ((SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND clicked = true)::DECIMAL /
            (SELECT COUNT(*) FROM newsletter_recipients WHERE newsletter_id = p_newsletter_id AND opened = true)::DECIMAL * 100)
      ELSE 0
    END,
    updated_at = NOW()
  WHERE id = p_newsletter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Track newsletter open
CREATE OR REPLACE FUNCTION track_newsletter_open(
  p_recipient_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE newsletter_recipients
  SET
    opened = true,
    first_opened_at = COALESCE(first_opened_at, NOW()),
    open_count = open_count + 1,
    last_opened_at = NOW()
  WHERE id = p_recipient_id;

  -- Update newsletter stats
  PERFORM calculate_newsletter_stats((SELECT newsletter_id FROM newsletter_recipients WHERE id = p_recipient_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Track newsletter click
CREATE OR REPLACE FUNCTION track_newsletter_click(
  p_recipient_id UUID,
  p_link_url TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_newsletter_id UUID;
BEGIN
  -- Get newsletter ID
  SELECT newsletter_id INTO v_newsletter_id FROM newsletter_recipients WHERE id = p_recipient_id;

  -- Insert click record
  INSERT INTO newsletter_clicks (newsletter_id, recipient_id, link_url, ip_address, user_agent)
  VALUES (v_newsletter_id, p_recipient_id, p_link_url, p_ip_address, p_user_agent);

  -- Update recipient stats
  UPDATE newsletter_recipients
  SET
    clicked = true,
    first_clicked_at = COALESCE(first_clicked_at, NOW()),
    click_count = click_count + 1,
    last_clicked_at = NOW()
  WHERE id = p_recipient_id;

  -- Update newsletter stats
  PERFORM calculate_newsletter_stats(v_newsletter_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Default Newsletter Templates
-- =====================================================

-- Create a default welcome template
INSERT INTO newsletter_templates (
  creator_id,
  name,
  description,
  subject_template,
  html_template,
  text_template,
  available_variables,
  is_default
) VALUES (
  NULL, -- Global template
  'Welcome Email',
  'Default welcome email for new subscribers',
  'Welcome to {{creator_name}}''s Community!',
  '<html><body><h1>Welcome {{subscriber_name}}!</h1><p>Thanks for joining {{creator_name}}''s community. You''ll receive updates, exclusive content, and more.</p><p><a href="{{unsubscribe_link}}">Unsubscribe</a></p></body></html>',
  'Welcome {{subscriber_name}}! Thanks for joining {{creator_name}}''s community. Unsubscribe: {{unsubscribe_link}}',
  '["subscriber_name", "creator_name", "unsubscribe_link"]'::jsonb,
  true
);

SELECT 'Migration 010 completed: Newsletter system created!' as status;
