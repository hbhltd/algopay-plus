/**
 * Subscription Middleware
 * Protects routes and enforces tier-based feature access
 */

const subscriptionService = require('./subscription-service');
const { getTierConfig, getUpgradeRecommendation } = require('./subscription-tiers');

/**
 * Middleware to check if creator has access to a specific feature
 * Usage: app.post('/api/some-feature', requireFeature('webhooks'), handler)
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      const creatorId = req.body.creatorId || req.params.creatorId || req.query.creatorId;

      if (!creatorId) {
        return res.status(400).json({
          success: false,
          error: 'creatorId is required'
        });
      }

      const hasAccess = await subscriptionService.checkFeatureAccess(creatorId, featureName);

      if (!hasAccess) {
        // Get current subscription to provide upgrade recommendation
        const subscription = await subscriptionService.getCreatorSubscription(creatorId);
        const currentTier = subscription ? subscription.tier : 'free';

        const upgrade = getUpgradeRecommendation(currentTier, featureName);

        return res.status(403).json({
          success: false,
          error: 'Feature not available in your current plan',
          feature: featureName,
          currentTier,
          upgradeRecommendation: upgrade
        });
      }

      // Store tier info in request for use in handler
      const subscription = await subscriptionService.getCreatorSubscription(creatorId);
      req.subscription = subscription;

      next();
    } catch (error) {
      console.error('Error in requireFeature middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check feature access'
      });
    }
  };
}

/**
 * Middleware to check and enforce action limits (like max emails per month)
 * Usage: app.post('/api/send-email', checkLimit('maxEmailsPerMonth', true), handler)
 */
function checkLimit(action, incrementUsage = false) {
  return async (req, res, next) => {
    try {
      const creatorId = req.body.creatorId || req.params.creatorId || req.query.creatorId;

      if (!creatorId) {
        return res.status(400).json({
          success: false,
          error: 'creatorId is required'
        });
      }

      const result = await subscriptionService.checkActionLimit(
        creatorId,
        action,
        incrementUsage
      );

      if (!result.allowed) {
        const subscription = await subscriptionService.getCreatorSubscription(creatorId);
        const currentTier = subscription ? subscription.tier : 'free';

        const upgrade = getUpgradeRecommendation(currentTier, action);

        return res.status(403).json({
          success: false,
          error: 'Limit reached for your current plan',
          action,
          currentUsage: result.currentUsage,
          limit: result.limit,
          currentTier,
          upgradeRecommendation: upgrade
        });
      }

      // Store usage info in request
      req.usageCheck = result;

      next();
    } catch (error) {
      console.error('Error in checkLimit middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check action limit'
      });
    }
  };
}

/**
 * Middleware to require minimum tier
 * Usage: app.post('/api/premium-feature', requireTier('pro'), handler)
 */
function requireTier(minTierName) {
  return async (req, res, next) => {
    try {
      const creatorId = req.body.creatorId || req.params.creatorId || req.query.creatorId;

      if (!creatorId) {
        return res.status(400).json({
          success: false,
          error: 'creatorId is required'
        });
      }

      const subscription = await subscriptionService.getCreatorSubscription(creatorId);
      const currentTier = subscription ? subscription.tier : 'free';

      // Simplified tier hierarchy: free (0) or paid (1)
      const tierHierarchy = {
        'free': 0,
        'paid': 1,
        'pro': 1, // legacy compatibility
        'premium': 1 // legacy compatibility
      };

      const currentLevel = tierHierarchy[currentTier] || 0;
      const requiredLevel = tierHierarchy[minTierName] || 0;

      if (currentLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          error: 'This feature requires Supportly Creator subscription',
          currentTier,
          requiredTier: 'paid',
          upgradeUrl: `/pricing`,
          price: 49.95,
          message: 'Upgrade to Supportly Creator for just $49.95/year to unlock all features!'
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Error in requireTier middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check tier access'
      });
    }
  };
}

/**
 * Middleware to check if subscription is active (not expired or canceled)
 * Usage: app.post('/api/some-feature', requireActiveSubscription(), handler)
 */
function requireActiveSubscription() {
  return async (req, res, next) => {
    try {
      const creatorId = req.body.creatorId || req.params.creatorId || req.query.creatorId;

      if (!creatorId) {
        return res.status(400).json({
          success: false,
          error: 'creatorId is required'
        });
      }

      const subscription = await subscriptionService.getCreatorSubscription(creatorId);

      if (!subscription) {
        return res.status(403).json({
          success: false,
          error: 'No active subscription found',
          message: 'Please subscribe to access this feature'
        });
      }

      const now = new Date();
      const expiresAt = new Date(subscription.expires_at);
      const gracePeriodEnd = subscription.grace_period_ends_at ?
        new Date(subscription.grace_period_ends_at) : null;

      const isActive = subscription.status === 'active' && expiresAt > now;
      const inGracePeriod = gracePeriodEnd && gracePeriodEnd > now;

      if (!isActive && !inGracePeriod) {
        return res.status(403).json({
          success: false,
          error: 'Subscription expired',
          message: 'Please renew your subscription to continue using this feature',
          subscription: {
            tier: subscription.tier,
            expiredAt: subscription.expires_at,
            gracePeriodEnds: subscription.grace_period_ends_at
          }
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Error in requireActiveSubscription middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check subscription status'
      });
    }
  };
}

/**
 * Helper function to manually check feature access in route handlers
 * Usage: const canUseWebhooks = await checkFeatureAccess(creatorId, 'webhooks');
 */
async function checkFeatureAccess(creatorId, featureName) {
  return await subscriptionService.checkFeatureAccess(creatorId, featureName);
}

/**
 * Helper function to manually check action limits in route handlers
 * Usage: const canSend = await checkActionLimit(creatorId, 'maxEmailsPerMonth');
 */
async function checkActionLimit(creatorId, action, increment = false) {
  return await subscriptionService.checkActionLimit(creatorId, action, increment);
}

module.exports = {
  requireFeature,
  checkLimit,
  requireTier,
  requireActiveSubscription,
  checkFeatureAccess,
  checkActionLimit
};
