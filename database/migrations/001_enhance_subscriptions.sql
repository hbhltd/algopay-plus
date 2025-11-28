-- =====================================================
-- SUBSCRIPTION SYSTEM ENHANCEMENT MIGRATION
-- Adds fields needed for complete subscription management
-- =====================================================

-- Add new columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe', -- 'stripe', 'crypto', 'paypal'
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS next_payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment ON subscriptions(next_payment_date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_grace_period ON subscriptions(grace_period_ends_at);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create subscription history table for tracking all changes
CREATE TABLE IF NOT EXISTS subscription_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'renewed', 'upgraded', 'downgraded', 'canceled', 'expired', 'payment_failed'
  old_tier TEXT,
  new_tier TEXT,
  old_status TEXT,
  new_status TEXT,
  amount DECIMAL(10, 2),
  payment_tx_hash TEXT,
  stripe_event_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for subscription history
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription ON subscription_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_creator ON subscription_history(creator_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_event ON subscription_history(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created ON subscription_history(created_at DESC);

-- Create usage tracking table for enforcing tier limits
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE UNIQUE,

  -- Monthly counters (reset monthly)
  donations_this_month INTEGER DEFAULT 0,
  emails_sent_this_month INTEGER DEFAULT 0,
  webhooks_created INTEGER DEFAULT 0,
  newsletter_subscribers INTEGER DEFAULT 0,

  -- Resets
  last_monthly_reset TIMESTAMP DEFAULT NOW(),

  -- Feature usage
  custom_domain_enabled BOOLEAN DEFAULT false,
  integrations_connected JSONB DEFAULT '{}', -- {discord: true, zapier: false, ...}

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for usage tracking
CREATE INDEX IF NOT EXISTS idx_subscription_usage_creator ON subscription_usage(creator_id);

-- Trigger for usage tracking updated_at
CREATE TRIGGER IF NOT EXISTS update_subscription_usage_updated_at
BEFORE UPDATE ON subscription_usage
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create invoice table for tracking all payments
CREATE TABLE IF NOT EXISTS subscription_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,

  invoice_number TEXT UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'

  payment_method TEXT, -- 'stripe', 'crypto', 'paypal'
  payment_tx_hash TEXT,
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,

  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,

  paid_at TIMESTAMP,
  due_date TIMESTAMP,

  metadata JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for invoices
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON subscription_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_creator ON subscription_invoices(creator_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON subscription_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice ON subscription_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON subscription_invoices(due_date);

-- Trigger for invoices updated_at
CREATE TRIGGER IF NOT EXISTS update_invoices_updated_at
BEFORE UPDATE ON subscription_invoices
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update creators table subscription_tier to match new tier names
-- Change default from 'basic' to 'free'
ALTER TABLE creators
ALTER COLUMN subscription_tier SET DEFAULT 'free';

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT;
  month TEXT;
  counter INTEGER;
  invoice_num TEXT;
BEGIN
  year := TO_CHAR(NOW(), 'YYYY');
  month := TO_CHAR(NOW(), 'MM');

  SELECT COUNT(*) + 1 INTO counter
  FROM subscription_invoices
  WHERE TO_CHAR(created_at, 'YYYY-MM') = year || '-' || month;

  invoice_num := 'INV-' || year || month || '-' || LPAD(counter::TEXT, 5, '0');

  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Function to check if creator can perform action based on tier limits
CREATE OR REPLACE FUNCTION check_tier_limit(
  p_creator_id UUID,
  p_action TEXT,
  p_current_usage INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  -- Get creator's current tier
  SELECT subscription_tier INTO v_tier
  FROM creators
  WHERE id = p_creator_id;

  -- For now, return true (limits will be enforced in application layer)
  -- This function can be expanded to include database-level enforcement
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- View for active subscriptions with creator info
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT
  s.*,
  c.username,
  c.display_name,
  c.email,
  CASE
    WHEN s.expires_at < NOW() THEN 'expired'
    WHEN s.canceled_at IS NOT NULL THEN 'canceled'
    WHEN s.grace_period_ends_at IS NOT NULL AND s.grace_period_ends_at > NOW() THEN 'grace_period'
    ELSE s.status
  END as computed_status,
  EXTRACT(DAY FROM (s.expires_at - NOW())) as days_until_expiry
FROM subscriptions s
JOIN creators c ON s.creator_id = c.id
WHERE s.status IN ('active', 'canceled');

-- View for subscription revenue analytics
CREATE OR REPLACE VIEW subscription_revenue_summary AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  tier,
  COUNT(*) as subscriptions_count,
  SUM(amount) as total_revenue,
  AVG(amount) as avg_revenue
FROM subscriptions
WHERE status = 'active'
GROUP BY DATE_TRUNC('month', created_at), tier
ORDER BY month DESC, tier;

-- RLS Policies for new tables
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

-- Creators can view their own subscription history
CREATE POLICY "Creators can view own subscription history"
ON subscription_history FOR SELECT
USING (auth.uid()::text = creator_id::text);

-- Creators can view their own usage
CREATE POLICY "Creators can view own usage"
ON subscription_usage FOR SELECT
USING (auth.uid()::text = creator_id::text);

-- Creators can view their own invoices
CREATE POLICY "Creators can view own invoices"
ON subscription_invoices FOR SELECT
USING (auth.uid()::text = creator_id::text);

-- Comments
COMMENT ON TABLE subscription_history IS 'Audit log of all subscription changes and events';
COMMENT ON TABLE subscription_usage IS 'Tracks feature usage against tier limits';
COMMENT ON TABLE subscription_invoices IS 'Payment invoices for creator subscriptions';
COMMENT ON COLUMN subscriptions.grace_period_ends_at IS 'End of grace period for expired subscriptions (usually 7 days)';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for recurring billing';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Subscription system enhanced successfully!' as status;
