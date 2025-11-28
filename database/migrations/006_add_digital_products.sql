-- =====================================================
-- DIGITAL PRODUCTS & CONTENT GATING MIGRATION
-- Phase 3: Content Monetization
-- =====================================================

CREATE TABLE IF NOT EXISTS digital_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,

  -- Product type
  product_type TEXT NOT NULL, -- 'download', 'video', 'course', 'membership'

  -- File storage
  file_url TEXT, -- S3/storage URL for downloads
  file_size BIGINT, -- in bytes
  file_type TEXT, -- mime type

  -- Access control
  is_gated BOOLEAN DEFAULT true,
  required_donation_amount DECIMAL(10, 2), -- Minimum donation to access

  -- Stats
  downloads_count INTEGER DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES digital_products(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  donation_id UUID REFERENCES donations(id) ON DELETE SET NULL,

  buyer_email TEXT,
  buyer_name TEXT,
  buyer_wallet TEXT,

  amount_paid DECIMAL(10, 2),

  -- Access tracking
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,

  access_expires_at TIMESTAMP, -- NULL for lifetime access

  purchased_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL, -- 'post', 'video', 'image', 'file'

  -- Access requirements (at least one must be met)
  min_donation_amount DECIMAL(10, 2),
  required_nft_id UUID REFERENCES nft_configs(id),
  required_membership_tier TEXT,

  -- Content storage
  content_url TEXT,
  thumbnail_url TEXT,

  views_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS content_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES gated_content(id) ON DELETE CASCADE,
  user_wallet TEXT,
  user_email TEXT,

  access_granted BOOLEAN,
  access_method TEXT, -- 'donation', 'nft', 'membership'

  accessed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_digital_products_creator ON digital_products(creator_id);
CREATE INDEX idx_digital_products_active ON digital_products(active);
CREATE INDEX idx_product_purchases_product ON product_purchases(product_id);
CREATE INDEX idx_product_purchases_creator ON product_purchases(creator_id);
CREATE INDEX idx_gated_content_creator ON gated_content(creator_id);
CREATE INDEX idx_content_access_log_content ON content_access_log(content_id);

-- RLS
ALTER TABLE digital_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE gated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators manage own products"
ON digital_products FOR ALL
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators view own purchases"
ON product_purchases FOR SELECT
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators manage own content"
ON gated_content FOR ALL
USING (auth.uid()::text = creator_id::text);

SELECT 'Digital products and content gating created!' as status;
