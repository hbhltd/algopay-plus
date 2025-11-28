/**
 * Subscription Renewal System
 * Handles automatic renewals, expiration checking, and renewal reminders
 */

const { Pool } = require('pg');
const Stripe = require('stripe');
const cron = require('node-cron');
const subscriptionService = require('./subscription-service');
const { getTierConfig } = require('./subscription-tiers');
const { sendEmail } = require('./email-notifications');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

/**
 * Send renewal reminder email
 */
async function sendRenewalReminder(creator, subscription, daysUntilExpiry) {
  const tierConfig = getTierConfig(subscription.tier);

  const subject = `Your Supportly ${tierConfig.name} subscription ${
    daysUntilExpiry > 0 ? `expires in ${daysUntilExpiry} days` : 'has expired'
  }`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .tier-badge { display: inline-block; background: #667eea; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .features ul { margin: 10px 0; padding-left: 20px; }
    .footer { text-align: center; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Subscription ${daysUntilExpiry > 0 ? 'Renewal Reminder' : 'Expired'}</h1>
    </div>
    <div class="content">
      <p>Hi ${creator.display_name},</p>

      ${daysUntilExpiry > 0 ? `
        <div class="warning">
          <strong>⏰ Your subscription expires in ${daysUntilExpiry} day${daysUntilExpiry > 1 ? 's' : ''}!</strong>
        </div>

        <p>Your <span class="tier-badge">${tierConfig.name}</span> subscription will expire on <strong>${new Date(subscription.expires_at).toLocaleDateString()}</strong>.</p>

        ${subscription.auto_renew ? `
          <p>✅ <strong>Auto-renewal is enabled</strong> - Your subscription will automatically renew on the expiration date. No action needed!</p>
        ` : `
          <p>⚠️ <strong>Auto-renewal is disabled</strong> - You'll need to manually renew to continue using premium features.</p>
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard/subscription" class="button">Renew Now - $${tierConfig.price}/year</a>
          </div>
        `}
      ` : `
        <div class="warning">
          <strong>⚠️ Your subscription has expired!</strong>
        </div>

        <p>Your <span class="tier-badge">${tierConfig.name}</span> subscription expired on ${new Date(subscription.expires_at).toLocaleDateString()}.</p>

        ${subscription.grace_period_ends_at ? `
          <p>You're currently in a <strong>7-day grace period</strong> ending on ${new Date(subscription.grace_period_ends_at).toLocaleDateString()}. During this time, you still have access to your premium features.</p>
        ` : ''}

        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/dashboard/subscription" class="button">Renew Now - $${tierConfig.price}/year</a>
        </div>
      `}

      <div class="features">
        <h3>Your ${tierConfig.name} Plan Includes:</h3>
        <ul>
          ${tierConfig.highlights.map(h => `<li>${h}</li>`).join('')}
        </ul>
      </div>

      <p>If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>

      <p>Best regards,<br>The Supportly Team</p>
    </div>
    <div class="footer">
      <p>Supportly - The creator donation platform with zero fees</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard/subscription">Manage Subscription</a> | <a href="${process.env.FRONTEND_URL}/help">Get Help</a></p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail(creator.email, subject, html);
}

/**
 * Process automatic renewals for subscriptions expiring today
 */
async function processAutoRenewals() {
  console.log('🔄 Processing automatic renewals...');

  try {
    // Get subscriptions expiring today with auto_renew enabled
    const result = await pool.query(`
      SELECT s.*, c.email, c.display_name, c.username
      FROM subscriptions s
      JOIN creators c ON s.creator_id = c.id
      WHERE s.status = 'active'
        AND s.auto_renew = true
        AND s.stripe_subscription_id IS NOT NULL
        AND DATE(s.expires_at) = CURRENT_DATE
    `);

    console.log(`Found ${result.rows.length} subscriptions to renew`);

    for (const subscription of result.rows) {
      try {
        console.log(`Renewing subscription for ${subscription.username}...`);

        // Stripe should handle this automatically via webhooks
        // But we can check the status
        const stripeSubscription = await stripe.subscriptions.retrieve(
          subscription.stripe_subscription_id
        );

        if (stripeSubscription.status === 'active') {
          // Stripe has successfully renewed, update our database
          await subscriptionService.renewSubscription(subscription.id, {
            paymentMethod: 'stripe',
            stripeSubscriptionId: stripeSubscription.id,
            stripeEventId: 'auto_renewal'
          });

          console.log(`✅ Renewed subscription for ${subscription.username}`);

          // Send confirmation email
          await sendRenewalConfirmation(subscription, stripeSubscription);
        }
      } catch (error) {
        console.error(`❌ Failed to renew subscription for ${subscription.username}:`, error);

        // Send failure notification
        await sendRenewalFailureNotification(subscription, error.message);
      }
    }
  } catch (error) {
    console.error('Error processing auto renewals:', error);
  }
}

/**
 * Send renewal confirmation email
 */
async function sendRenewalConfirmation(subscription, stripeSubscription) {
  const tierConfig = getTierConfig(subscription.tier);

  const subject = `Your Supportly ${tierConfig.name} subscription has been renewed`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .invoice { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .invoice-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
    .total { font-size: 1.2em; font-weight: bold; margin-top: 10px; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Subscription Renewed!</h1>
    </div>
    <div class="content">
      <p>Hi ${subscription.display_name},</p>

      <div class="success">
        <strong>Your subscription has been successfully renewed!</strong>
      </div>

      <p>Thank you for continuing with Supportly ${tierConfig.name}. Your subscription has been extended for another year.</p>

      <div class="invoice">
        <h3>Invoice Details</h3>
        <div class="invoice-row">
          <span>Plan:</span>
          <span>${tierConfig.name}</span>
        </div>
        <div class="invoice-row">
          <span>Billing Period:</span>
          <span>1 Year</span>
        </div>
        <div class="invoice-row">
          <span>Next Renewal:</span>
          <span>${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
        </div>
        <div class="invoice-row total">
          <span>Amount Paid:</span>
          <span>$${tierConfig.price}</span>
        </div>
      </div>

      <p>Your premium features will continue uninterrupted. Thank you for being a valued member!</p>

      <p>Best regards,<br>The Supportly Team</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail(subscription.email, subject, html);
}

/**
 * Send renewal failure notification
 */
async function sendRenewalFailureNotification(subscription, errorMessage) {
  const tierConfig = getTierConfig(subscription.tier);

  const subject = `Action Required: Subscription Renewal Failed`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .error { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #ef4444; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Renewal Failed</h1>
    </div>
    <div class="content">
      <p>Hi ${subscription.display_name},</p>

      <div class="error">
        <strong>We were unable to renew your ${tierConfig.name} subscription.</strong>
      </div>

      <p>The automatic renewal for your subscription failed. This could be due to:</p>
      <ul>
        <li>Insufficient funds</li>
        <li>Expired payment method</li>
        <li>Card declined</li>
      </ul>

      <p>Your subscription is now in a <strong>7-day grace period</strong>. During this time, you can still access your premium features while you update your payment method.</p>

      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/dashboard/subscription" class="button">Update Payment Method</a>
      </div>

      <p>If you don't renew within the grace period, your account will be downgraded to the free tier.</p>

      <p>Need help? Contact our support team at support@supportly.com</p>

      <p>Best regards,<br>The Supportly Team</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail(subscription.email, subject, html);
}

/**
 * Check for expiring subscriptions and send reminders
 */
async function checkExpiringSubscriptions() {
  console.log('📅 Checking for expiring subscriptions...');

  try {
    // Check for subscriptions expiring in 30 days, 7 days, and 1 day
    const reminderDays = [30, 7, 1];

    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);

      const result = await pool.query(`
        SELECT s.*, c.email, c.display_name, c.username
        FROM subscriptions s
        JOIN creators c ON s.creator_id = c.id
        WHERE s.status = 'active'
          AND DATE(s.expires_at) = DATE($1)
          AND s.auto_renew = false
      `, [targetDate]);

      console.log(`Found ${result.rows.length} subscriptions expiring in ${days} days`);

      for (const subscription of result.rows) {
        try {
          await sendRenewalReminder({
            email: subscription.email,
            display_name: subscription.display_name
          }, subscription, days);

          console.log(`✅ Sent ${days}-day reminder to ${subscription.username}`);
        } catch (error) {
          console.error(`❌ Failed to send reminder to ${subscription.username}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error checking expiring subscriptions:', error);
  }
}

/**
 * Handle expired subscriptions and grace periods
 */
async function handleExpiredSubscriptions() {
  console.log('⏰ Handling expired subscriptions...');

  try {
    // Get subscriptions that expired today
    const result = await pool.query(`
      SELECT s.*, c.email, c.display_name, c.username
      FROM subscriptions s
      JOIN creators c ON s.creator_id = c.id
      WHERE s.status = 'active'
        AND DATE(s.expires_at) = CURRENT_DATE
        AND s.auto_renew = false
    `);

    console.log(`Found ${result.rows.length} expired subscriptions`);

    for (const subscription of result.rows) {
      try {
        // Update to expired status and set grace period
        await subscriptionService.updateSubscriptionStatus(subscription.id, 'expired');

        // Send expiration notification
        await sendRenewalReminder({
          email: subscription.email,
          display_name: subscription.display_name
        }, subscription, 0);

        console.log(`✅ Marked subscription as expired for ${subscription.username}`);
      } catch (error) {
        console.error(`❌ Failed to handle expired subscription for ${subscription.username}:`, error);
      }
    }

    // Get subscriptions where grace period has ended
    const gracePeriodResult = await pool.query(`
      SELECT s.*, c.email, c.display_name, c.username
      FROM subscriptions s
      JOIN creators c ON s.creator_id = c.id
      WHERE s.status = 'expired'
        AND s.grace_period_ends_at IS NOT NULL
        AND DATE(s.grace_period_ends_at) = CURRENT_DATE
    `);

    console.log(`Found ${gracePeriodResult.rows.length} grace periods ending today`);

    for (const subscription of gracePeriodResult.rows) {
      try {
        // Downgrade to free tier
        await pool.query(`
          UPDATE creators
          SET subscription_tier = 'free',
              subscription_expires_at = NULL
          WHERE id = $1
        `, [subscription.creator_id]);

        // Send downgrade notification
        await sendDowngradeNotification(subscription);

        console.log(`✅ Downgraded ${subscription.username} to free tier`);
      } catch (error) {
        console.error(`❌ Failed to downgrade ${subscription.username}:`, error);
      }
    }
  } catch (error) {
    console.error('Error handling expired subscriptions:', error);
  }
}

/**
 * Send downgrade notification
 */
async function sendDowngradeNotification(subscription) {
  const subject = `Your Supportly account has been downgraded`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
    .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Downgraded</h1>
    </div>
    <div class="content">
      <p>Hi ${subscription.display_name},</p>

      <p>Your subscription grace period has ended, and your account has been downgraded to the <strong>Free tier</strong>.</p>

      <p>You can still accept crypto donations, but premium features are no longer available.</p>

      <p>Want to restore your premium features? You can resubscribe anytime!</p>

      <div style="text-align: center;">
        <a href="${process.env.FRONTEND_URL}/pricing" class="button">View Plans & Pricing</a>
      </div>

      <p>Thank you for being part of the Supportly community!</p>

      <p>Best regards,<br>The Supportly Team</p>
    </div>
  </div>
</body>
</html>
  `;

  await sendEmail(subscription.email, subject, html);
}

/**
 * Initialize cron jobs for subscription management
 */
function initializeRenewalCronJobs() {
  // Run at 9 AM every day - Check for expiring subscriptions and send reminders
  cron.schedule('0 9 * * *', async () => {
    console.log('📧 Running expiration reminder job...');
    await checkExpiringSubscriptions();
  });

  // Run at 10 AM every day - Process auto-renewals
  cron.schedule('0 10 * * *', async () => {
    console.log('💳 Running auto-renewal job...');
    await processAutoRenewals();
  });

  // Run at 11 AM every day - Handle expired subscriptions and grace periods
  cron.schedule('0 11 * * *', async () => {
    console.log('⏰ Running expiration handling job...');
    await handleExpiredSubscriptions();
  });

  console.log('✅ Subscription renewal cron jobs initialized');
}

module.exports = {
  initializeRenewalCronJobs,
  sendRenewalReminder,
  processAutoRenewals,
  checkExpiringSubscriptions,
  handleExpiredSubscriptions,
  sendRenewalConfirmation,
  sendRenewalFailureNotification,
  sendDowngradeNotification
};
