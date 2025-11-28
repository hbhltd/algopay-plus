/**
 * Subscription Service
 * Handles all subscription management business logic
 */

const { Pool } = require('pg');
const {
  SUBSCRIPTION_TIERS,
  getTierConfig,
  hasFeature,
  getFeatureLimit,
  canPerformAction,
  getUpgradeRecommendation,
  calculateProration
} = require('./subscription-tiers');

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Create a new subscription for a creator
 */
async function createSubscription(creatorId, tierName, paymentDetails = {}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const tierConfig = getTierConfig(tierName);

    // Calculate dates
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year from now

    const nextPaymentDate = new Date(expiresAt);

    // Create subscription record
    const subscriptionResult = await client.query(`
      INSERT INTO subscriptions (
        creator_id,
        tier,
        status,
        amount,
        payment_method,
        payment_tx_hash,
        stripe_subscription_id,
        stripe_customer_id,
        stripe_payment_intent_id,
        starts_at,
        expires_at,
        next_payment_date,
        last_payment_date,
        auto_renew
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      creatorId,
      tierConfig.id,
      'active',
      tierConfig.price,
      paymentDetails.paymentMethod || 'stripe',
      paymentDetails.txHash || null,
      paymentDetails.stripeSubscriptionId || null,
      paymentDetails.stripeCustomerId || null,
      paymentDetails.stripePaymentIntentId || null,
      now,
      expiresAt,
      nextPaymentDate,
      now,
      true
    ]);

    const subscription = subscriptionResult.rows[0];

    // Update creator's tier
    await client.query(`
      UPDATE creators
      SET subscription_tier = $1,
          subscription_expires_at = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [tierConfig.id, expiresAt, creatorId]);

    // Create subscription history entry
    await client.query(`
      INSERT INTO subscription_history (
        subscription_id,
        creator_id,
        event_type,
        new_tier,
        new_status,
        amount,
        payment_tx_hash,
        stripe_event_id,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      subscription.id,
      creatorId,
      'created',
      tierConfig.id,
      'active',
      tierConfig.price,
      paymentDetails.txHash || null,
      paymentDetails.stripeEventId || null,
      JSON.stringify(paymentDetails)
    ]);

    // Create usage tracking record
    await client.query(`
      INSERT INTO subscription_usage (creator_id)
      VALUES ($1)
      ON CONFLICT (creator_id) DO NOTHING
    `, [creatorId]);

    // Generate invoice
    const invoiceNumber = await generateInvoiceNumber(client);
    await client.query(`
      INSERT INTO subscription_invoices (
        subscription_id,
        creator_id,
        invoice_number,
        amount,
        status,
        payment_method,
        payment_tx_hash,
        stripe_invoice_id,
        stripe_payment_intent_id,
        billing_period_start,
        billing_period_end,
        paid_at,
        due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      subscription.id,
      creatorId,
      invoiceNumber,
      tierConfig.price,
      'paid',
      paymentDetails.paymentMethod || 'stripe',
      paymentDetails.txHash || null,
      paymentDetails.stripeInvoiceId || null,
      paymentDetails.stripePaymentIntentId || null,
      now,
      expiresAt,
      now,
      expiresAt
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      subscription,
      tier: tierConfig
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating subscription:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Generate a unique invoice number
 */
async function generateInvoiceNumber(client) {
  const result = await client.query('SELECT generate_invoice_number() as invoice_number');
  return result.rows[0].invoice_number;
}

/**
 * Get creator's current subscription
 */
async function getCreatorSubscription(creatorId) {
  const result = await pool.query(`
    SELECT s.*, c.username, c.display_name, c.email
    FROM subscriptions s
    JOIN creators c ON s.creator_id = c.id
    WHERE s.creator_id = $1
    AND s.status IN ('active', 'canceled')
    ORDER BY s.created_at DESC
    LIMIT 1
  `, [creatorId]);

  if (result.rows.length === 0) {
    return null;
  }

  const subscription = result.rows[0];

  // Check if expired
  const now = new Date();
  const expiresAt = new Date(subscription.expires_at);

  if (expiresAt < now && subscription.status === 'active') {
    // Subscription has expired, update status
    await updateSubscriptionStatus(subscription.id, 'expired');
    subscription.status = 'expired';
  }

  // Get tier config
  const tierConfig = getTierConfig(subscription.tier);

  return {
    ...subscription,
    tierConfig,
    isExpired: expiresAt < now,
    daysUntilExpiry: Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))
  };
}

/**
 * Update subscription status
 */
async function updateSubscriptionStatus(subscriptionId, newStatus, metadata = {}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current subscription
    const subResult = await client.query(`
      SELECT * FROM subscriptions WHERE id = $1
    `, [subscriptionId]);

    const oldSubscription = subResult.rows[0];

    // Update subscription
    await client.query(`
      UPDATE subscriptions
      SET status = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [newStatus, subscriptionId]);

    // Record in history
    await client.query(`
      INSERT INTO subscription_history (
        subscription_id,
        creator_id,
        event_type,
        old_status,
        new_status,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      subscriptionId,
      oldSubscription.creator_id,
      `status_changed_to_${newStatus}`,
      oldSubscription.status,
      newStatus,
      JSON.stringify(metadata)
    ]);

    // If expired, set grace period
    if (newStatus === 'expired') {
      const gracePeriodEnd = new Date();
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7 days grace period

      await client.query(`
        UPDATE subscriptions
        SET grace_period_ends_at = $1
        WHERE id = $2
      `, [gracePeriodEnd, subscriptionId]);
    }

    await client.query('COMMIT');

    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating subscription status:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cancel a subscription
 */
async function cancelSubscription(subscriptionId, reason = null) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const now = new Date();

    // Get current subscription
    const subResult = await client.query(`
      SELECT * FROM subscriptions WHERE id = $1
    `, [subscriptionId]);

    const subscription = subResult.rows[0];

    // Update subscription
    await client.query(`
      UPDATE subscriptions
      SET status = 'canceled',
          canceled_at = $1,
          cancellation_reason = $2,
          auto_renew = false,
          updated_at = NOW()
      WHERE id = $3
    `, [now, reason, subscriptionId]);

    // Record in history
    await client.query(`
      INSERT INTO subscription_history (
        subscription_id,
        creator_id,
        event_type,
        old_status,
        new_status,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      subscriptionId,
      subscription.creator_id,
      'canceled',
      subscription.status,
      'canceled',
      JSON.stringify({ reason, canceled_at: now })
    ]);

    await client.query('COMMIT');

    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error canceling subscription:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Upgrade or downgrade a subscription
 */
async function changeSubscriptionTier(subscriptionId, newTierName, paymentDetails = {}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current subscription
    const subResult = await client.query(`
      SELECT * FROM subscriptions WHERE id = $1
    `, [subscriptionId]);

    const oldSubscription = subResult.rows[0];
    const oldTierConfig = getTierConfig(oldSubscription.tier);
    const newTierConfig = getTierConfig(newTierName);

    // Calculate prorated amount
    const now = new Date();
    const expiresAt = new Date(oldSubscription.expires_at);
    const totalDays = 365;
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    const proration = calculateProration(
      oldSubscription.tier,
      newTierName,
      daysRemaining,
      totalDays
    );

    // Update subscription
    const newExpiresAt = new Date(now);
    newExpiresAt.setFullYear(newExpiresAt.getFullYear() + 1);

    await client.query(`
      UPDATE subscriptions
      SET tier = $1,
          amount = $2,
          expires_at = $3,
          next_payment_date = $4,
          last_payment_date = $5,
          updated_at = NOW()
      WHERE id = $6
    `, [
      newTierConfig.id,
      newTierConfig.price,
      newExpiresAt,
      newExpiresAt,
      now,
      subscriptionId
    ]);

    // Update creator's tier
    await client.query(`
      UPDATE creators
      SET subscription_tier = $1,
          subscription_expires_at = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [newTierConfig.id, newExpiresAt, oldSubscription.creator_id]);

    // Record in history
    const eventType = proration.isUpgrade ? 'upgraded' : 'downgraded';
    await client.query(`
      INSERT INTO subscription_history (
        subscription_id,
        creator_id,
        event_type,
        old_tier,
        new_tier,
        amount,
        payment_tx_hash,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      subscriptionId,
      oldSubscription.creator_id,
      eventType,
      oldTierConfig.id,
      newTierConfig.id,
      proration.netCharge,
      paymentDetails.txHash || null,
      JSON.stringify({ proration, ...paymentDetails })
    ]);

    // Create invoice for the change
    const invoiceNumber = await generateInvoiceNumber(client);
    await client.query(`
      INSERT INTO subscription_invoices (
        subscription_id,
        creator_id,
        invoice_number,
        amount,
        status,
        payment_method,
        payment_tx_hash,
        stripe_invoice_id,
        stripe_payment_intent_id,
        billing_period_start,
        billing_period_end,
        paid_at,
        due_date,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      subscriptionId,
      oldSubscription.creator_id,
      invoiceNumber,
      proration.netCharge,
      'paid',
      paymentDetails.paymentMethod || 'stripe',
      paymentDetails.txHash || null,
      paymentDetails.stripeInvoiceId || null,
      paymentDetails.stripePaymentIntentId || null,
      now,
      newExpiresAt,
      now,
      newExpiresAt,
      JSON.stringify({ eventType, proration })
    ]);

    await client.query('COMMIT');

    return {
      success: true,
      oldTier: oldTierConfig,
      newTier: newTierConfig,
      proration
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error changing subscription tier:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Renew a subscription
 */
async function renewSubscription(subscriptionId, paymentDetails = {}) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current subscription
    const subResult = await client.query(`
      SELECT * FROM subscriptions WHERE id = $1
    `, [subscriptionId]);

    const subscription = subResult.rows[0];
    const tierConfig = getTierConfig(subscription.tier);

    // Calculate new dates
    const now = new Date();
    const currentExpiry = new Date(subscription.expires_at);
    const newExpiry = new Date(currentExpiry > now ? currentExpiry : now);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    // Update subscription
    await client.query(`
      UPDATE subscriptions
      SET status = 'active',
          expires_at = $1,
          next_payment_date = $2,
          last_payment_date = $3,
          grace_period_ends_at = NULL,
          updated_at = NOW()
      WHERE id = $4
    `, [newExpiry, newExpiry, now, subscriptionId]);

    // Update creator
    await client.query(`
      UPDATE creators
      SET subscription_expires_at = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [newExpiry, subscription.creator_id]);

    // Record in history
    await client.query(`
      INSERT INTO subscription_history (
        subscription_id,
        creator_id,
        event_type,
        new_status,
        amount,
        payment_tx_hash,
        stripe_event_id,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      subscriptionId,
      subscription.creator_id,
      'renewed',
      'active',
      tierConfig.price,
      paymentDetails.txHash || null,
      paymentDetails.stripeEventId || null,
      JSON.stringify(paymentDetails)
    ]);

    // Create invoice
    const invoiceNumber = await generateInvoiceNumber(client);
    await client.query(`
      INSERT INTO subscription_invoices (
        subscription_id,
        creator_id,
        invoice_number,
        amount,
        status,
        payment_method,
        payment_tx_hash,
        stripe_invoice_id,
        stripe_payment_intent_id,
        billing_period_start,
        billing_period_end,
        paid_at,
        due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `, [
      subscriptionId,
      subscription.creator_id,
      invoiceNumber,
      tierConfig.price,
      'paid',
      paymentDetails.paymentMethod || 'stripe',
      paymentDetails.txHash || null,
      paymentDetails.stripeInvoiceId || null,
      paymentDetails.stripePaymentIntentId || null,
      now,
      newExpiry,
      now,
      newExpiry
    ]);

    await client.query('COMMIT');

    return { success: true, newExpiry };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error renewing subscription:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if creator can use a feature
 */
async function checkFeatureAccess(creatorId, featureName) {
  // Get creator's subscription
  const subscription = await getCreatorSubscription(creatorId);

  if (!subscription) {
    // No subscription, default to free tier
    return hasFeature('free', featureName);
  }

  // Check if subscription is active or in grace period
  const now = new Date();
  const expiresAt = new Date(subscription.expires_at);
  const gracePeriodEnd = subscription.grace_period_ends_at ?
    new Date(subscription.grace_period_ends_at) : null;

  const isActive = subscription.status === 'active' && expiresAt > now;
  const inGracePeriod = gracePeriodEnd && gracePeriodEnd > now;

  if (!isActive && !inGracePeriod) {
    // Expired, default to free tier
    return hasFeature('free', featureName);
  }

  // Check tier feature
  return hasFeature(subscription.tier, featureName);
}

/**
 * Check if creator can perform action (with usage limits)
 */
async function checkActionLimit(creatorId, action, incrementUsage = false) {
  const client = await pool.connect();

  try {
    // Get subscription
    const subscription = await getCreatorSubscription(creatorId);
    const tier = subscription ? subscription.tier : 'free';

    // Get current usage
    const usageResult = await client.query(`
      SELECT * FROM subscription_usage
      WHERE creator_id = $1
    `, [creatorId]);

    let usage = usageResult.rows[0];

    if (!usage) {
      // Create usage record
      await client.query(`
        INSERT INTO subscription_usage (creator_id)
        VALUES ($1)
      `, [creatorId]);

      usage = {
        donations_this_month: 0,
        emails_sent_this_month: 0,
        webhooks_created: 0,
        newsletter_subscribers: 0
      };
    }

    // Check if we need to reset monthly counters
    const lastReset = usage.last_monthly_reset ? new Date(usage.last_monthly_reset) : new Date();
    const now = new Date();

    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      // Reset monthly counters
      await client.query(`
        UPDATE subscription_usage
        SET donations_this_month = 0,
            emails_sent_this_month = 0,
            last_monthly_reset = NOW()
        WHERE creator_id = $1
      `, [creatorId]);

      usage.donations_this_month = 0;
      usage.emails_sent_this_month = 0;
    }

    // Map actions to usage fields
    const usageMap = {
      maxMonthlyDonations: 'donations_this_month',
      maxEmailsPerMonth: 'emails_sent_this_month',
      maxWebhooks: 'webhooks_created',
      maxNewsletterSubscribers: 'newsletter_subscribers'
    };

    const usageField = usageMap[action];
    const currentUsage = usage[usageField] || 0;

    // Check if can perform action
    const canDo = canPerformAction(tier, action, currentUsage);

    // Increment usage if requested and allowed
    if (incrementUsage && canDo && usageField) {
      await client.query(`
        UPDATE subscription_usage
        SET ${usageField} = ${usageField} + 1,
            updated_at = NOW()
        WHERE creator_id = $1
      `, [creatorId]);
    }

    return {
      allowed: canDo,
      currentUsage,
      limit: getFeatureLimit(tier, action),
      tier
    };
  } finally {
    client.release();
  }
}

/**
 * Get subscription statistics
 */
async function getSubscriptionStats() {
  const result = await pool.query(`
    SELECT
      tier,
      COUNT(*) as count,
      SUM(amount) as total_revenue
    FROM subscriptions
    WHERE status = 'active'
    GROUP BY tier
  `);

  return result.rows;
}

module.exports = {
  createSubscription,
  getCreatorSubscription,
  updateSubscriptionStatus,
  cancelSubscription,
  changeSubscriptionTier,
  renewSubscription,
  checkFeatureAccess,
  checkActionLimit,
  getSubscriptionStats
};
