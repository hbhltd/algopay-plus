-- =====================================================
-- SOCIAL MEDIA INTEGRATION MIGRATION
-- Twitter & Instagram auto-posting
-- =====================================================

CREATE TABLE IF NOT EXISTS social_media_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,

  -- Twitter OAuth
  twitter_enabled BOOLEAN DEFAULT false,
  twitter_access_token TEXT,
  twitter_access_secret TEXT,
  twitter_user_id TEXT,
  twitter_username TEXT,

  -- Instagram
  instagram_enabled BOOLEAN DEFAULT false,
  instagram_access_token TEXT,
  instagram_user_id TEXT,
  instagram_username TEXT,

  -- Auto-post settings
  auto_post_donations BOOLEAN DEFAULT false,
  auto_post_milestones BOOLEAN DEFAULT true,
  donation_threshold DECIMAL(10, 2) DEFAULT 100.00, -- Only post donations above this amount

  -- Post templates
  donation_template TEXT DEFAULT 'Thank you to {donor_name} for the ${amount} donation! 🙏',
  milestone_template TEXT DEFAULT 'We just hit ${milestone}! Thank you to all {supporter_count} supporters! 🎉',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,

  platform TEXT NOT NULL, -- 'twitter', 'instagram'
  post_type TEXT NOT NULL, -- 'donation', 'milestone', 'manual'
  content TEXT NOT NULL,

  -- Platform-specific IDs
  platform_post_id TEXT,

  status TEXT DEFAULT 'pending', -- 'pending', 'posted', 'failed'
  error_message TEXT,

  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_media_settings_creator ON social_media_settings(creator_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_creator ON social_media_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_social_media_posts_platform ON social_media_posts(platform);

CREATE TRIGGER IF NOT EXISTS update_social_media_settings_updated_at
BEFORE UPDATE ON social_media_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE social_media_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own social media settings"
ON social_media_settings FOR ALL
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators view own social media posts"
ON social_media_posts FOR SELECT
USING (auth.uid()::text = creator_id::text);

SELECT 'Social media integration tables created!' as status;
