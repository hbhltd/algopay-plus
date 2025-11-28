/**
 * QuickBooks Integration Service
 * Handles QuickBooks Online OAuth and transaction sync
 *
 * Note: Requires intuit-oauth and node-quickbooks packages
 * npm install intuit-oauth node-quickbooks
 */

const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const QB_CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const QB_CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const QB_REDIRECT_URI = process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3001/api/quickbooks/callback';
const QB_ENVIRONMENT = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'

const QB_API_BASE = QB_ENVIRONMENT === 'production'
  ? 'https://quickbooks.api.intuit.com'
  : 'https://sandbox-quickbooks.api.intuit.com';

/**
 * Generate QuickBooks OAuth URL
 */
function getQuickBooksAuthUrl(creatorId) {
  const params = new URLSearchParams({
    client_id: QB_CLIENT_ID,
    redirect_uri: QB_REDIRECT_URI,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state: creatorId
  });

  return `https://appcenter.intuit.com/connect/oauth2?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code) {
  const auth = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(
    'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: QB_REDIRECT_URI
    }),
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data;
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshToken) {
  const auth = Buffer.from(`${QB_CLIENT_ID}:${QB_CLIENT_SECRET}`).toString('base64');

  const response = await axios.post(
    'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }),
    {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  return response.data;
}

/**
 * Connect QuickBooks for creator
 */
async function connectQuickBooks(creatorId, code, realmId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tokenData = await exchangeCodeForTokens(code);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    await client.query(`
      INSERT INTO quickbooks_settings (
        creator_id,
        realm_id,
        access_token,
        refresh_token,
        token_expires_at,
        connected,
        connection_status,
        last_connected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (creator_id) DO UPDATE SET
        realm_id = $2,
        access_token = $3,
        refresh_token = $4,
        token_expires_at = $5,
        connected = $6,
        connection_status = $7,
        last_connected_at = $8,
        updated_at = NOW()
      RETURNING *
    `, [
      creatorId,
      realmId,
      tokenData.access_token,
      tokenData.refresh_token,
      expiresAt,
      true,
      'connected',
      new Date()
    ]);

    await client.query('COMMIT');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get QuickBooks settings
 */
async function getQuickBooksSettings(creatorId) {
  const result = await pool.query(`
    SELECT * FROM quickbooks_settings WHERE creator_id = $1
  `, [creatorId]);

  return result.rows[0] || null;
}

/**
 * Create sales receipt in QuickBooks for donation
 */
async function createSalesReceipt(creatorId, donation) {
  const settings = await getQuickBooksSettings(creatorId);

  if (!settings || !settings.connected) {
    throw new Error('QuickBooks not connected');
  }

  // Check if already synced
  const existing = await pool.query(`
    SELECT id FROM quickbooks_transactions WHERE donation_id = $1
  `, [donation.id]);

  if (existing.rows.length > 0) {
    return { success: false, reason: 'Already synced' };
  }

  // Ensure token is fresh
  let accessToken = settings.access_token;
  if (new Date(settings.token_expires_at) < new Date()) {
    const tokenData = await refreshAccessToken(settings.refresh_token);
    accessToken = tokenData.access_token;

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    await pool.query(`
      UPDATE quickbooks_settings
      SET access_token = $1, token_expires_at = $2
      WHERE creator_id = $3
    `, [accessToken, expiresAt, creatorId]);
  }

  // Create sales receipt
  const salesReceipt = {
    Line: [{
      Amount: parseFloat(donation.amount),
      DetailType: 'SalesItemLineDetail',
      SalesItemLineDetail: {
        ItemRef: {
          value: settings.product_service_id || '1', // Default service item
          name: settings.product_service_name || 'Donation'
        },
        Qty: 1,
        UnitPrice: parseFloat(donation.amount)
      },
      Description: donation.message || 'Donation via Supportly'
    }],
    CustomerRef: {
      name: donation.donor_name || 'Anonymous Donor'
    },
    DepositToAccountRef: {
      value: settings.income_account_id || '1' // Default income account
    },
    TxnDate: new Date(donation.created_at).toISOString().split('T')[0]
  };

  try {
    const response = await axios.post(
      `${QB_API_BASE}/v3/company/${settings.realm_id}/salesreceipt`,
      salesReceipt,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    // Log successful sync
    await pool.query(`
      INSERT INTO quickbooks_transactions (
        creator_id,
        donation_id,
        qb_transaction_id,
        qb_transaction_type,
        amount,
        sync_status,
        qb_response,
        synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      creatorId,
      donation.id,
      response.data.SalesReceipt.Id,
      'SalesReceipt',
      donation.amount,
      'synced',
      JSON.stringify(response.data)
    ]);

    return {
      success: true,
      qbTransactionId: response.data.SalesReceipt.Id
    };
  } catch (error) {
    // Log failed sync
    await pool.query(`
      INSERT INTO quickbooks_transactions (
        creator_id,
        donation_id,
        amount,
        sync_status,
        error_message
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      creatorId,
      donation.id,
      donation.amount,
      'failed',
      error.message
    ]);

    throw error;
  }
}

/**
 * Disconnect QuickBooks
 */
async function disconnectQuickBooks(creatorId) {
  await pool.query(`
    UPDATE quickbooks_settings
    SET connected = false, connection_status = 'disconnected'
    WHERE creator_id = $1
  `, [creatorId]);

  return { success: true };
}

/**
 * Get sync stats
 */
async function getSyncStats(creatorId) {
  const result = await pool.query(`
    SELECT * FROM quickbooks_sync_stats WHERE creator_id = $1
  `, [creatorId]);

  return result.rows[0] || {
    total_synced: 0,
    total_amount_synced: 0,
    successful_syncs: 0,
    failed_syncs: 0,
    pending_syncs: 0
  };
}

module.exports = {
  getQuickBooksAuthUrl,
  connectQuickBooks,
  disconnectQuickBooks,
  getQuickBooksSettings,
  createSalesReceipt,
  getSyncStats
};
