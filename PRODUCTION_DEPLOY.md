# 🚀 Production Deployment Guide - AlgoPay Plus

**Last Updated:** November 28, 2025

---

## 📋 Pre-Deployment Checklist

### Code Ready ✅
- [x] All features implemented
- [x] API endpoints tested
- [x] Database schema deployed
- [x] Environment variables documented
- [x] Error handling in place
- [x] Security measures implemented

### Services Required
- [ ] Supabase account (database)
- [ ] Stripe account (payments)
- [ ] Resend/SendGrid account (emails)
- [ ] Railway/Render account (backend hosting)
- [ ] Vercel account (frontend hosting)
- [ ] Domain name (optional)

---

## 🗄️ Step 1: Database Setup (Supabase)

### 1.1 Create Production Database

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. **Project Settings:**
   - Name: `algopay-plus-production`
   - Region: Choose closest to your users
   - Database Password: **Generate strong password** (save securely!)
   - Pricing Plan: Pro ($25/month recommended)

4. Wait for provisioning (2-3 minutes)

### 1.2 Run Database Schema

1. Go to SQL Editor
2. Create new query
3. Copy contents from `/database/schema.sql`
4. Execute query
5. Verify tables created:
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

### 1.3 Save Credentials

```bash
# Save these securely (password manager recommended)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...  # Settings > API
```

---

## 💳 Step 2: Stripe Setup

### 2.1 Switch to Live Mode

