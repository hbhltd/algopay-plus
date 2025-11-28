-- =====================================================
-- QUICKBOOKS INTEGRATION MIGRATION
-- Adds QuickBooks Online OAuth and transaction sync
-- =====================================================

-- QuickBooks settings table
CREATE TABLE IF NOT EXISTS quickbooks_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,

  -- QuickBooks OAuth
  realm_id TEXT, -- QuickBooks company ID
  company_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,

  -- Connection status
  connected BOOLEAN DEFAULT false,
  connection_status TEXT DEFAULT 'disconnected', -- 'disconnected', 'connected', 'error', 'token_expired'
  last_connected_at TIMESTAMP,
  last_synced_at TIMESTAMP,

  -- Sync settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency TEXT DEFAULT 'realtime', -- 'realtime', 'daily', 'weekly', 'manual'

  -- QuickBooks entities (IDs from QuickBooks)
  income_account_id TEXT, -- Income account for donations
  income_account_name TEXT,
  product_service_id TEXT, -- Product/Service item for donations
  product_service_name TEXT,

  -- Customer settings
  create_customers BOOLEAN DEFAULT true, -- Create QB customer for each donor
  customer_prefix TEXT DEFAULT 'DONOR-', -- Prefix for customer display names

  -- Transaction settings
  create_sales_receipts BOOLEAN DEFAULT true, -- Create sales receipts for donations
  memo_template TEXT DEFAULT 'Donation via Supportly', -- Memo for transactions

  -- Error handling
  last_error TEXT,
  last_error_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- QuickBooks transaction sync log
CREATE TABLE IF NOT EXISTS quickbooks_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,

  -- QuickBooks IDs
  qb_transaction_id TEXT,  -- Sales receipt or invoice ID in QB
  qb_transaction_type TEXT, -- 'SalesReceipt', 'Invoice'
  qb_customer_id TEXT, -- Customer ID in QB
  qb_transaction_number TEXT, -- Transaction number in QB

  -- Sync info
  amount DECIMAL(10, 2) NOT NULL,
  sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed', 'skipped'
  sync_method TEXT DEFAULT 'auto', -- 'auto', 'manual'

  -- Response data from QuickBooks API
  qb_response JSONB,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP,

  synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- QuickBooks customers (donor mapping)
CREATE TABLE IF NOT EXISTS quickbooks_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  -- Donor info
  donor_email TEXT,
  donor_name TEXT,
  donor_wallet TEXT,

  -- QuickBooks customer info
  qb_customer_id TEXT NOT NULL,
  qb_customer_name TEXT,
  qb_display_name TEXT,

  -- Stats
  total_donations INTEGER DEFAULT 0,
  total_amount DECIMAL(10, 2) DEFAULT 0,

  -- Tracking
  first_synced_at TIMESTAMP DEFAULT NOW(),
  last_synced_at TIMESTAMP DEFAULT NOW(),

  -- Unique constraint on creator + QB customer
  CONSTRAINT unique_creator_qb_customer UNIQUE(creator_id, qb_customer_id)
);

-- QuickBooks sync queue (for batch processing)
CREATE TABLE IF NOT EXISTS quickbooks_sync_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  donation_id UUID REFERENCES donations(id) ON DELETE CASCADE,

  priority INTEGER DEFAULT 0, -- Higher priority processed first
  status TEXT DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'

  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  error_message TEXT,
  last_attempted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quickbooks_settings_creator ON quickbooks_settings(creator_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_settings_realm ON quickbooks_settings(realm_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_transactions_creator ON quickbooks_transactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_transactions_donation ON quickbooks_transactions(donation_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_transactions_status ON quickbooks_transactions(sync_status);
CREATE INDEX IF NOT EXISTS idx_quickbooks_customers_creator ON quickbooks_customers(creator_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_customers_qb_id ON quickbooks_customers(qb_customer_id);
CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_queue_status ON quickbooks_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_quickbooks_sync_queue_creator ON quickbooks_sync_queue(creator_id);

-- Triggers for updated_at
CREATE TRIGGER IF NOT EXISTS update_quickbooks_settings_updated_at
BEFORE UPDATE ON quickbooks_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE quickbooks_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE quickbooks_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can manage own QuickBooks settings"
ON quickbooks_settings FOR ALL
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can view own QuickBooks transactions"
ON quickbooks_transactions FOR SELECT
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can view own QuickBooks customers"
ON quickbooks_customers FOR SELECT
USING (auth.uid()::text = creator_id::text);

CREATE POLICY "Creators can view own QuickBooks sync queue"
ON quickbooks_sync_queue FOR SELECT
USING (auth.uid()::text = creator_id::text);

-- Comments
COMMENT ON TABLE quickbooks_settings IS 'QuickBooks Online connection settings for creators';
COMMENT ON TABLE quickbooks_transactions IS 'Log of donations synced to QuickBooks';
COMMENT ON TABLE quickbooks_customers IS 'Donor-to-QuickBooks customer mapping';
COMMENT ON TABLE quickbooks_sync_queue IS 'Queue for batch syncing donations to QuickBooks';

COMMENT ON COLUMN quickbooks_settings.realm_id IS 'QuickBooks company ID (realmId)';
COMMENT ON COLUMN quickbooks_settings.income_account_id IS 'QuickBooks account ID for donation income';
COMMENT ON COLUMN quickbooks_transactions.qb_transaction_id IS 'Sales receipt or invoice ID in QuickBooks';

-- View for sync statistics
CREATE OR REPLACE VIEW quickbooks_sync_stats AS
SELECT
  creator_id,
  COUNT(*) as total_synced,
  SUM(amount) as total_amount_synced,
  COUNT(CASE WHEN sync_status = 'synced' THEN 1 END) as successful_syncs,
  COUNT(CASE WHEN sync_status = 'failed' THEN 1 END) as failed_syncs,
  COUNT(CASE WHEN sync_status = 'pending' THEN 1 END) as pending_syncs,
  MAX(synced_at) as last_sync_time
FROM quickbooks_transactions
GROUP BY creator_id;

-- =====================================================
-- QUICKBOOKS MIGRATION COMPLETE
-- =====================================================

SELECT 'QuickBooks integration tables created successfully!' as status;
