-- =====================================================
-- DISCORD INTEGRATION MIGRATION
-- Adds Discord server connection and role management
-- =====================================================

-- Discord settings table
CREATE TABLE IF NOT EXISTS discord_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,

  -- Discord OAuth
  guild_id TEXT, -- Discord server ID
  guild_name TEXT,
  guild_icon TEXT,

  -- Bot OAuth token
  bot_token TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- Connection status
  connected BOOLEAN DEFAULT false,
  connection_status TEXT DEFAULT 'disconnected', -- 'disconnected', 'connected', 'error'
  last_connected_at TIMESTAMP,

  -- Features enabled
  auto_role_enabled BOOLEAN DEFAULT false,
  notifications_enabled BOOLEAN DEFAULT false,

  -- Notification settings
  notification_channel_id TEXT,
  notification_channel_name TEXT,

  -- Auto-role configuration (JSON array of tiers)
  -- Example: [{"minAmount": 5, "roleId": "123", "roleName": "Supporter"}, ...]
  role_tiers JSONB DEFAULT '[]',

  -- Welcome message customization
  welcome_message TEXT DEFAULT 'Thank you for your support! You''ve been granted supporter access.',
  send_dm_on_role BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Discord role mappings table (for detailed tracking)
CREATE TABLE IF NOT EXISTS discord_role_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  role_id TEXT NOT NULL, -- Discord role ID
  role_name TEXT NOT NULL,
  role_color TEXT, -- Hex color

  -- Tier requirements
  min_donation_amount DECIMAL(10, 2) NOT NULL,
  total_donation_amount DECIMAL(10, 2), -- NULL for one-time, set for total requirement

  -- Status
  active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- Higher priority roles assigned first

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Discord member tracking (who has what roles)
CREATE TABLE IF NOT EXISTS discord_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  -- Discord user info
  discord_user_id TEXT NOT NULL,
  discord_username TEXT,
  discord_discriminator TEXT,
  discord_avatar TEXT,

  -- Association with donation
  donor_wallet TEXT,
  donor_email TEXT,

  -- Roles assigned
  roles_assigned JSONB DEFAULT '[]', -- Array of {roleId, roleName, assignedAt}

  -- Tracking
  first_joined_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  total_donated DECIMAL(10, 2) DEFAULT 0,

  -- Unique constraint on creator + discord user
  CONSTRAINT unique_creator_discord_user UNIQUE(creator_id, discord_user_id)
);

-- Discord notification log
CREATE TABLE IF NOT EXISTS discord_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,

  notification_type TEXT NOT NULL, -- 'new_donation', 'role_assigned', 'milestone', 'test'

  -- Discord message details
  channel_id TEXT,
  message_id TEXT,

  -- Content
  content TEXT,
  embeds JSONB,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_discord_settings_creator ON discord_settings(creator_id);
CREATE INDEX IF NOT EXISTS idx_discord_settings_guild ON discord_settings(guild_id);
CREATE INDEX IF NOT EXISTS idx_discord_role_mappings_creator ON discord_role_mappings(creator_id);
CREATE INDEX IF NOT EXISTS idx_discord_role_mappings_active ON discord_role_mappings(active);
CREATE INDEX IF NOT EXISTS idx_discord_members_creator ON discord_members(creator_id);
CREATE INDEX IF NOT EXISTS idx_discord_members_user ON discord_members(discord_user_id);
CREATE INDEX IF NOT EXISTS idx_discord_notifications_creator ON discord_notifications(creator_id);
CREATE INDEX IF NOT EXISTS idx_discord_notifications_donation ON discord_notifications(donation_id);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_discord_settings_updated_at
BEFORE UPDATE ON discord_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_discord_role_mappings_updated_at
BEFORE UPDATE ON discord_role_mappings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE discord_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_role_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_notifications ENABLE ROW LEVEL SECURITY;

-- Creators can manage their own Discord settings
CREATE POLICY "Creators can manage own Discord settings"
ON discord_settings FOR ALL
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can manage own Discord role mappings"
ON discord_role_mappings FOR ALL
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can view own Discord members"
ON discord_members FOR SELECT
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can view own Discord notifications"
ON discord_notifications FOR SELECT
USING (auth.uid()::text = creator_id::text);

-- Comments
COMMENT ON TABLE discord_settings IS 'Discord server connection settings for creators';
COMMENT ON TABLE discord_role_mappings IS 'Discord role assignment rules based on donation amounts';
COMMENT ON TABLE discord_members IS 'Discord members who have received roles through donations';
COMMENT ON TABLE discord_notifications IS 'Log of Discord notifications sent';

COMMENT ON COLUMN discord_settings.role_tiers IS 'JSON array of role tiers: [{"minAmount": 5, "roleId": "123", "roleName": "Supporter"}]';
COMMENT ON COLUMN discord_members.roles_assigned IS 'JSON array of assigned roles with timestamps';

-- =====================================================
-- DISCORD MIGRATION COMPLETE
-- =====================================================

SELECT 'Discord integration tables created successfully!' as status;
