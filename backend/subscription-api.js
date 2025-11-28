/**
 * Subscription API Routes
 * RESTful API endpoints for subscription management
 */

const express = require('express');
const router = express.Router();
const Stripe = require('stripe');

const subscriptionService = require('./subscription-service');
const { SUBSCRIPTION_TIERS, getTierConfig } = require('./subscription-tiers');

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

/**
 * GET /api/subscriptions/tiers
 * Get all available subscription tiers
 */
router.get('/tiers', (req, res) => {
  try {
    res.json({
      success: true,
      tiers: SUBSCRIPTION_TIERS
    });
  } catch (error) {
    console.error('Error fetching tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription tiers'
    });
  }
});

/**
 * GET /api/subscriptions/tier/:tierName
 * Get specific tier configuration
 */
router.get('/tier/:tierName', (req, res) => {
  try {
    const { tierName } = req.params;
    const tierConfig = getTierConfig(tierName);

    res.json({
      success: true,
      tier: tierConfig
    });
  } catch (error) {
    console.error('Error fetching tier:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/subscriptions/creator/:creatorId
 * Get creator's current subscription
 */
router.get('/creator/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    const subscription = await subscriptionService.getCreatorSubscription(creatorId);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: null,
        message: 'No active subscription found. Using free tier.'
      });
    }

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    console.error('Error fetching creator subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription'
    });
  }
});

/**
 * POST /api/subscriptions/create
 * Create a new subscription
 * Body: { creatorId, tier, paymentMethodId }
 */
router.post('/create', async (req, res) => {
  try {
    const { creatorId, tier, paymentMethodId, email } = req.body;

    if (!creatorId || !tier) {
      return res.status(400).json({
        success: false,
        error: 'creatorId and tier are required'
      });
    }

    const tierConfig = getTierConfig(tier);

    // If free tier, just create subscription
    if (tierConfig.price === 0) {
      const result = await subscriptionService.createSubscription(creatorId, tier, {
        paymentMethod: 'none'
      });

      return res.json({
        success: true,
        subscription: result.subscription,
        tier: result.tier
      });
    }

    // For paid tiers, process payment with Stripe
    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: 'paymentMethodId is required for paid subscriptions'
      });
    }

    // Create or get Stripe customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        payment_method: paymentMethodId,
        invoice_settings: {
          default_payment_method: paymentMethodId
        },
        metadata: {
          creatorId: creatorId
        }
      });
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Supportly ${tierConfig.name} Plan`,
            description: tierConfig.description
          },
          unit_amount: tierConfig.price * 100, // Convert to cents
          recurring: {
            interval: 'year',
            interval_count: 1
          }
        }
      }],
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription'
      },
      metadata: {
        creatorId: creatorId,
        tier: tier
      }
    });

    // Get the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(
      stripeSubscription.latest_invoice ?
        (await stripe.invoices.retrieve(stripeSubscription.latest_invoice)).payment_intent :
        null
    );

    // Create subscription in our database
    const result = await subscriptionService.createSubscription(creatorId, tier, {
      paymentMethod: 'stripe',
      stripeSubscriptionId: stripeSubscription.id,
      stripeCustomerId: customer.id,
      stripePaymentIntentId: paymentIntent?.id,
      stripeInvoiceId: stripeSubscription.latest_invoice
    });

    res.json({
      success: true,
      subscription: result.subscription,
      tier: result.tier,
      stripeSubscription: {
        id: stripeSubscription.id,
        status: stripeSubscription.status
      }
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create subscription'
    });
  }
});

/**
 * POST /api/subscriptions/cancel
 * Cancel a subscription
 * Body: { subscriptionId, reason }
 */
router.post('/cancel', async (req, res) => {
  try {
    const { subscriptionId, reason } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'subscriptionId is required'
      });
    }

    // Get subscription to find Stripe subscription ID
    const subscription = await subscriptionService.getCreatorSubscription(
      req.body.creatorId // You should pass creatorId in the request
    );

    // Cancel in Stripe if it exists
    if (subscription && subscription.stripe_subscription_id) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: true
      });
    }

    // Cancel in our database
    const result = await subscriptionService.cancelSubscription(subscriptionId, reason);

    res.json({
      success: true,
      message: 'Subscription canceled successfully. Access will continue until the end of the billing period.'
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription'
    });
  }
});

/**
 * POST /api/subscriptions/change-tier
 * Upgrade or downgrade subscription
 * Body: { subscriptionId, newTier, paymentMethodId }
 */
router.post('/change-tier', async (req, res) => {
  try {
    const { subscriptionId, creatorId, newTier, paymentMethodId } = req.body;

    if (!subscriptionId || !newTier) {
      return res.status(400).json({
        success: false,
        error: 'subscriptionId and newTier are required'
      });
    }

    const newTierConfig = getTierConfig(newTier);

    // Get current subscription
    const currentSubscription = await subscriptionService.getCreatorSubscription(creatorId);

    // If upgrading to paid tier and using Stripe
    let stripeDetails = {};

    if (newTierConfig.price > 0 && currentSubscription.stripe_subscription_id) {
      // Update Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(
        currentSubscription.stripe_subscription_id
      );

      const updatedSubscription = await stripe.subscriptions.update(
        currentSubscription.stripe_subscription_id,
        {
          items: [{
            id: stripeSubscription.items.data[0].id,
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Supportly ${newTierConfig.name} Plan`,
                description: newTierConfig.description
              },
              unit_amount: newTierConfig.price * 100,
              recurring: {
                interval: 'year',
                interval_count: 1
              }
            }
          }],
          proration_behavior: 'create_prorations'
        }
      );

      stripeDetails = {
        stripeSubscriptionId: updatedSubscription.id,
        stripeCustomerId: updatedSubscription.customer
      };
    }

    // Update in our database
    const result = await subscriptionService.changeSubscriptionTier(
      subscriptionId,
      newTier,
      stripeDetails
    );

    res.json({
      success: true,
      message: `Successfully ${result.proration.isUpgrade ? 'upgraded' : 'downgraded'} to ${newTierConfig.name}`,
      oldTier: result.oldTier,
      newTier: result.newTier,
      proration: result.proration
    });
  } catch (error) {
    console.error('Error changing subscription tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change subscription tier'
    });
  }
});

