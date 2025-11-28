/**
 * QuickBooks API Routes
 */

const express = require('express');
const router = express.Router();
const qbService = require('./quickbooks-service');
const { requireFeature } = require('./subscription-middleware');

router.get('/auth-url/:creatorId', requireFeature('accountingIntegration'), (req, res) => {
  const authUrl = qbService.getQuickBooksAuthUrl(req.params.creatorId);
  res.json({ success: true, authUrl });
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state: creatorId, realmId } = req.query;
    await qbService.connectQuickBooks(creatorId, code, realmId);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/integrations?quickbooks=connected`);
  } catch (error) {
    console.error('QuickBooks OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/integrations?quickbooks=error`);
  }
});

router.post('/disconnect', async (req, res) => {
  try {
    await qbService.disconnectQuickBooks(req.body.creatorId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/settings/:creatorId', async (req, res) => {
  try {
    const settings = await qbService.getQuickBooksSettings(req.params.creatorId);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/stats/:creatorId', async (req, res) => {
  try {
    const stats = await qbService.getSyncStats(req.params.creatorId);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sync-donation', requireFeature('accountingIntegration'), async (req, res) => {
  try {
    const { creatorId, donation } = req.body;
    const result = await qbService.createSalesReceipt(creatorId, donation);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
