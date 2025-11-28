/**
 * Zapier API Routes
 * RESTful API endpoints for Zapier integration
 */

const express = require('express');
const router = express.Router();
const zapierService = require('./zapier-service');
const { requireFeature } = require('./subscription-middleware');

/**
 * GET /api/zapier/settings/:creatorId
 * Get Zapier settings for creator
 */
router.get('/settings/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    const settings = await zapierService.getZapierSettings(creatorId);

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching Zapier settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Zapier settings'
    });
  }
});

/**
 * PUT /api/zapier/settings
 * Update Zapier settings
 * Body: { creatorId, webhookUrl, enabled, triggers }
 */
router.put('/settings', requireFeature('zapierIntegration'), async (req, res) => {
  try {
    const { creatorId, webhookUrl, enabled, triggerNewDonation, triggerMonthlyMilestone, triggerNewSupporter, triggerRecurringDonation, enablePolling } = req.body;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        error: 'creatorId is required'
      });
    }

    const settings = await zapierService.updateZapierSettings(creatorId, {
      webhookUrl,
      enabled,
      triggerNewDonation,
      triggerMonthlyMilestone,
      triggerNewSupporter,
      triggerRecurringDonation,
      enablePolling
    });

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error updating Zapier settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Zapier settings'
    });
  }
});

/**
 * POST /api/zapier/test
 * Send test event to Zapier
 * Body: { creatorId }
 */
router.post('/test', requireFeature('zapierIntegration'), async (req, res) => {
  try {
    const { creatorId } = req.body;

    if (!creatorId) {
      return res.status(400).json({
        success: false,
        error: 'creatorId is required'
      });
    }

    const result = await zapierService.sendTestEvent(creatorId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Test event sent to Zapier successfully!',
        ...result
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.reason || 'Failed to send test event'
      });
    }
  } catch (error) {
    console.error('Error sending test event:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test event'
    });
  }
});

/**
 * GET /api/zapier/polls/:creatorId/donations
 * Polling endpoint for Zapier to fetch new donations
 * Query params: since (ISO timestamp), limit (number)
 */
router.get('/polls/:creatorId/donations', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { since, limit } = req.query;

    // Check if polling is enabled
    const settings = await zapierService.getZapierSettings(creatorId);

    if (!settings || !settings.zapier_enabled || !settings.enable_polling) {
      return res.status(403).json({
        success: false,
        error: 'Zapier polling is not enabled for this creator'
      });
    }

    const events = await zapierService.getRecentEvents(
      creatorId,
      'new_donation',
      since,
      parseInt(limit) || 100
    );

    res.json(events);
  } catch (error) {
    console.error('Error fetching donations for Zapier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch donations'
    });
  }
});

/**
 * GET /api/zapier/polls/:creatorId/events
 * Polling endpoint for all event types
 * Query params: type (event type), since (ISO timestamp), limit (number)
 */
router.get('/polls/:creatorId/events', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { type, since, limit } = req.query;

    const settings = await zapierService.getZapierSettings(creatorId);

    if (!settings || !settings.zapier_enabled || !settings.enable_polling) {
      return res.status(403).json({
        success: false,
        error: 'Zapier polling is not enabled for this creator'
      });
    }

    const events = await zapierService.getRecentEvents(
      creatorId,
      type,
      since,
      parseInt(limit) || 100
    );

    res.json(events);
  } catch (error) {
    console.error('Error fetching events for Zapier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events'
    });
  }
});

/**
 * GET /api/zapier/samples/:creatorId
 * Get sample data for each event type (for Zapier zap setup)
 */
router.get('/samples/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    const samples = await zapierService.getEventSamples(creatorId);

    res.json({
      success: true,
      samples
    });
  } catch (error) {
    console.error('Error fetching event samples:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event samples'
    });
  }
});

/**
 * POST /api/zapier/track-connection
 * Track when a creator connects a Zapier app
 * Body: { creatorId, appName, connectionName }
 */
router.post('/track-connection', async (req, res) => {
  try {
    const { creatorId, appName, connectionName } = req.body;

    if (!creatorId || !appName) {
      return res.status(400).json({
        success: false,
        error: 'creatorId and appName are required'
      });
    }

    await zapierService.trackConnection(creatorId, appName, connectionName);

    res.json({
      success: true,
      message: 'Connection tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking Zapier connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track connection'
    });
  }
});

/**
 * GET /api/zapier/connections/:creatorId
 * Get all Zapier connections/zaps for a creator
 */
router.get('/connections/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    const connections = await zapierService.getConnectionStats(creatorId);

    res.json({
      success: true,
      connections
    });
  } catch (error) {
    console.error('Error fetching Zapier connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch connections'
    });
  }
});

/**
 * GET /api/zapier/analytics/:creatorId
 * Get Zapier event analytics
 * Query params: days (number of days, default 30)
 */
router.get('/analytics/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { days } = req.query;

    const analytics = await zapierService.getEventAnalytics(
      creatorId,
      parseInt(days) || 30
    );

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error fetching Zapier analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

/**
 * GET /api/zapier/webhook-url
 * Generate a unique webhook URL for creator's Zapier integration
 */
router.get('/webhook-url/:creatorId', requireFeature('zapierIntegration'), (req, res) => {
  try {
    const { creatorId } = req.params;

    // Generate webhook URL that Zapier will call
    const webhookUrl = `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/zapier/hooks/${creatorId}`;

    res.json({
      success: true,
      webhookUrl,
      instructions: 'Use this URL as your Zapier webhook endpoint. When you create a Zap, use this URL to receive events from Supportly.'
    });
  } catch (error) {
    console.error('Error generating webhook URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate webhook URL'
    });
  }
});

module.exports = router;
