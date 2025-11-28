/**
 * Subscription Tier Configuration
 * Defines pricing, features, and limits for each tier
 */

const SUBSCRIPTION_TIERS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    billingPeriod: 'lifetime',
    features: {
      // Payment Methods
      cryptoPayments: true,
      stripePayments: false,
      paypalPayments: false,
      cashappDisplay: false,

      // Donation Features
      maxMonthlyDonations: 50,
      customDonationAmounts: true,
      recurringDonations: false,
      donorMessages: true,
      nftRewards: false,

      // Email & Notifications
      emailNotifications: true,
      customEmailService: false,
      emailTemplates: 'basic', // basic, custom
      webhooks: false,

      // Analytics & Reporting
      basicAnalytics: true,
      advancedAnalytics: false,
      exportData: false, // CSV/JSON export
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
      supportLevel: 'community', // community, email, priority

      // Limits
      maxWebhooks: 0,
      maxEmailsPerMonth: 100,
      maxNewsletterSubscribers: 0,
      dataRetentionDays: 90,
    },
    description: 'Perfect for getting started with crypto donations',
    highlights: [
      'Crypto (USDC) payments',
      'Up to 50 donations/month',
      'Basic analytics',
      'Email notifications',
      'Community support'
    ]
  },

  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 99, // USD per year
    billingPeriod: 'yearly',
    features: {
      // Payment Methods
      cryptoPayments: true,
      stripePayments: true,
      paypalPayments: true,
      cashappDisplay: true,

      // Donation Features
      maxMonthlyDonations: 500,
      customDonationAmounts: true,
      recurringDonations: true,
      donorMessages: true,
      nftRewards: true,

      // Email & Notifications
      emailNotifications: true,
      customEmailService: true,
      emailTemplates: 'custom',
      webhooks: true,

      // Analytics & Reporting
      basicAnalytics: true,
      advancedAnalytics: true,
      exportData: true,
      revenueReports: true,
      donorInsights: true,

      // Community & Engagement
      donorManagement: true,
      newsletter: true,
      customBranding: true,
      customDomain: false,

      // Integrations
      discordIntegration: true,
      zapierIntegration: true,
      socialMediaIntegration: true,
      accountingIntegration: false,

      // Content & Monetization
      contentGating: true,
      digitalProducts: false,
      membershipTiers: 1, // max membership tiers
      scheduledSessions: false,

      // Support
      supportLevel: 'email',

      // Limits
      maxWebhooks: 5,
      maxEmailsPerMonth: 5000,
      maxNewsletterSubscribers: 1000,
      dataRetentionDays: 365,
    },
    description: 'For serious creators building their community',
    highlights: [
      'All payment methods (Crypto, Stripe, PayPal)',
      'Up to 500 donations/month',
      'Advanced analytics & reports',
      'Webhooks & integrations',
      'Donor management & newsletters',
      'NFT rewards',
      'Email support'
    ]
  },

  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 299, // USD per year
    billingPeriod: 'yearly',
    features: {
      // Payment Methods
      cryptoPayments: true,
      stripePayments: true,
      paypalPayments: true,
      cashappDisplay: true,

      // Donation Features
      maxMonthlyDonations: -1, // unlimited
      customDonationAmounts: true,
      recurringDonations: true,
      donorMessages: true,
      nftRewards: true,

      // Email & Notifications
      emailNotifications: true,
      customEmailService: true,
      emailTemplates: 'custom',
      webhooks: true,

      // Analytics & Reporting
      basicAnalytics: true,
      advancedAnalytics: true,
      exportData: true,
      revenueReports: true,
      donorInsights: true,

      // Community & Engagement
      donorManagement: true,
      newsletter: true,
      customBranding: true,
      customDomain: true,

      // Integrations
      discordIntegration: true,
      zapierIntegration: true,
      socialMediaIntegration: true,
      accountingIntegration: true,

      // Content & Monetization
      contentGating: true,
      digitalProducts: true,
      membershipTiers: -1, // unlimited
      scheduledSessions: true,

      // Support
      supportLevel: 'priority',

      // Limits
      maxWebhooks: -1, // unlimited
      maxEmailsPerMonth: -1, // unlimited
      maxNewsletterSubscribers: -1, // unlimited
      dataRetentionDays: -1, // unlimited (permanent)
    },
    description: 'Complete solution for professional creators',
    highlights: [
      'Unlimited donations',
      'All payment methods',
      'Full analytics suite',
      'Unlimited webhooks',
      'Custom domain',
      'Digital products & content gating',
      'QuickBooks integration',
      'Scheduled consultations',
      'Priority support'
    ]
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
 * Get upgrade recommendations based on feature needs
 */
function getUpgradeRecommendation(currentTier, desiredFeature) {
  const tiers = ['FREE', 'PRO', 'PREMIUM'];
  const currentIndex = tiers.indexOf(currentTier.toUpperCase());

  for (let i = currentIndex + 1; i < tiers.length; i++) {
    const tier = tiers[i];
    if (hasFeature(tier, desiredFeature)) {
      return {
        recommendedTier: SUBSCRIPTION_TIERS[tier].id,
        tierName: SUBSCRIPTION_TIERS[tier].name,
        price: SUBSCRIPTION_TIERS[tier].price,
        reason: `${desiredFeature} is available on the ${SUBSCRIPTION_TIERS[tier].name} plan`
      };
    }
  }

  return null;
}

/**
 * Calculate prorated amount for subscription changes
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
