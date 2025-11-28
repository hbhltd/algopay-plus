# Subscription System Documentation

## Overview

The Supportly platform now includes a comprehensive subscription system where creators purchase access to the platform with tiered pricing and automatic yearly renewals.

## Features

### ✅ Phase 1: Subscription Tier System (COMPLETED)

- **Three-tier pricing model** (Free, Pro $99/year, Premium $299/year)
- **Feature-based access control** with tier enforcement
- **Stripe integration** for recurring payments
- **Subscription management API** with full CRUD operations
- **Database schema** with subscriptions, history, usage tracking, and invoices

### ✅ Phase 2: Yearly Renewal Logic (COMPLETED)

- **Automatic renewal** with Stripe subscriptions
- **Grace period handling** (7 days after expiration)
- **Email notifications** (30, 7, 1 day before expiry)
- **Renewal confirmation** emails
- **Failed payment handling** with notifications
- **Automated cron jobs** running daily

---

## Subscription Tiers

### Free Tier ($0)
- Crypto (USDC) payments only
- Up to 50 donations/month
- Basic analytics
- Email notifications
- Community support

### Pro Tier ($99/year)
- All payment methods (Crypto, Stripe, PayPal, Cash App)
- Up to 500 donations/month
- Advanced analytics & reports
- Webhooks (up to 5)
- Donor management & newsletters (1,000 subscribers)
- NFT rewards
- Discord & social media integrations
- Email support

### Premium Tier ($299/year)
- **Unlimited** donations
- **Unlimited** webhooks
- **Unlimited** newsletter subscribers
- All payment methods
- Full analytics suite
- Custom domain
- Digital products & content gating
- QuickBooks integration
- Scheduled consultations
- Priority support

---

## API Endpoints

### Tier Information

```
GET /api/subscriptions/tiers
```
Get all available subscription tiers with pricing and features.

```
GET /api/subscriptions/tier/:tierName
```
Get specific tier configuration (free, pro, or premium).

### Subscription Management

```
GET /api/subscriptions/creator/:creatorId
```
Get creator's current subscription status.

```
POST /api/subscriptions/create
Body: { creatorId, tier, paymentMethodId, email }
```
Create a new subscription for a creator.

```
POST /api/subscriptions/cancel
Body: { subscriptionId, creatorId, reason }
```
Cancel a subscription (continues until end of billing period).

```
POST /api/subscriptions/change-tier
Body: { subscriptionId, creatorId, newTier, paymentMethodId }
```
Upgrade or downgrade subscription with prorated billing.

```
POST /api/subscriptions/renew
Body: { subscriptionId }
```
Manually renew a subscription (usually handled automatically).

### Feature Access Control

```
POST /api/subscriptions/check-feature
Body: { creatorId, feature }
```
Check if creator has access to a specific feature.

```
POST /api/subscriptions/check-limit
Body: { creatorId, action, increment }
```
Check if creator can perform action within tier limits.

```
GET /api/subscriptions/stats
```
Get subscription statistics (admin only).

### Stripe Webhook

```
POST /api/subscriptions/webhook
```
Stripe webhook handler for subscription events (requires webhook secret).

---

## Middleware

### `requireFeature(featureName)`
Protects routes based on feature availability.

```javascript
const { requireFeature } = require('./subscription-middleware');

app.post('/api/webhook-settings', requireFeature('webhooks'), async (req, res) => {
  // Handler code
});
```

### `checkLimit(action, incrementUsage)`
Enforces usage limits based on tier.

```javascript
const { checkLimit } = require('./subscription-middleware');

app.post('/api/newsletter/send',
  checkLimit('maxEmailsPerMonth', true),
  async (req, res) => {
    // Handler code - usage automatically incremented
  }
);
```

### `requireTier(minTierName)`
Requires minimum subscription tier.

```javascript
const { requireTier } = require('./subscription-middleware');

app.post('/api/premium-feature', requireTier('pro'), async (req, res) => {
  // Only pro and premium users can access
});
```

### `requireActiveSubscription()`
Ensures subscription is active (not expired or canceled).

```javascript
const { requireActiveSubscription } = require('./subscription-middleware');

app.post('/api/some-feature', requireActiveSubscription(), async (req, res) => {
  // Handler code
});
```

---

## Feature Flags

Features are defined in `subscription-tiers.js` and enforced automatically:

```javascript
// Payment Methods
cryptoPayments: boolean
stripePayments: boolean
paypalPayments: boolean
cashappDisplay: boolean

// Donation Features
maxMonthlyDonations: number (-1 for unlimited)
recurringDonations: boolean
nftRewards: boolean

// Email & Notifications
customEmailService: boolean
webhooks: boolean
maxWebhooks: number
maxEmailsPerMonth: number

// Analytics
advancedAnalytics: boolean
exportData: boolean
donorInsights: boolean

// Community
donorManagement: boolean
newsletter: boolean
maxNewsletterSubscribers: number
customBranding: boolean
customDomain: boolean

// Integrations
discordIntegration: boolean
zapierIntegration: boolean
socialMediaIntegration: boolean
accountingIntegration: boolean

// Content
contentGating: boolean
digitalProducts: boolean
membershipTiers: number
scheduledSessions: boolean
```