1. Go to [stripe.com/dashboard](https://dashboard.stripe.com)
2. Toggle from "Test mode" to "Live mode" (top right)

### 2.2 Get Live API Keys

1. Go to Developers > API keys
2. Copy:
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxxx
   ```

### 2.3 Create Webhook Endpoint

1. Go to Developers > Webhooks
2. Click "Add endpoint"
3. **Endpoint URL:** `https://api.yourdomain.com/api/stripe/webhook`
4. **Events to send:**
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy webhook signing secret:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_live_xxxx
   ```

---

## 📧 Step 3: Email Service Setup

### Option A: Resend (Recommended)

1. Go to [resend.com](https://resend.com)
2. Sign up / Log in
3. Go to API Keys
4. Create new API key: "AlgoPay Production"
5. Copy:
   ```bash
   RESEND_API_KEY=re_live_xxxx
   EMAIL_PROVIDER=resend
   ```

6. Verify domain (optional but recommended):
   - Go to Domains > Add Domain
   - Add your domain
   - Add DNS records (TXT, MX, CNAME)
   - Verify

### Option B: SendGrid

1. Go to [sendgrid.com](https://sendgrid.com)
2. Create account
3. Settings > API Keys > Create API Key
4. Copy:
   ```bash
   SENDGRID_API_KEY=SG.xxxx
   EMAIL_PROVIDER=sendgrid
   ```

---

## 🔗 Step 4: Algorand Mainnet Setup

### 4.1 Update Environment Variables

```bash
# Switch from testnet to mainnet
ALGORAND_NETWORK=mainnet
ALGORAND_ALGOD_SERVER=https://mainnet-api.algonode.cloud
ALGORAND_INDEXER_SERVER=https://mainnet-idx.algonode.cloud

# Mainnet USDC Asset ID
USDC_ASSET_ID=31566704
```

### 4.2 Important Notes

⚠️ **Mainnet transactions use real money!**
- Test thoroughly on testnet first
- Start with small amounts
- Monitor all transactions
- Have emergency procedures ready

---

## 🖥️ Step 5: Backend Deployment (Railway)

### 5.1 Install Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### 5.2 Create New Project

```bash
cd backend
railway init
# Project name: algopay-plus-api
```

### 5.3 Add Environment Variables

```bash
# Add each variable:
railway variables set SUPABASE_URL=https://xxxxx.supabase.co
railway variables set SUPABASE_SERVICE_KEY=your_service_key
railway variables set STRIPE_SECRET_KEY=sk_live_xxx
railway variables set STRIPE_WEBHOOK_SECRET=whsec_live_xxx
railway variables set RESEND_API_KEY=re_live_xxx
railway variables set EMAIL_PROVIDER=resend
railway variables set EMAIL_FROM=noreply@yourdomain.com
railway variables set FRONTEND_URL=https://yourdomain.com
railway variables set NODE_ENV=production
railway variables set ALGORAND_NETWORK=mainnet
railway variables set ALGORAND_ALGOD_SERVER=https://mainnet-api.algonode.cloud
railway variables set USDC_ASSET_ID=31566704
railway variables set JWT_SECRET=$(openssl rand -base64 32)
```

### 5.4 Deploy

```bash
railway up
```

**Railway will:**
- Build your application
- Install dependencies
- Start the server
- Provide a URL: `https://algopay-plus-production.up.railway.app`

### 5.5 Custom Domain (Optional)

1. Railway Dashboard > Settings > Domains
2. Add custom domain: `api.yourdomain.com`
3. Add CNAME record in your DNS:
   ```
   CNAME api.yourdomain.com -> algopay-plus-production.up.railway.app
   ```

---

## 🌐 Step 6: Frontend Deployment (Vercel)

### 6.1 Install Vercel CLI

```bash
npm install -g vercel
vercel login
```

### 6.2 Configure Environment Variables

Create `frontend/.env.production`:

```bash
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_ALGORAND_NODE=https://mainnet-api.algonode.cloud
REACT_APP_USDC_ASSET_ID=31566704
REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
REACT_APP_SUPABASE_KEY=your_anon_key
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### 6.3 Deploy

```bash
cd frontend
vercel --prod
```

**Follow prompts:**
- Link to existing project? No
- Project name: `algopay-plus`
- Framework: Create React App
- Build settings: Use defaults

### 6.4 Add Environment Variables to Vercel

```bash
# Add each variable via CLI or Dashboard
vercel env add REACT_APP_API_URL production
# Enter value: https://api.yourdomain.com

# Or via Vercel Dashboard:
# Settings > Environment Variables
```

### 6.5 Custom Domain

1. Vercel Dashboard > Domains
2. Add domain: `yourdomain.com` and `www.yourdomain.com`
3. Update DNS:
   ```
   A     @    76.76.21.21
   CNAME www  cname.vercel-dns.com
   ```

---

## 🔒 Step 7: Security Hardening

### 7.1 Update CORS

In `backend/server.js`:
```javascript
app.use(cors({
  origin: [
    'https://yourdomain.com',
    'https://www.yourdomain.com'
  ],
  credentials: true
}));
```

### 7.2 Supabase RLS Policies

Verify Row Level Security is enabled (already in schema.sql).

### 7.3 Rate Limiting (Optional but Recommended)

Install:
```bash
npm install express-rate-limit
```

Add to `server.js`:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### 7.4 Helmet (Security Headers)

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

---

## 📊 Step 8: Monitoring & Logging

### 8.1 Railway Logging

View logs:
```bash
railway logs
```

Or in Railway Dashboard > Logs

### 8.2 Sentry (Error Tracking - Optional)

1. Sign up at [sentry.io](https://sentry.io)
2. Create project
3. Install:
   ```bash
   npm install @sentry/node
   ```

4. Add to `server.js`:
   ```javascript
   const Sentry = require('@sentry/node');

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: 'production'
   });

   app.use(Sentry.Handlers.requestHandler());
   app.use(Sentry.Handlers.errorHandler());
   ```

---

## 🧪 Step 9: Production Testing

### 9.1 Test Checklist

**Backend:**
```bash
# Health check
curl https://api.yourdomain.com/health

# Create test creator
curl -X POST https://api.yourdomain.com/api/creators \
  -H "Content-Type: application/json" \
  -d '{"username":"testprod", ...}'

