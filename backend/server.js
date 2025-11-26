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
    const { username, displayName, bio, email, walletAddress, twitter, youtube, website, avatar } = req.body;

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
        avatar_url: avatar
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
