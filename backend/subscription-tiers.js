/**
 * Subscription Tier Configuration
 * Simplified pricing: Free trial + One paid tier at $24.95/year
 */

const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    billingPeriod: 'lifetime',
    features: {
      // Payment Methods
      cryptoPayments: true,
      stripePayments: false,
      paypalPayments: false,
      cashappDisplay: false,

      // Donation Features
      maxMonthlyDonations: 10, // Very limited for trial
      customDonationAmounts: true,
      recurringDonations: false,
      donorMessages: true,
      nftRewards: false,

      // Email & Notifications
      emailNotifications: true,
      customEmailService: false,
      emailTemplates: 'basic',
      webhooks: false,

      // Analytics & Reporting
      basicAnalytics: true,
      advancedAnalytics: false,
      exportData: false,
      revenueReports: false,
      donorInsights: false,

      // Community & Engagement
      donorManagement: false,
      newsletter: false,
      customBranding: false,
      customDomain: false,

      // Integrations
      discordIntegration: false,
      zapierIntegration: false,
      socialMediaIntegration: false,
      accountingIntegration: false,

      // Content & Monetization
      contentGating: false,
      digitalProducts: false,
      membershipTiers: false,
      scheduledSessions: false,

      // Support
      supportLevel: 'community',

      // Limits
      maxWebhooks: 0,
      maxEmailsPerMonth: 50,
      maxNewsletterSubscribers: 0,
      dataRetentionDays: 30,
    },
    description: 'Try Supportly free - perfect for getting started',
    highlights: [
      'Crypto (USDC) payments',
      'Up to 10 donations/month',
      'Basic analytics',
      'Email notifications',
      'Community support'
    ],
    trialMode: true
  },

  PAID: {
    id: 'paid',
    name: 'Supportly Creator',
    price: 24.95, // USD per year - SIMPLIFIED PRICING!
    billingPeriod: 'yearly',
    features: {
      // Payment Methods - ALL UNLOCKED
      cryptoPayments: true,
      stripePayments: true,
      paypalPayments: true,
      cashappDisplay: true,

      // Donation Features - ALL UNLOCKED
      maxMonthlyDonations: -1, // unlimited
      customDonationAmounts: true,
      recurringDonations: true,
      donorMessages: true,
      nftRewards: true,

      // Email & Notifications - ALL UNLOCKED
      emailNotifications: true,
      customEmailService: true,
      emailTemplates: 'custom',
      webhooks: true,

      // Analytics & Reporting - ALL UNLOCKED
      basicAnalytics: true,
      advancedAnalytics: true,
      exportData: true,
      revenueReports: true,
      donorInsights: true,

      // Community & Engagement - ALL UNLOCKED
      donorManagement: true,
      newsletter: true,
      customBranding: true,
      customDomain: true,

      // Integrations - ALL UNLOCKED
      discordIntegration: true,
      zapierIntegration: true,
      socialMediaIntegration: true,
      accountingIntegration: true,

      // Content & Monetization - ALL UNLOCKED
      contentGating: true,
      digitalProducts: true,
      membershipTiers: -1, // unlimited
      scheduledSessions: true,

      // Support
      supportLevel: 'email',

      // Limits - ALL UNLIMITED
      maxWebhooks: -1,
      maxEmailsPerMonth: -1,
      maxNewsletterSubscribers: -1,
      dataRetentionDays: -1,
    },
    description: 'Everything you need to grow your creator business - just $24.95/year!',
    highlights: [
      '✨ ALL Features Unlocked',
      '💳 All Payment Methods (Crypto, Stripe, PayPal, Cash App)',
      '📊 Advanced Analytics & Reporting',
      '🎮 Discord Community Integration',
      '⚡ Zapier Automation (5000+ Apps)',
      '💼 QuickBooks Accounting Sync',
      '🎁 NFT Rewards for Supporters',
      '📧 Unlimited Email Campaigns',
      '🔒 Content Gating & Digital Products',
      '📱 Social Media Auto-Posting',
      '🌐 Custom Domain Support',
      '💬 Email Support',
      '♾️ Unlimited Donations',
      '♾️ Unlimited Webhooks',
      '♾️ Unlimited Newsletter Subscribers'
    ]
  },

  // Legacy tier names for backwards compatibility
  PRO: {
    id: 'paid',
    name: 'Supportly Creator',
    price: 24.95,
    billingPeriod: 'yearly',
    get features() { return SUBSCRIPTION_TIERS.PAID.features; },
    get description() { return SUBSCRIPTION_TIERS.PAID.description; },
    get highlights() { return SUBSCRIPTION_TIERS.PAID.highlights; }
  },

  PREMIUM: {
    id: 'paid',
    name: 'Supportly Creator',
    price: 24.95,
    billingPeriod: 'yearly',
    get features() { return SUBSCRIPTION_TIERS.PAID.features; },
    get description() { return SUBSCRIPTION_TIERS.PAID.description; },
    get highlights() { return SUBSCRIPTION_TIERS.PAID.highlights; }
  }
};

