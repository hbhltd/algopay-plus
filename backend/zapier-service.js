/**
 * Zapier Integration Service
 * Handles Zapier webhooks, polling, and event triggers
 */

const axios = require('axios');
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Format event data for Zapier (standardized format)
 */
function formatEventForZapier(eventType, data) {
  const baseEvent = {
    id: crypto.randomUUID(),
    event_type: eventType,
    timestamp: new Date().toISOString(),
    platform: 'Supportly'
  };

  switch (eventType) {
    case 'new_donation':
      return {
        ...baseEvent,
        donation_id: data.id,
        amount: parseFloat(data.amount),
        currency: 'USD',
        donor_name: data.donor_name || 'Anonymous',
        donor_email: data.donor_email || null,
        message: data.message || null,
        payment_method: data.payment_method,
        tx_hash: data.tx_hash || null,
        created_at: data.created_at
      };

    case 'monthly_milestone':
      return {
        ...baseEvent,
        milestone_amount: data.milestone_amount,
        total_revenue: data.total_revenue,
        donations_count: data.donations_count,
        month: data.month,
        year: data.year
      };

    case 'new_supporter':
      return {
        ...baseEvent,
        supporter_email: data.email,
        supporter_name: data.name,
        first_donation_amount: data.first_donation_amount,
        first_donation_date: data.first_donation_date
      };

    case 'recurring_donation':
      return {
        ...baseEvent,
        donation_id: data.id,
        amount: parseFloat(data.amount),
        donor_email: data.donor_email,
        donor_name: data.donor_name,
        frequency: data.frequency, // 'monthly', 'weekly', etc.
        next_charge_date: data.next_charge_date
      };

    default:
      return {
        ...baseEvent,
        ...data
      };
  }
}

/**
 * Get Zapier settings for creator
 */
async function getZapierSettings(creatorId) {
  const result = await pool.query(`
    SELECT * FROM zapier_settings
    WHERE creator_id = $1
  `, [creatorId]);

  return result.rows[0] || null;
}

/**
 * Update Zapier settings
 */
async function updateZapierSettings(creatorId, settings) {
  const result = await pool.query(`
    INSERT INTO zapier_settings (
      creator_id,
      zapier_webhook_url,
      zapier_enabled,
      trigger_new_donation,
      trigger_monthly_milestone,
      trigger_new_supporter,
      trigger_recurring_donation,
      enable_polling
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (creator_id) DO UPDATE SET
      zapier_webhook_url = $2,
      zapier_enabled = $3,
      trigger_new_donation = $4,
      trigger_monthly_milestone = $5,
      trigger_new_supporter = $6,
      trigger_recurring_donation = $7,
      enable_polling = $8,
      updated_at = NOW()
    RETURNING *
  `, [
    creatorId,
    settings.webhookUrl,
    settings.enabled,
    settings.triggerNewDonation !== false,
    settings.triggerMonthlyMilestone || false,
    settings.triggerNewSupporter || false,
    settings.triggerRecurringDonation || false,
    settings.enablePolling !== false
  ]);

  return result.rows[0];
}

/**
 * Send event to Zapier webhook
 */
