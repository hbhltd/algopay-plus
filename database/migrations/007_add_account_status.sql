-- =====================================================
-- ACCOUNT STATUS MANAGEMENT MIGRATION
-- Adds account status fields to creators table for
-- subscription payment enforcement and suspension handling
-- =====================================================

-- Add account status columns to creators table
ALTER TABLE creators
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'pending_payment')),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
ADD COLUMN IF NOT EXISTS last_payment_check TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_retry_count INTEGER DEFAULT 0;

-- Add indexes for account status queries
CREATE INDEX IF NOT EXISTS idx_creators_account_status ON creators(account_status);
CREATE INDEX IF NOT EXISTS idx_creators_payment_check ON creators(last_payment_check);

-- Add comments to explain the new fields
COMMENT ON COLUMN creators.account_status IS 'Current status of creator account: active (full access), suspended (no access), pending_payment (grace period)';
COMMENT ON COLUMN creators.suspension_reason IS 'Reason for account suspension, e.g., "Payment failed" or "TOS violation"';
COMMENT ON COLUMN creators.last_payment_check IS 'Timestamp of the last automated payment status check';
COMMENT ON COLUMN creators.payment_retry_count IS 'Number of payment retry attempts for failed renewals';

-- Create account status change history table
CREATE TABLE IF NOT EXISTS account_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_by TEXT, -- 'system' or admin user ID
  metadata JSONB, -- Additional context like payment details, admin notes, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for account status history
CREATE INDEX IF NOT EXISTS idx_account_status_history_creator ON account_status_history(creator_id);
CREATE INDEX IF NOT EXISTS idx_account_status_history_created ON account_status_history(created_at DESC);

-- Add comment to the table
COMMENT ON TABLE account_status_history IS 'Audit log of all account status changes for creators';

-- Enable RLS on account status history
ALTER TABLE account_status_history ENABLE ROW LEVEL SECURITY;

-- Creators can view their own status history
CREATE POLICY "Creators can view own status history"
ON account_status_history FOR SELECT
USING (auth.uid()::text = creator_id::text);

-- Function to automatically log account status changes
CREATE OR REPLACE FUNCTION log_account_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if account_status actually changed
  IF (OLD.account_status IS DISTINCT FROM NEW.account_status) THEN
    INSERT INTO account_status_history (
      creator_id,
      old_status,
      new_status,
      reason,
      changed_by,
      metadata
    ) VALUES (
      NEW.id,
      OLD.account_status,
      NEW.account_status,
      NEW.suspension_reason,
      'system', -- Default to system, can be updated by admin actions
      jsonb_build_object(
        'payment_retry_count', NEW.payment_retry_count,
        'last_payment_check', NEW.last_payment_check
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log status changes
DROP TRIGGER IF EXISTS log_creator_status_change ON creators;
CREATE TRIGGER log_creator_status_change
AFTER UPDATE ON creators
FOR EACH ROW
EXECUTE FUNCTION log_account_status_change();

-- Update existing creators to have active status
UPDATE creators
SET account_status = 'active'
WHERE account_status IS NULL;

-- Grant permissions
GRANT ALL ON account_status_history TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Account status management migration completed successfully!' as status;