# Test email
curl -X POST https://api.yourdomain.com/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

**Frontend:**
- Visit https://yourdomain.com
- Test creator signup
- Test donation flow (small amount!)
- Test wallet connection
- Test all navigation
- Check console for errors
- Test on mobile

**Stripe:**
- Test live card payment with real card (small amount)
- Verify webhook triggered
- Check Stripe dashboard for payment
- Verify email notifications sent

### 9.2 Small Live Transaction Test

1. Create test creator account
2. Make $1 donation (real money)
3. Verify:
   - Transaction appears in Supabase
   - Email notifications sent
   - Analytics updated
   - NFT minted (if configured)

---

## 📈 Step 10: Go Live!

### 10.1 Launch Checklist

- [ ] All tests passed
- [ ] DNS propagated (check with `dig yourdomain.com`)
- [ ] SSL certificates active (check browser lock icon)
- [ ] Error tracking configured
- [ ] Backups enabled (Supabase auto-backups)
- [ ] Monitoring alerts set up
- [ ] Documentation updated
- [ ] Team notified

### 10.2 Announce Launch

- Update social media
- Notify early users
- Monitor closely for first 24 hours
- Be ready to roll back if issues arise

---

## 🔄 Step 11: Maintenance & Updates

### Daily Tasks
- Check error logs
- Monitor Stripe dashboard
- Review email delivery rates

### Weekly Tasks
- Review analytics
- Check Supabase usage
- Update dependencies if needed

### Monthly Tasks
- Review costs vs. projections
- Update documentation
- Security audit
- Backup verification

---

## 💰 Production Costs

### Monthly Estimates

| Service | Plan | Cost |
|---------|------|------|
| Supabase | Pro | $25/month |
| Railway | Starter | $20/month |
| Vercel | Free/Pro | $0-20/month |
| Resend | Pro | $20/month (40K emails) |
| Stripe | Transaction fees | 2.9% + $0.30/transaction |
| Domain | Annual | ~$12/year ($1/month) |
| **Total** | | **~$86-106/month** |

### Scaling Costs

**At 1,000 donations/month:**
- Stripe fees: ~$1,450 (assuming avg $50 donation)
- All other services: ~$86-106
- **Total: ~$1,536-1,556/month**

**At 10,000 donations/month:**
- Consider dedicated infrastructure
- Negotiate Stripe rates
- Upgrade Supabase plan

---

## 🆘 Troubleshooting

### Backend Won't Start
```bash
# Check Railway logs
railway logs

# Common issues:
# - Missing environment variable
# - Database connection failed
# - Port already in use
```

### Frontend Build Fails
```bash
# Check build logs in Vercel
# Common issues:
# - Missing environment variables
# - API URL incorrect
# - Dependencies not installed
```

### Stripe Webhooks Not Working
1. Check webhook endpoint URL
2. Verify webhook secret
3. Check Railway logs for errors
4. Test with Stripe CLI:
   ```bash
   stripe listen --forward-to https://api.yourdomain.com/api/stripe/webhook
   ```

### Emails Not Sending
1. Verify email provider API key
2. Check email logs
3. Verify domain authentication
4. Check spam folder
5. Test with `/api/notifications/test`

---

## 📞 Support Contacts

### Service Support
- **Supabase:** [support.supabase.com](https://support.supabase.com)
- **Stripe:** [support.stripe.com](https://support.stripe.com)
- **Railway:** [railway.app/help](https://railway.app/help)
- **Vercel:** [vercel.com/support](https://vercel.com/support)
- **Resend:** [resend.com/support](https://resend.com/support)

---

## 🎉 Congratulations!

Your AlgoPay Plus platform is now live in production! 🚀

Monitor closely for the first week and be ready to iterate based on user feedback.

**Next Steps:**
- Gather user feedback
- Monitor analytics
- Plan feature roadmap
- Scale as needed

---

**Built with ❤️ on Algorand blockchain**