---

## Automatic Renewals

### Cron Jobs (runs daily)

1. **9:00 AM** - Send renewal reminders (30, 7, 1 day before expiry)
2. **10:00 AM** - Process automatic renewals
3. **11:00 AM** - Handle expired subscriptions and grace periods

### Renewal Flow

1. 30 days before expiry → Send first reminder email
2. 7 days before expiry → Send second reminder
3. 1 day before expiry → Send final reminder
4. Expiration day:
   - If `auto_renew = true`: Charge via Stripe, extend subscription
   - If `auto_renew = false`: Mark as expired, start 7-day grace period
5. During grace period → Full access continues
6. After grace period → Downgrade to free tier

### Email Notifications

- **Renewal reminders** (30/7/1 days before)
- **Renewal confirmation** (successful renewal)
- **Renewal failure** (payment failed)
- **Grace period notification** (subscription expired)
- **Downgrade notification** (reverted to free tier)

---

## Database Schema

### `subscriptions` table
Stores all subscription records with Stripe integration.

### `subscription_history` table
Audit log of all subscription events (created, renewed, upgraded, canceled, etc.).

### `subscription_usage` table
Tracks feature usage against tier limits (donations/month, emails sent, webhooks, etc.).

### `subscription_invoices` table
Payment invoices for all subscription transactions.

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install the new `pg` package needed for database access.

### 2. Set Environment Variables

Add to `.env`:

```env
# Database (PostgreSQL connection string for Supabase)
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL (for email links)
FRONTEND_URL=https://supportly.com
```

### 3. Run Database Migration

```bash
cd backend
npm run migrate
```

This creates the enhanced subscription tables.

### 4. Start Server

```bash
npm start
```

The renewal cron jobs will initialize automatically.

---

## Usage Examples

### Creating a Subscription

```javascript
// Free tier
const response = await fetch('/api/subscriptions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creatorId: 'uuid',
    tier: 'free'
  })
});

// Paid tier with Stripe
const response = await fetch('/api/subscriptions/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creatorId: 'uuid',
    tier: 'pro',
    paymentMethodId: 'pm_...', // Stripe payment method
    email: 'creator@example.com'
  })
});
```

### Checking Feature Access

```javascript
const response = await fetch('/api/subscriptions/check-feature', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creatorId: 'uuid',
    feature: 'webhooks'
  })
});

const { hasAccess } = await response.json();
```

### Checking Usage Limits

```javascript
const response = await fetch('/api/subscriptions/check-limit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    creatorId: 'uuid',
    action: 'maxMonthlyDonations',
    increment: true // Increment usage counter
  })
});

const { allowed, currentUsage, limit } = await response.json();
```

### Upgrading a Subscription

```javascript
const response = await fetch('/api/subscriptions/change-tier', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    subscriptionId: 'uuid',
    creatorId: 'uuid',
    newTier: 'premium',
    paymentMethodId: 'pm_...'
  })
});

const { proration, newTier } = await response.json();
// Proration details show prorated charges
```

---

## Testing

### Manual Testing

1. Create a test creator account
2. Subscribe to Pro tier with Stripe test card (4242 4242 4242 4242)
3. Check subscription status via API
4. Test feature access with middleware
5. Test tier limits (donations, emails, webhooks)
6. Cancel subscription and verify grace period
7. Test upgrade/downgrade with proration

### Stripe Test Cards

```
Success: 4242 4242 4242 4242
Declined: 4000 0000 0000 0002
Insufficient funds: 4000 0000 0000 9995
```

---

## Next Steps

### Phase 2: High-Impact Integrations (PENDING)
- [ ] Discord integration
- [ ] Zapier webhook integration
- [ ] QuickBooks accounting integration
- [ ] Social media integrations (Twitter/Instagram)

### Phase 3: Content Monetization (PENDING)
- [ ] Digital product delivery system
- [ ] Membership content gating
- [ ] Scheduling system for paid consultations

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify Stripe webhook is configured correctly
- Ensure DATABASE_URL is set properly
- Check that cron jobs are running (logs show at server startup)

---

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│          SUBSCRIPTION SYSTEM                │
├─────────────────────────────────────────────┤
│                                             │
│  subscription-tiers.js                      │
│  └─ Tier configs & feature matrix          │
│                                             │
│  subscription-service.js                    │
│  └─ Business logic (create, renew, etc.)   │
│                                             │
│  subscription-api.js                        │
│  └─ REST API endpoints                     │
│                                             │
│  subscription-middleware.js                 │
│  └─ Route protection & enforcement         │
│                                             │
│  subscription-renewals.js                   │
│  └─ Cron jobs & email notifications        │
│                                             │
│  DATABASE:                                  │
│  ├─ subscriptions (main records)           │
│  ├─ subscription_history (audit log)       │
│  ├─ subscription_usage (limit tracking)    │
│  └─ subscription_invoices (payments)       │
│                                             │
│  INTEGRATIONS:                              │
│  ├─ Stripe (recurring billing)             │
│  ├─ Email (notifications)                  │
│  └─ PostgreSQL (Supabase)                  │
└─────────────────────────────────────────────┘
```

---

**Built with ❤️ for the Supportly creator platform**