/**
 * POST /api/subscriptions/renew
 * Manually renew a subscription (usually handled automatically)
 * Body: { subscriptionId }
 */
router.post('/renew', async (req, res) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'subscriptionId is required'
      });
    }

    const result = await subscriptionService.renewSubscription(subscriptionId);

    res.json({
      success: true,
      message: 'Subscription renewed successfully',
      newExpiry: result.newExpiry
    });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to renew subscription'
    });
  }
});

/**
 * POST /api/subscriptions/check-feature
 * Check if creator has access to a feature
 * Body: { creatorId, feature }
 */
router.post('/check-feature', async (req, res) => {
  try {
    const { creatorId, feature } = req.body;

    if (!creatorId || !feature) {
      return res.status(400).json({
        success: false,
        error: 'creatorId and feature are required'
      });
    }

    const hasAccess = await subscriptionService.checkFeatureAccess(creatorId, feature);

    res.json({
      success: true,
      hasAccess,
      feature
    });
  } catch (error) {
    console.error('Error checking feature access:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check feature access'
    });
  }
});

/**
 * POST /api/subscriptions/check-limit
 * Check if creator can perform action within tier limits
 * Body: { creatorId, action, increment }
 */
router.post('/check-limit', async (req, res) => {
  try {
    const { creatorId, action, increment } = req.body;

    if (!creatorId || !action) {
      return res.status(400).json({
        success: false,
        error: 'creatorId and action are required'
      });
    }

    const result = await subscriptionService.checkActionLimit(
      creatorId,
      action,
      increment === true
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error checking action limit:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check action limit'
    });
  }
});

/**
 * GET /api/subscriptions/stats
 * Get subscription statistics (admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await subscriptionService.getSubscriptionStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription stats'
    });
  }
});

/**
 * Stripe webhook handler for subscription events
 * POST /api/subscriptions/webhook
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Handle subscription updated event from Stripe
 */
async function handleSubscriptionUpdated(stripeSubscription) {
  console.log('Subscription updated:', stripeSubscription.id);

  // Update subscription status in database
  const creatorId = stripeSubscription.metadata.creatorId;
  if (!creatorId) return;

  const subscription = await subscriptionService.getCreatorSubscription(creatorId);
  if (!subscription) return;

  // Update status based on Stripe status
  let newStatus = 'active';
  if (stripeSubscription.status === 'canceled') {
    newStatus = 'canceled';
  } else if (stripeSubscription.status === 'past_due') {
    newStatus = 'expired';
  }

  await subscriptionService.updateSubscriptionStatus(subscription.id, newStatus, {
    stripeStatus: stripeSubscription.status
  });
}

/**
 * Handle subscription deleted event from Stripe
 */
async function handleSubscriptionDeleted(stripeSubscription) {
  console.log('Subscription deleted:', stripeSubscription.id);

  const creatorId = stripeSubscription.metadata.creatorId;
  if (!creatorId) return;

  const subscription = await subscriptionService.getCreatorSubscription(creatorId);
  if (!subscription) return;

  await subscriptionService.cancelSubscription(subscription.id, 'Canceled via Stripe');
}

/**
 * Handle successful invoice payment from Stripe
 */
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);

  const stripeSubscriptionId = invoice.subscription;
  if (!stripeSubscriptionId) return;

  // This is a renewal payment
  // The subscription renewal logic should be handled automatically
  // We just log it here
  console.log(`Renewal payment successful for subscription ${stripeSubscriptionId}`);
}

/**
 * Handle failed invoice payment from Stripe
 */
async function handleInvoicePaymentFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id);

  const stripeSubscriptionId = invoice.subscription;
  if (!stripeSubscriptionId) return;

  // Handle failed payment
  // Could send email notification, update status, etc.
  console.log(`Payment failed for subscription ${stripeSubscriptionId}`);
}

module.exports = router;