/**
 * Helper function to get tier configuration
 */
function getTierConfig(tierName) {
  const tier = tierName.toUpperCase();
  if (!SUBSCRIPTION_TIERS[tier]) {
    throw new Error(`Invalid subscription tier: ${tierName}`);
  }
  return SUBSCRIPTION_TIERS[tier];
}

/**
 * Helper function to check if a feature is available for a tier
 */
function hasFeature(tierName, featureName) {
  const config = getTierConfig(tierName);
  return config.features[featureName] === true ||
         (typeof config.features[featureName] === 'number' && config.features[featureName] !== 0);
}

/**
 * Helper function to get feature limit for a tier
 * Returns -1 for unlimited, 0 for not available, or the specific limit
 */
function getFeatureLimit(tierName, featureName) {
  const config = getTierConfig(tierName);
  const value = config.features[featureName];

  if (typeof value === 'boolean') {
    return value ? -1 : 0;
  }
  return value;
}

/**
 * Check if creator can perform action based on their tier and current usage
 */
function canPerformAction(tierName, action, currentUsage = 0) {
  const limit = getFeatureLimit(tierName, action);

  // Feature not available
  if (limit === 0 || limit === false) {
    return false;
  }

  // Unlimited
  if (limit === -1 || limit === true) {
    return true;
  }

  // Check against limit
  return currentUsage < limit;
}

/**
 * Get upgrade recommendation based on feature needs
 */
function getUpgradeRecommendation(currentTier, desiredFeature) {
  // Simplified: Only one paid tier
  const currentTierUpper = currentTier.toUpperCase();

  // If on free tier and feature requires paid
  if (currentTierUpper === 'FREE' && hasFeature('PAID', desiredFeature)) {
    return {
      recommendedTier: 'paid',
      tierName: 'Supportly Creator',
      price: 24.95,
      reason: `${desiredFeature} is available with Supportly Creator for just $24.95/year`
    };
  }

  return null;
}

/**
 * Calculate prorated amount for subscription changes
 * Simplified since we only have one paid tier now
 */
function calculateProration(currentTier, newTier, daysRemaining, totalDays = 365) {
  const currentConfig = getTierConfig(currentTier);
  const newConfig = getTierConfig(newTier);

  const currentDailyRate = currentConfig.price / totalDays;
  const newDailyRate = newConfig.price / totalDays;

  const creditFromCurrent = currentDailyRate * daysRemaining;
  const chargeForNew = newDailyRate * daysRemaining;

  return {
    credit: creditFromCurrent,
    charge: chargeForNew,
    netCharge: Math.max(0, chargeForNew - creditFromCurrent),
    isUpgrade: newConfig.price > currentConfig.price
  };
}

module.exports = {
  SUBSCRIPTION_TIERS,
  getTierConfig,
  hasFeature,
  getFeatureLimit,
  canPerformAction,
  getUpgradeRecommendation,
  calculateProration
};
