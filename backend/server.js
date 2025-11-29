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

// Import bcrypt and jwt for authentication
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
// AUTHENTICATION ENDPOINTS
// =====================================================

// Register with email/password
app.post('/api/auth/register', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      displayName,
      bio,
      walletAddress,
      twitter,
      youtube,
      instagram,
      tiktok,
      linkedin,
      facebook,
      website,
      avatar,
      avatarUrl,
      stripeAccountId,
      stripePublishableKey
    } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if username or email exists
    const { data: existing } = await supabase
      .from('creators')
      .select('id')
      .or(`username.eq.${username.toLowerCase()},email.eq.${email}`)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: 'Username or email already taken' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create creator
    const { data, error } = await supabase
      .from('creators')
      .insert([{
        username: username.toLowerCase(),
        email,
        password_hash: passwordHash,
        display_name: displayName || username,
        bio,
        wallet_address: walletAddress || null,
        twitter_url: twitter,
        youtube_url: youtube,
        instagram_url: instagram,
        tiktok_url: tiktok,
        linkedin_url: linkedin,
        facebook_url: facebook,
        website_url: website,
        avatar_url: avatarUrl || avatar,
        stripe_account_id: stripeAccountId || null,
        stripe_publishable_key: stripePublishableKey || null
      }])
      .select()
      .single();

    if (error) throw error;

    // Generate JWT token
    const token = jwt.sign(
      { id: data.id, username: data.username, email: data.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Send welcome email
    if (email) {
      await sendWelcomeEmail(email, displayName || username, username);
    }

    res.json({ creator: data, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Login with email/password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get creator by email
    const { data: creator, error } = await supabase
      .from('creators')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !creator) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, creator.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: creator.id, username: creator.username, email: creator.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Remove password hash from response
    delete creator.password_hash;

    res.json({ creator, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify token and get user
app.get('/api/auth/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const { data: creator, error } = await supabase
      .from('creators')
      .select('*')
      .eq('id', decoded.id)
      .single();

    if (error || !creator) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Remove password hash from response
    delete creator.password_hash;

    res.json(creator);
  } catch (error) {
    console.error('Auth verify error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// =====================================================
// CREATOR ENDPOINTS
// =====================================================

// Create new creator (legacy - supports wallet-only auth)
app.post('/api/creators', async (req, res) => {
  try {
    const {
      username,
      displayName,
      bio,
      email,
      walletAddress,
      twitter,
      youtube,
      instagram,
      tiktok,
      linkedin,
      facebook,
      website,
      avatar,
      avatarUrl,
      stripeAccountId,
      stripePublishableKey
    } = req.body;

    // Check if username exists
    const { data: existing } = await supabase
      .from('creators')
      .select('id')
      .eq('username', username)
      .maybeSingle();

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
        wallet_address: walletAddress || null,
        twitter_url: twitter,
        youtube_url: youtube,
        instagram_url: instagram,
        tiktok_url: tiktok,
        linkedin_url: linkedin,
        facebook_url: facebook,
        website_url: website,
        avatar_url: avatarUrl || avatar,
        stripe_account_id: stripeAccountId || null,
        stripe_publishable_key: stripePublishableKey || null
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
// SUBSCRIPTIONS ENDPOINTS
// =====================================================

// Create subscription
app.post('/api/subscriptions/create', async (req, res) => {
  try {
    const { creatorId, paymentMethod, paymentTxHash } = req.body;

    // Validate payment method
    const validPaymentMethods = ['stripe', 'usdc', 'pera', 'noah', 'paypal'];

    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method. Must be one of: stripe, usdc, pera, noah, paypal' });
    }

    // Flat annual subscription: $49.95/year
    const ANNUAL_PRICE = 49.95;
    const ANNUAL_DURATION_DAYS = 365;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ANNUAL_DURATION_DAYS);

    // Create subscription record
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert([{
        creator_id: creatorId,
        tier: 'annual',
        status: 'active',
        amount: ANNUAL_PRICE,
        payment_tx_hash: paymentTxHash,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: true
      }])
      .select()
      .single();

    if (subError) throw subError;

    // Update creator's subscription info and payment method preference
    await supabase
      .from('creators')
      .update({
        subscription_tier: 'annual',
        subscription_expires_at: expiresAt.toISOString(),
        subscription_payment_method: paymentMethod
      })
      .eq('id', creatorId);

    res.json(subscription);
  } catch (error) {
    console.error('Subscription creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get creator's subscription
app.get('/api/subscriptions/:creatorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('creator_id', req.params.creatorId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check subscription status
app.get('/api/subscriptions/check/:creatorId', async (req, res) => {
  try {
    const { data: creator } = await supabase
      .from('creators')
      .select('subscription_tier, subscription_expires_at')
      .eq('id', req.params.creatorId)
      .single();

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    const isActive = creator.subscription_expires_at &&
                     new Date(creator.subscription_expires_at) > new Date();

    res.json({
      tier: creator.subscription_tier || 'basic',
      expiresAt: creator.subscription_expires_at,
      isActive,
      status: isActive ? 'active' : 'expired'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
app.put('/api/subscriptions/:id/cancel', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        auto_renew: false
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Renew subscription
app.post('/api/subscriptions/:id/renew', async (req, res) => {
  try {
    const { paymentTxHash } = req.body;

    // Get existing subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*, creators(id)')
      .eq('id', req.params.id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Create new subscription period
    const tierConfig = {
      basic: { amount: 0, duration: 365 },
      pro: { amount: 9.99, duration: 30 },
      premium: { amount: 29.99, duration: 30 }
    }[existing.tier];

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + tierConfig.duration);

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([{
        creator_id: existing.creator_id,
        tier: existing.tier,
        status: 'active',
        amount: tierConfig.amount,
        payment_tx_hash: paymentTxHash,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        auto_renew: existing.auto_renew
      }])
      .select()
      .single();

    if (error) throw error;

    // Update creator
    await supabase
      .from('creators')
      .update({
        subscription_tier: existing.tier,
        subscription_expires_at: expiresAt.toISOString()
      })
      .eq('id', existing.creator_id);

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all subscriptions for a creator (history)
app.get('/api/subscriptions/history/:creatorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
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
// CONTENT GATING ENDPOINTS
// =====================================================

// Upload/create content
app.post('/api/content', async (req, res) => {
  try {
    const {
      creatorId,
      title,
      description,
      contentType,
      contentUrl,
      thumbnailUrl,
      isGated,
      requiredNftConfigId
    } = req.body;

    const { data, error } = await supabase
      .from('content')
      .insert([{
        creator_id: creatorId,
        title,
        description,
        content_type: contentType,
        content_url: contentUrl,
        thumbnail_url: thumbnailUrl,
        is_gated: isGated || false,
        required_nft_config_id: requiredNftConfigId
      }])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Content creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all content for a creator
app.get('/api/content/creator/:creatorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('content')
      .select(`
        *,
        nft_configs:required_nft_config_id(name, min_donation_amount)
      `)
      .eq('creator_id', req.params.creatorId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific content (with access check)
app.get('/api/content/:id', async (req, res) => {
  try {
    const { walletAddress } = req.query;

    // Get content
    const { data: content, error: contentError } = await supabase
      .from('content')
      .select(`
        *,
        nft_configs:required_nft_config_id(name, min_donation_amount)
      `)
      .eq('id', req.params.id)
      .single();

    if (contentError) throw contentError;

    // If not gated, return content
    if (!content.is_gated) {
      return res.json({ ...content, hasAccess: true });
    }

    // Check if user has required NFT
    let hasAccess = false;
    if (walletAddress && content.required_nft_config_id) {
      const { data: nfts } = await supabase
        .from('nfts')
        .select('id')
        .eq('config_id', content.required_nft_config_id)
        .eq('owner_wallet', walletAddress)
        .limit(1);

      hasAccess = nfts && nfts.length > 0;
    }

    // Return content info (but maybe not the URL if no access)
    const response = {
      ...content,
      hasAccess,
      content_url: hasAccess ? content.content_url : null
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check user access to content
app.get('/api/content/:id/access', async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.json({ hasAccess: false, reason: 'No wallet address provided' });
    }

    // Get content
    const { data: content } = await supabase
      .from('content')
      .select('is_gated, required_nft_config_id')
      .eq('id', req.params.id)
      .single();

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // If not gated, everyone has access
    if (!content.is_gated) {
      return res.json({ hasAccess: true, reason: 'Content is public' });
    }

    // Check NFT ownership
    const { data: nfts } = await supabase
      .from('nfts')
      .select('id, token_id')
      .eq('config_id', content.required_nft_config_id)
      .eq('owner_wallet', walletAddress);

    const hasAccess = nfts && nfts.length > 0;

    res.json({
      hasAccess,
      reason: hasAccess ? 'User owns required NFT' : 'User does not own required NFT',
      requiredNftConfigId: content.required_nft_config_id,
      ownedNfts: nfts || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Increment view count
app.post('/api/content/:id/view', async (req, res) => {
  try {
    // Get current views
    const { data: content } = await supabase
      .from('content')
      .select('views')
      .eq('id', req.params.id)
      .single();

    // Increment
    const { data, error } = await supabase
      .from('content')
      .update({ views: (content?.views || 0) + 1 })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ views: data.views });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update content
app.put('/api/content/:id', async (req, res) => {
  try {
    const {
      title,
      description,
      contentUrl,
      thumbnailUrl,
      isGated,
      requiredNftConfigId
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (contentUrl !== undefined) updates.content_url = contentUrl;
    if (thumbnailUrl !== undefined) updates.thumbnail_url = thumbnailUrl;
    if (isGated !== undefined) updates.is_gated = isGated;
    if (requiredNftConfigId !== undefined) updates.required_nft_config_id = requiredNftConfigId;

    const { data, error } = await supabase
      .from('content')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete content
app.delete('/api/content/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('content')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Content deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// EMAIL PREFERENCES ENDPOINTS
// =====================================================

// Get email preferences
app.get('/api/email-preferences/:creatorId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('creator_id', req.params.creatorId)
      .single();

    // If no preferences exist, return defaults
    if (error && error.code === 'PGRST116') {
      return res.json({
        creator_id: req.params.creatorId,
        welcome_email: true,
        donation_notifications: true,
        weekly_reports: true,
        marketing_emails: false
      });
    }

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update email preferences
app.put('/api/email-preferences/:creatorId', async (req, res) => {
  try {
    const {
      welcomeEmail,
      donationNotifications,
      weeklyReports,
      marketingEmails
    } = req.body;

    // Try to update existing preferences
    const { data: existing } = await supabase
      .from('email_preferences')
      .select('id')
      .eq('creator_id', req.params.creatorId)
      .single();

    let data, error;

    if (existing) {
      // Update existing
      const result = await supabase
        .from('email_preferences')
        .update({
          welcome_email: welcomeEmail,
          donation_notifications: donationNotifications,
          weekly_reports: weeklyReports,
          marketing_emails: marketingEmails
        })
        .eq('creator_id', req.params.creatorId)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      // Create new
      const result = await supabase
        .from('email_preferences')
        .insert([{
          creator_id: req.params.creatorId,
          welcome_email: welcomeEmail,
          donation_notifications: donationNotifications,
          weekly_reports: weeklyReports,
          marketing_emails: marketingEmails
        }])
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unsubscribe from all emails
app.post('/api/email-preferences/unsubscribe', async (req, res) => {
  try {
    const { creatorId } = req.body;

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('email_preferences')
      .select('id')
      .eq('creator_id', creatorId)
      .single();

    let data, error;

    if (existing) {
      // Update to unsubscribe all
      const result = await supabase
        .from('email_preferences')
        .update({
          welcome_email: false,
          donation_notifications: false,
          weekly_reports: false,
          marketing_emails: false
        })
        .eq('creator_id', creatorId)
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      // Create with all disabled
      const result = await supabase
        .from('email_preferences')
        .insert([{
          creator_id: creatorId,
          welcome_email: false,
          donation_notifications: false,
          weekly_reports: false,
          marketing_emails: false
        }])
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) throw error;
    res.json({ success: true, message: 'Unsubscribed from all emails', data });
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
  ║     🚀 AlgoPay Plus API Server        ║
  ║                                        ║
  ║  Server running on port ${PORT}         ║
  ║  Environment: ${process.env.NODE_ENV || 'development'}              ║
  ║                                        ║
  ║  Health: http://localhost:${PORT}/health  ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;
