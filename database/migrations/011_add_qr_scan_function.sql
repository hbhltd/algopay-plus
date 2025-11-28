-- =====================================================
-- Migration 011: QR Code Scan Tracking Function
-- =====================================================

-- Function to increment QR code scan count
CREATE OR REPLACE FUNCTION increment_qr_scan(qr_code_id_param TEXT)
RETURNS void AS $$
BEGIN
  UPDATE donation_qr_codes
  SET times_scanned = times_scanned + 1
  WHERE qr_code_id = qr_code_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_qr_scan IS 'Increment the scan count for a QR code';

SELECT 'Migration 011 completed: QR code scan tracking function created!' as status;
