-- =====================================================
-- ZAPIER INTEGRATION MIGRATION
-- Adds Zapier webhook configuration and event triggers
-- =====================================================

-- Zapier settings table
CREATE TABLE IF NOT EXISTS zapier_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,

  -- Zapier webhook endpoint
  zapier_webhook_url TEXT,
  zapier_enabled BOOLEAN DEFAULT false,

  -- Event triggers (what events to send to Zapier)
  trigger_new_donation BOOLEAN DEFAULT true,
  trigger_monthly_milestone BOOLEAN DEFAULT false,
  trigger_new_supporter BOOLEAN DEFAULT false,
  trigger_recurring_donation BOOLEAN DEFAULT false,

  -- Zapier API key for authentication (optional)
  api_key TEXT,

  -- Polling endpoint for Zapier (alternative to webhooks)
  enable_polling BOOLEAN DEFAULT true,

  -- Sample data for testing Zapier zaps
  last_test_sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Zapier event log (tracks all events sent to Zapier)
CREATE TABLE IF NOT EXISTS zapier_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL, -- 'new_donation', 'monthly_milestone', 'new_supporter', etc.
  event_data JSONB NOT NULL,

  -- Delivery status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  zapier_webhook_url TEXT,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,

  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Zapier app connections (track which apps creators have connected)
CREATE TABLE IF NOT EXISTS zapier_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  app_name TEXT NOT NULL, -- 'Gmail', 'Slack', 'Google Sheets', etc.
  connection_name TEXT, -- User-defined name for this connection
  zap_count INTEGER DEFAULT 0, -- Number of zaps using this connection

  active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zapier_settings_creator ON zapier_settings(creator_id);
CREATE INDEX IF NOT EXISTS idx_zapier_events_creator ON zapier_events(creator_id);
CREATE INDEX IF NOT EXISTS idx_zapier_events_type ON zapier_events(event_type);
CREATE INDEX IF NOT EXISTS idx_zapier_events_created ON zapier_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zapier_connections_creator ON zapier_connections(creator_id);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_zapier_settings_updated_at
BEFORE UPDATE ON zapier_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE zapier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE zapier_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own Zapier settings"
ON zapier_settings FOR ALL
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can view own Zapier events"
ON zapier_events FOR SELECT
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can manage own Zapier connections"
ON zapier_connections FOR ALL
USING (auth.uid()::text = creator_id::text);

-- Comments
COMMENT ON TABLE zapier_settings IS 'Zapier integration settings for creators';
COMMENT ON TABLE zapier_events IS 'Log of events sent to Zapier webhooks';
COMMENT ON TABLE zapier_connections IS 'Track Zapier app connections created by creators';

COMMENT ON COLUMN zapier_settings.enable_polling IS 'Allow Zapier to poll for new events instead of using webhooks';
COMMENT ON COLUMN zapier_events.event_data IS 'JSON data sent to Zapier in standardized format';

-- =====================================================
-- ZAPIER MIGRATION COMPLETE
-- =====================================================

SELECT 'Zapier integration tables created successfully!' as status;