async function sendEventToZapier(creatorId, eventType, eventData) {
  const client = await pool.connect();

  try {
    // Get Zapier settings
    const settings = await getZapierSettings(creatorId);

    if (!settings || !settings.zapier_enabled || !settings.zapier_webhook_url) {
      return { success: false, reason: 'Zapier not configured' };
    }

    // Check if this event type should be sent
    const triggerMap = {
      'new_donation': settings.trigger_new_donation,
      'monthly_milestone': settings.trigger_monthly_milestone,
      'new_supporter': settings.trigger_new_supporter,
      'recurring_donation': settings.trigger_recurring_donation
    };

    if (!triggerMap[eventType]) {
      return { success: false, reason: `Event type ${eventType} is disabled` };
    }

    // Format event for Zapier
    const formattedEvent = formatEventForZapier(eventType, eventData);

    // Log event
    const eventLogResult = await client.query(`
      INSERT INTO zapier_events (
        creator_id,
        event_type,
        event_data,
        zapier_webhook_url,
        status
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      creatorId,
      eventType,
      JSON.stringify(formattedEvent),
      settings.zapier_webhook_url,
      'pending'
    ]);

    const eventId = eventLogResult.rows[0].id;

    // Send to Zapier webhook
    try {
      const response = await axios.post(
        settings.zapier_webhook_url,
        formattedEvent,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Supportly-Event': eventType,
            'X-Supportly-Creator': creatorId
          },
          timeout: 10000 // 10 second timeout
        }
      );

      // Update event log as sent
      await client.query(`
        UPDATE zapier_events
        SET status = 'sent',
            response_status = $1,
            response_body = $2,
            sent_at = NOW()
        WHERE id = $3
      `, [response.status, JSON.stringify(response.data), eventId]);

      return {
        success: true,
        eventId,
        responseStatus: response.status
      };
    } catch (error) {
      // Update event log as failed
      await client.query(`
        UPDATE zapier_events
        SET status = 'failed',
            response_status = $1,
            error_message = $2,
            sent_at = NOW()
        WHERE id = $3
      `, [
        error.response?.status || 0,
        error.message,
        eventId
      ]);

      console.error('Error sending event to Zapier:', error.message);

      return {
        success: false,
        error: error.message,
        eventId
      };
    }
  } finally {
    client.release();
  }
}

/**
 * Get recent events for Zapier polling
 * This is used by Zapier to poll for new events instead of using webhooks
 */
async function getRecentEvents(creatorId, eventType = null, since = null, limit = 100) {
  let query = `
    SELECT
      id,
      event_type,
      event_data,
      created_at
    FROM zapier_events
    WHERE creator_id = $1
      AND status = 'sent'
  `;

  const params = [creatorId];
  let paramIndex = 2;

  if (eventType) {
    query += ` AND event_type = $${paramIndex}`;
    params.push(eventType);
    paramIndex++;
  }

  if (since) {
    query += ` AND created_at > $${paramIndex}`;
    params.push(since);
    paramIndex++;
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await pool.query(query, params);

  // Return events in Zapier-friendly format
  return result.rows.map(row => ({
    id: row.id,
    ...row.event_data,
    _created_at: row.created_at
  }));
}

/**
 * Get event samples for Zapier zap setup
 * Returns recent examples of each event type
 */
async function getEventSamples(creatorId) {
  const samples = {};

  const eventTypes = ['new_donation', 'monthly_milestone', 'new_supporter', 'recurring_donation'];

  for (const eventType of eventTypes) {
    const result = await pool.query(`
      SELECT event_data
      FROM zapier_events
      WHERE creator_id = $1
        AND event_type = $2
        AND status = 'sent'
      ORDER BY created_at DESC
      LIMIT 1
    `, [creatorId, eventType]);

    if (result.rows.length > 0) {
      samples[eventType] = result.rows[0].event_data;
    } else {
      // Return sample data if no real data exists
      samples[eventType] = formatEventForZapier(eventType, getSampleData(eventType));
    }
  }

  return samples;
}

/**
 * Generate sample data for each event type
 */
function getSampleData(eventType) {
  switch (eventType) {
    case 'new_donation':
      return {
        id: crypto.randomUUID(),
        amount: 25.00,
        donor_name: 'John Doe',
        donor_email: 'john@example.com',
        message: 'Great work! Keep it up!',
        payment_method: 'crypto',
        tx_hash: 'ABC123XYZ',
        created_at: new Date().toISOString()
      };

    case 'monthly_milestone':
      return {
        milestone_amount: 1000,
        total_revenue: 1250.50,
        donations_count: 45,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      };

    case 'new_supporter':
      return {
        email: 'jane@example.com',
        name: 'Jane Smith',
        first_donation_amount: 10.00,
        first_donation_date: new Date().toISOString()
      };

    case 'recurring_donation':
      return {
        id: crypto.randomUUID(),
        amount: 50.00,
        donor_email: 'supporter@example.com',
        donor_name: 'Monthly Supporter',
        frequency: 'monthly',
        next_charge_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      };

    default:
      return {};
  }
}

/**
 * Send test event to Zapier
 */
async function sendTestEvent(creatorId) {
  const sampleDonation = getSampleData('new_donation');

  return await sendEventToZapier(creatorId, 'new_donation', sampleDonation);
}

/**
 * Track Zapier connection (when user creates a zap)
 */
async function trackConnection(creatorId, appName, connectionName = null) {
  await pool.query(`
    INSERT INTO zapier_connections (
      creator_id,
      app_name,
      connection_name,
      zap_count,
      last_used_at
    ) VALUES ($1, $2, $3, 1, NOW())
    ON CONFLICT (creator_id, app_name) DO UPDATE SET
      zap_count = zapier_connections.zap_count + 1,
      last_used_at = NOW()
  `, [creatorId, appName, connectionName]);

  return { success: true };
}

/**
 * Get Zapier connection stats
 */
async function getConnectionStats(creatorId) {
  const result = await pool.query(`
    SELECT
      app_name,
      connection_name,
      zap_count,
      active,
      created_at,
      last_used_at
    FROM zapier_connections
    WHERE creator_id = $1
    ORDER BY last_used_at DESC
  `, [creatorId]);

  return result.rows;
}

/**
 * Get Zapier event analytics
 */
async function getEventAnalytics(creatorId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const result = await pool.query(`
    SELECT
      event_type,
      COUNT(*) as total_events,
      COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
      COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
      MAX(created_at) as last_event_at
    FROM zapier_events
    WHERE creator_id = $1
      AND created_at >= $2
    GROUP BY event_type
  `, [creatorId, since]);

  return result.rows;
}

module.exports = {
  getZapierSettings,
  updateZapierSettings,
  sendEventToZapier,
  getRecentEvents,
  getEventSamples,
  sendTestEvent,
  trackConnection,
  getConnectionStats,
  getEventAnalytics,
  formatEventForZapier
};
