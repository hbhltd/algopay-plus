-- Create email_settings table for creators to configure their own email service
CREATE TABLE IF NOT EXISTS email_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID UNIQUE REFERENCES creators(id) ON DELETE CASCADE,

  -- Email provider type
  email_provider VARCHAR(50) DEFAULT 'supportly', -- 'supportly', 'smtp', 'sendgrid', 'resend'

  -- SMTP Settings (for Gmail, Outlook, custom SMTP)
  smtp_host TEXT,
  smtp_port INTEGER,
  smtp_username TEXT,
  smtp_password TEXT, -- Encrypted in production
  smtp_secure BOOLEAN DEFAULT true,

  -- SendGrid
  sendgrid_api_key TEXT, -- Encrypted in production

  -- Resend
  resend_api_key TEXT, -- Encrypted in production

  -- From email address
  from_email TEXT,
  from_name TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_email_settings_creator ON email_settings(creator_id);

-- RLS Policy
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own email settings
CREATE POLICY "Creators can manage own email settings"
ON email_settings FOR ALL
USING (auth.uid()::text = creator_id::text);

-- Auto-update timestamp
CREATE TRIGGER update_email_settings_updated_at
BEFORE UPDATE ON email_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create default email settings for existing creators
INSERT INTO email_settings (creator_id, email_provider)
SELECT id, 'supportly' FROM creators
ON CONFLICT (creator_id) DO NOTHING;

SELECT 'Email settings table created successfully!' as status;
