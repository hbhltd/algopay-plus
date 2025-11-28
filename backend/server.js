require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const algosdk = require('algosdk');
const cron = require('node-cron');

// Import email and analytics modules
const { sendEmail, sendWelcomeEmail, sendDonationNotification, sendDonationReceipt, sendWeeklyReport, testEmail } = require('./email-notifications');
const {
  getDashboardAnalytics,
  getRevenueAnalytics,
  getSupporterAnalytics,
  getPaymentBreakdown,
  exportAnalyticsCSV,
  exportAnalyticsJSON
} = require('./analytics');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Initialize services
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const algodClient = new algosdk.Algodv2(
  process.env.ALGORAND_ALGOD_TOKEN || '',
  process.env.ALGORAND_ALGOD_SERVER || 'https://testnet-api.algonode.cloud',
  ''
);

const USDC_ASSET_ID = parseInt(process.env.USDC_ASSET_ID) || 10458941;

// =====================================================
// HEALTH CHECK
// =====================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      stripe: !!process.env.STRIPE_SECRET_KEY,
      algorand: !!process.env.ALGORAND_ALGOD_SERVER,
      email: !!process.env.EMAIL_PROVIDER
    }
  });
});

// =====================================================
// CREATOR ENDPOINTS
// =====================================================

// Create new creator
app.post('/api/creators', async (req, res) => {
  try {
    const { username, displayName, bio, email, walletAddress, twitter, youtube, website, avatar, avatarUrl } = req.body;

    // Check if username exists
    const { data: existing } = await supabase
      .from('creators')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create creator
    const { data, error } = await supabase
      .from('creators')
      .insert([{
        username: username.toLowerCase(),
        display_name: displayName,
        bio,
        email,
        wallet_address: walletAddress,
        twitter_url: twitter,
        youtube_url: youtube,
        website_url: website,
        avatar_url: avatarUrl || avatar
      }])
      .select()
      .single();

    if (error) throw error;

    // Send welcome email
    if (email) {
      await sendWelcomeEmail(email, displayName, username);
    }

    res.json(data);
  } catch (error) {
    console.error('Create creator error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get creator by username
app.get('/api/creators/:username', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('username', req.params.username.toLowerCase())
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Creator not found' });

    res.json(data);
  } catch (error) {
    console.error('Get creator error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get creator by wallet
app.get('/api/creators/by-wallet/:address', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('creators')
      .select('*')
      .eq('wallet_address', req.params.address)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(404).json({ error: 'Creator not found' });
  }
});

// Get creator stats
app.get('/api/creators/:id/stats', async (req, res) => {
  try {
    const creatorId = req.params.id;

    // Get total received and donation count
    const { data: donations } = await supabase
      .from('donations')
      .select('amount, donor_wallet')
      .eq('creator_id', creatorId)
      .eq('status', 'completed');

    const totalReceived = donations?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
    const donationCount = donations?.length || 0;
    const supporterCount = new Set(donations?.map(d => d.donor_wallet)).size;

    res.json({
      totalReceived: totalReceived.toFixed(2),
      donationCount,
      supporterCount
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// PAYMENT SETTINGS ENDPOINTS
// =====================================================

// Get payment settings for a creator
app.get('/api/payment-settings/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    let { data: settings } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    // Create default settings if none exist
    if (!settings) {
      const { data: newSettings } = await supabase
        .from('payment_settings')
        .insert({ creator_id: creatorId, crypto_enabled: true })
        .select()
        .single();
      settings = newSettings;
    }

    // Don't send secret keys to frontend
    const safeSettings = {
      ...settings,
      stripe_secret_key: settings.stripe_secret_key ? '***hidden***' : null,
      paypal_client_secret: settings.paypal_client_secret ? '***hidden***' : null
    };

    res.json(safeSettings);
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update payment settings
app.put('/api/payment-settings/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const {
      crypto_enabled,
      stripe_enabled,
      stripe_publishable_key,
      stripe_secret_key,
      paypal_enabled,
      paypal_client_id,
      paypal_client_secret,
      cashapp_enabled,
      cashapp_tag
    } = req.body;

    // Build update object
    const updates = {};
    if (crypto_enabled !== undefined) updates.crypto_enabled = crypto_enabled;
    if (stripe_enabled !== undefined) updates.stripe_enabled = stripe_enabled;
    if (stripe_publishable_key) updates.stripe_publishable_key = stripe_publishable_key;
    if (stripe_secret_key && stripe_secret_key !== '***hidden***') updates.stripe_secret_key = stripe_secret_key;
    if (paypal_enabled !== undefined) updates.paypal_enabled = paypal_enabled;
    if (paypal_client_id) updates.paypal_client_id = paypal_client_id;
    if (paypal_client_secret && paypal_client_secret !== '***hidden***') updates.paypal_client_secret = paypal_client_secret;
    if (cashapp_enabled !== undefined) updates.cashapp_enabled = cashapp_enabled;
    if (cashapp_tag) updates.cashapp_tag = cashapp_tag;

    const { data, error } = await supabase
      .from('payment_settings')
      .update(updates)
      .eq('creator_id', creatorId)
      .select()
      .single();

    if (error) throw error;

    // Don't send secrets back
    const safeData = {
      ...data,
      stripe_secret_key: data.stripe_secret_key ? '***hidden***' : null,
      paypal_client_secret: data.paypal_client_secret ? '***hidden***' : null
    };

    res.json(safeData);
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// PAYPAL PAYMENT ENDPOINTS
// =====================================================

const axios = require('axios');

// Get PayPal access token using creator's credentials
async function getPayPalAccessToken(clientId, clientSecret) {
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await axios.post(
      'https://api-m.sandbox.paypal.com/v1/oauth2/token', // Use sandbox for now
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('PayPal auth error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with PayPal');
  }
}

// Create PayPal order
app.post('/api/paypal/create-order', async (req, res) => {
  try {
    const { creatorId, amount } = req.body;

    // Get creator's PayPal credentials
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('paypal_client_id, paypal_client_secret')
      .eq('creator_id', creatorId)
      .single();

    if (!settings || !settings.paypal_client_id || !settings.paypal_client_secret) {
      return res.status(400).json({ error: 'PayPal not configured for this creator' });
    }

    // Get access token
    const accessToken = await getPayPalAccessToken(
      settings.paypal_client_id,
      settings.paypal_client_secret
    );

    // Create order
    const orderResponse = await axios.post(
      'https://api-m.sandbox.paypal.com/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: amount.toString()
          },
          description: 'Supportly Donation'
        }]
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ orderID: orderResponse.data.id });
  } catch (error) {
    console.error('PayPal create order error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Capture PayPal payment
app.post('/api/paypal/capture-order', async (req, res) => {
  try {
    const { creatorId, orderID } = req.body;

    // Get creator's PayPal credentials
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('paypal_client_id, paypal_client_secret')
      .eq('creator_id', creatorId)
      .single();

    if (!settings || !settings.paypal_client_id || !settings.paypal_client_secret) {
      return res.status(400).json({ error: 'PayPal not configured for this creator' });
    }

    // Get access token
    const accessToken = await getPayPalAccessToken(
      settings.paypal_client_id,
      settings.paypal_client_secret
    );

    // Capture payment
    const captureResponse = await axios.post(
      `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(captureResponse.data);
  } catch (error) {
    console.error('PayPal capture error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// WEBHOOK SETTINGS ENDPOINTS
// =====================================================

// Get webhook settings for a creator
app.get('/api/webhook-settings/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    let { data: settings } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    // Create default settings if none exist
    if (!settings) {
      const { data: newSettings } = await supabase
        .from('webhook_settings')
        .insert({ creator_id: creatorId, webhook_enabled: false })
        .select()
        .single();
      settings = newSettings;
    }

    // Don't send secret to frontend
    const safeSettings = {
      ...settings,
      webhook_secret: settings.webhook_secret ? '***hidden***' : null
    };

    res.json(safeSettings);
  } catch (error) {
    console.error('Get webhook settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update webhook settings
app.put('/api/webhook-settings/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const {
      webhook_enabled,
      webhook_url,
      webhook_secret,
      on_new_donation,
      on_monthly_total
    } = req.body;

    // Build update object
    const updates = {};
    if (webhook_enabled !== undefined) updates.webhook_enabled = webhook_enabled;
    if (webhook_url) updates.webhook_url = webhook_url;
    if (webhook_secret && webhook_secret !== '***hidden***') updates.webhook_secret = webhook_secret;
    if (on_new_donation !== undefined) updates.on_new_donation = on_new_donation;
    if (on_monthly_total !== undefined) updates.on_monthly_total = on_monthly_total;

    const { data, error } = await supabase
      .from('webhook_settings')
      .update(updates)
      .eq('creator_id', creatorId)
      .select()
      .single();

    if (error) throw error;

    // Don't send secret back
    const safeData = {
      ...data,
      webhook_secret: data.webhook_secret ? '***hidden***' : null
    };

    res.json(safeData);
  } catch (error) {
    console.error('Update webhook settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test webhook
app.post('/api/webhook-settings/:creatorId/test', async (req, res) => {
  try {
    const { creatorId } = req.params;

    // Get webhook settings
    const { data: settings } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    if (!settings || !settings.webhook_url) {
      return res.status(400).json({ error: 'Webhook URL not configured' });
    }

    // Send test webhook
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Supportly'
      }
    };

    const webhookResponse = await triggerWebhook(
      settings.webhook_url,
      settings.webhook_secret,
      testPayload,
      creatorId
    );

    res.json({
      success: webhookResponse.success,
      status: webhookResponse.status,
      message: webhookResponse.success ? 'Test webhook sent successfully!' : 'Test webhook failed'
    });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get webhook logs
app.get('/api/webhook-logs/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const { data: logs, error } = await supabase
      .from('webhook_logs')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json(logs || []);
  } catch (error) {
    console.error('Get webhook logs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Webhook trigger function
async function triggerWebhook(webhookUrl, secret, payload, creatorId, donationId = null) {
  try {
    // Add signature header if secret is provided
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Supportly-Webhook/1.0'
    };

    if (secret) {
      // Create HMAC signature
      const crypto = require('crypto');
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Supportly-Signature'] = signature;
    }

    // Send webhook
    const response = await axios.post(webhookUrl, payload, {
      headers,
      timeout: 10000 // 10 second timeout
    });

    // Log successful webhook
    await supabase.from('webhook_logs').insert({
      creator_id: creatorId,
      donation_id: donationId,
      webhook_url: webhookUrl,
      payload,
      response_status: response.status,
      response_body: JSON.stringify(response.data).slice(0, 1000),
      success: true
    });

    return { success: true, status: response.status };
  } catch (error) {
    // Log failed webhook
    await supabase.from('webhook_logs').insert({
      creator_id: creatorId,
      donation_id: donationId,
      webhook_url: webhookUrl,
      payload,
      response_status: error.response?.status || 0,
      response_body: error.response?.data ? JSON.stringify(error.response.data).slice(0, 1000) : null,
      success: false,
      error_message: error.message
    });

    return { success: false, status: error.response?.status || 0, error: error.message };
  }
}

// =====================================================
// EMAIL SETTINGS ENDPOINTS
// =====================================================

// Get email settings for a creator
app.get('/api/email-settings/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;

    let { data: settings } = await supabase
      .from('email_settings')
      .select('*')
      .eq('creator_id', creatorId)
      .single();

    // Create default settings if none exist
    if (!settings) {
      const { data: newSettings } = await supabase
        .from('email_settings')
        .insert({ creator_id: creatorId, email_provider: 'supportly' })
        .select()
        .single();
      settings = newSettings;
    }

    // Don't send secret keys to frontend
    const safeSettings = {
      ...settings,
      smtp_password: settings.smtp_password ? '***hidden***' : null,
      sendgrid_api_key: settings.sendgrid_api_key ? '***hidden***' : null,
      resend_api_key: settings.resend_api_key ? '***hidden***' : null
    };

    res.json(safeSettings);
  } catch (error) {
    console.error('Get email settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update email settings
app.put('/api/email-settings/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const {
      email_provider,
      smtp_host,
      smtp_port,
      smtp_username,
      smtp_password,
      smtp_secure,
      sendgrid_api_key,
      resend_api_key,
      from_email,
      from_name
    } = req.body;

    // Build update object
    const updates = {};
    if (email_provider) updates.email_provider = email_provider;
    if (smtp_host) updates.smtp_host = smtp_host;
    if (smtp_port) updates.smtp_port = smtp_port;
    if (smtp_username) updates.smtp_username = smtp_username;
    if (smtp_password && smtp_password !== '***hidden***') updates.smtp_password = smtp_password;
    if (smtp_secure !== undefined) updates.smtp_secure = smtp_secure;
    if (sendgrid_api_key && sendgrid_api_key !== '***hidden***') updates.sendgrid_api_key = sendgrid_api_key;
    if (resend_api_key && resend_api_key !== '***hidden***') updates.resend_api_key = resend_api_key;
    if (from_email) updates.from_email = from_email;
    if (from_name) updates.from_name = from_name;

    const { data, error } = await supabase
      .from('email_settings')
      .update(updates)
      .eq('creator_id', creatorId)
      .select()
      .single();

    if (error) throw error;

    // Don't send secrets back
    const safeData = {
      ...data,
      smtp_password: data.smtp_password ? '***hidden***' : null,
      sendgrid_api_key: data.sendgrid_api_key ? '***hidden***' : null,
      resend_api_key: data.resend_api_key ? '***hidden***' : null
    };

    res.json(safeData);
  } catch (error) {
    console.error('Update email settings error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// NEWSLETTER ENDPOINTS
// =====================================================

// Send newsletter to donors
app.post('/api/newsletter/send', async (req, res) => {
  try {
    const { creatorId, subject, message, recipients } = req.body;

    if (!recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients specified' });
    }

    // Get creator info
    const { data: creator } = await supabase
      .from('creators')
      .select('display_name, email')
      .eq('id', creatorId)
      .single();

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    // Send email to each recipient
    const fromEmail = creator.email || process.env.FROM_EMAIL || 'noreply@supportly.com';
    const fromName = creator.display_name || 'Supportly Creator';

    // For now, we'll use Supportly's email service
    // Later this will use the creator's configured email service
    for (const recipientEmail of recipients) {
      await sendEmail({
        to: recipientEmail,
        from: fromEmail,
        fromName: fromName,
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Message from ${creator.display_name}</h2>
            <div style="white-space: pre-wrap; line-height: 1.6;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="color: #999; font-size: 12px;">
              You received this email because you are a supporter of ${creator.display_name} on Supportly.
            </p>
          </div>
        `,
        text: message
      });
    }

    res.json({ success: true, sent: recipients.length });
  } catch (error) {
    console.error('Newsletter send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// DONATION ENDPOINTS
// =====================================================

// Create donation
app.post('/api/donations', async (req, res) => {
  try {
    const { creatorId, amount, donorWallet, donorName, donorEmail, message, txHash, paymentMethod } = req.body;

    const { data, error } = await supabase
      .from('donations')
      .insert([{
        creator_id: creatorId,
        amount: parseFloat(amount),
        donor_wallet: donorWallet,
        donor_name: donorName,
        donor_email: donorEmail,
        message,
        tx_hash: txHash,
        payment_method: paymentMethod,
        status: 'completed'
      }])
      .select()
      .single();

    if (error) throw error;

    // Get creator info for emails
    const { data: creator } = await supabase
      .from('creators')
      .select('email, display_name, username')
      .eq('id', creatorId)
      .single();

    // Send email notifications
    if (creator?.email) {
      await sendDonationNotification(
        creator.email,
        creator.display_name,
        amount,
        donorName || 'Anonymous',
        message
      );
    }

    if (donorEmail) {
      await sendDonationReceipt(
        donorEmail,
        donorName || 'Supporter',
        creator.display_name,
        amount,
        txHash
      );
    }

    // Check if eligible for NFT
    await checkAndMintNFT(creatorId, donorWallet, amount);

    // Trigger webhook if enabled
    try {
      const { data: webhookSettings } = await supabase
        .from('webhook_settings')
        .select('*')
        .eq('creator_id', creatorId)
        .single();

      if (webhookSettings?.webhook_enabled && webhookSettings?.on_new_donation && webhookSettings?.webhook_url) {
        // Don't wait for webhook to complete
        setImmediate(async () => {
          await triggerWebhook(
            webhookSettings.webhook_url,
            webhookSettings.webhook_secret,
            {
              event: 'donation.created',
              timestamp: new Date().toISOString(),
              data: {
                donation_id: data.id,
                amount: parseFloat(amount),
                donor_name: donorName || 'Anonymous',
                donor_email: donorEmail || null,
                message: message || null,
                payment_method: paymentMethod,
                creator: {
                  id: creatorId,
                  username: creator.username,
                  display_name: creator.display_name
                }
              }
            },
            creatorId,
            data.id
          );
        });
      }
    } catch (webhookError) {
      // Don't fail the donation if webhook fails
      console.error('Webhook trigger error:', webhookError);
    }

    res.json(data);
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get donations for creator
app.get('/api/donations/:creatorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('creator_id', req.params.creatorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// STRIPE PAYMENT ENDPOINTS
// =====================================================

// Create payment intent
app.post('/api/payments/create', async (req, res) => {
  try {
    const { amount, creatorId, donorEmail, donorName, message } = req.body;

    // Create donation record
    const { data: donation, error: donationError } = await supabase
      .from('donations')
      .insert([{
        creator_id: creatorId,
        amount: parseFloat(amount),
        donor_email: donorEmail,
        donor_name: donorName,
        message,
        payment_method: 'card',
        status: 'pending'
      }])
      .select()
      .single();

    if (donationError) throw donationError;

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        donationId: donation.id,
        creatorId,
        donorEmail,
        donorName
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      donationId: donation.id
    });
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { donationId } = paymentIntent.metadata;

      // Update donation status
      await supabase
        .from('donations')
        .update({
          status: 'completed',
          tx_hash: paymentIntent.id
        })
        .eq('id', donationId);

      // Send notifications
      const { data: donation } = await supabase
        .from('donations')
        .select('*, creators(email, display_name, username)')
        .eq('id', donationId)
        .single();

      if (donation) {
        if (donation.creators.email) {
          await sendDonationNotification(
            donation.creators.email,
            donation.creators.display_name,
            donation.amount,
            donation.donor_name || 'Anonymous',
            donation.message
          );
        }

        if (donation.donor_email) {
          await sendDonationReceipt(
            donation.donor_email,
            donation.donor_name || 'Supporter',
            donation.creators.display_name,
            donation.amount,
            paymentIntent.id
          );
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// =====================================================
// NFT ENDPOINTS
// =====================================================

// Create NFT tier configuration
app.post('/api/nft/config', async (req, res) => {
  try {
    const { creatorId, name, description, minDonationAmount, imageUrl, maxSupply } = req.body;

    const { data, error } = await supabase
      .from('nft_configs')
      .insert([{
        creator_id: creatorId,
        name,
        description,
        min_donation_amount: parseFloat(minDonationAmount),
        image_url: imageUrl,
        max_supply: maxSupply,
        current_supply: 0,
        active: true
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('NFT config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get NFT tiers for creator
app.get('/api/creators/:username/nfts', async (req, res) => {
  try {
    const { data: creator } = await supabase
      .from('creators')
      .select('id')
      .eq('username', req.params.username)
      .single();

    const { data, error } = await supabase
      .from('nft_configs')
      .select('*')
      .eq('creator_id', creator.id)
      .eq('active', true)
      .order('min_donation_amount', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check and mint NFT if eligible
async function checkAndMintNFT(creatorId, donorWallet, amount) {
  try {
    // Get eligible NFT tier
    const { data: tiers } = await supabase
      .from('nft_configs')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('active', true)
      .lte('min_donation_amount', amount)
      .order('min_donation_amount', { ascending: false })
      .limit(1);

    if (!tiers || tiers.length === 0) return;

    const tier = tiers[0];

    // Check if max supply reached
    if (tier.current_supply >= tier.max_supply) return;

    // Mint NFT (simplified - in production, use Algorand NFT creation)
    const { data: nft, error } = await supabase
      .from('nfts')
      .insert([{
        config_id: tier.id,
        creator_id: creatorId,
        owner_wallet: donorWallet,
        token_id: `${tier.id}-${tier.current_supply + 1}`,
        minted_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (!error) {
      // Update supply count
      await supabase
        .from('nft_configs')
        .update({ current_supply: tier.current_supply + 1 })
        .eq('id', tier.id);
    }
  } catch (error) {
    console.error('NFT minting error:', error);
  }
}

// =====================================================
// ANALYTICS ENDPOINTS
// =====================================================

// Dashboard analytics
app.get('/api/analytics/dashboard/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { period = 30 } = req.query; // days

    const analytics = await getDashboardAnalytics(supabase, creatorId, parseInt(period));
    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Revenue analytics
app.get('/api/analytics/revenue/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { period = 30 } = req.query;

    const analytics = await getRevenueAnalytics(supabase, creatorId, parseInt(period));
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supporter analytics
app.get('/api/analytics/supporters/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const analytics = await getSupporterAnalytics(supabase, creatorId);
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment breakdown
app.get('/api/analytics/breakdown/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const breakdown = await getPaymentBreakdown(supabase, creatorId);
    res.json(breakdown);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export CSV
app.get('/api/analytics/export/csv/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const csv = await exportAnalyticsCSV(supabase, creatorId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${creatorId}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export JSON
app.get('/api/analytics/export/json/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const data = await exportAnalyticsJSON(supabase, creatorId);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=analytics-${creatorId}.json`);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// EMAIL NOTIFICATION ENDPOINTS
// =====================================================

// Send test email
app.post('/api/notifications/test', async (req, res) => {
  try {
    const { email } = req.body;
    await testEmail(email);
    res.json({ success: true, message: 'Test email sent!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// SCHEDULED JOBS
// =====================================================

// Weekly summary emails (runs every Monday at 9 AM)
cron.schedule('0 9 * * 1', async () => {
  console.log('Running weekly summary job...');

  try {
    const { data: creators } = await supabase
      .from('creators')
      .select('id, email, display_name')
      .not('email', 'is', null);

    for (const creator of creators) {
      // Get week's stats
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: donations } = await supabase
        .from('donations')
        .select('amount, donor_name')
        .eq('creator_id', creator.id)
        .eq('status', 'completed')
        .gte('created_at', weekAgo.toISOString());

      if (donations && donations.length > 0) {
        const totalRevenue = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
        const donationCount = donations.length;
        const supporters = new Set(donations.map(d => d.donor_name).filter(Boolean)).size;

        await sendWeeklyReport(
          creator.email,
          creator.display_name,
          totalRevenue,
          donationCount,
          supporters
        );
      }
    }
  } catch (error) {
    console.error('Weekly summary job error:', error);
  }
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║     🚀 Supportly API Server           ║
  ║                                        ║
  ║  Server running on port ${PORT}         ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║                                        ║
  ║  Health: http://localhost:${PORT}/health  ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;
