-- Create webhook_settings table for real-time donation notifications
CREATE TABLE IF NOT EXISTS webhook_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID UNIQUE REFERENCES creators(id) ON DELETE CASCADE,

  -- Webhook configuration
  webhook_enabled BOOLEAN DEFAULT false,
  webhook_url TEXT, -- URL to ping when donation happens
  webhook_secret TEXT, -- Secret for webhook verification

  -- Events to trigger webhook
  on_new_donation BOOLEAN DEFAULT true,
  on_monthly_total BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create webhook_logs table to track webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,

  webhook_url TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success BOOLEAN DEFAULT false,
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_settings_creator ON webhook_settings(creator_id);
CREATE INDEX idx_webhook_logs_creator ON webhook_logs(creator_id);
CREATE INDEX idx_webhook_logs_donation ON webhook_logs(donation_id);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- RLS Policies
ALTER TABLE webhook_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own webhook settings
CREATE POLICY "Creators can manage own webhook settings"
ON webhook_settings FOR ALL
USING (auth.uid()::text = creator_id::text);

-- Creators can view their own webhook logs
CREATE POLICY "Creators can view own webhook logs"
ON webhook_logs FOR SELECT
USING (auth.uid()::text = creator_id::text);

-- Auto-update timestamp
CREATE TRIGGER update_webhook_settings_updated_at
BEFORE UPDATE ON webhook_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create default webhook settings for existing creators
INSERT INTO webhook_settings (creator_id, webhook_enabled)
SELECT id, false FROM creators
ON CONFLICT (creator_id) DO NOTHING;

SELECT 'Webhook settings tables created successfully!' as status;
