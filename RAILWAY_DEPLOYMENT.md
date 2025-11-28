# 🚂 Railway Deployment Guide for AlgoPay-Plus Backend

## Prerequisites
- Railway account (https://railway.app)
- Railway CLI installed (optional but recommended)

## Method 1: Deploy via Railway Dashboard (Easiest)

### Step 1: Create New Project
1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Connect your GitHub account if needed
5. Select your **algopay-plus** repository
6. Choose the **backend** directory as the root

### Step 2: Configure Environment Variables
In the Railway dashboard, go to **Variables** tab and add these:

```env
# Server
NODE_ENV=production
PORT=3001

# Frontend URL (update with your actual frontend URL)
FRONTEND_URL=https://your-frontend-url.vercel.app

# Supabase (get these from your Supabase dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Algorand
ALGORAND_NETWORK=testnet
ALGORAND_ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGORAND_ALGOD_TOKEN=
ALGORAND_INDEXER_SERVER=https://testnet-idx.algonode.cloud
ALGORAND_INDEXER_TOKEN=
USDC_ASSET_ID=10458941

# Stripe (use your actual keys from Stripe dashboard)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Email (optional - set to 'dev' for testing)
EMAIL_PROVIDER=dev
EMAIL_FROM=noreply@supportly.local

# JWT
JWT_SECRET=your-production-jwt-secret-change-this-to-random-string
```

### Step 3: Configure Build Settings
Railway should auto-detect Node.js. Verify these settings:

- **Build Command**: `npm install`
- **Start Command**: `npm start` or `node server.js`
- **Root Directory**: `/backend` (if deploying from repo root)

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait for deployment to complete
3. Railway will give you a URL like: `https://your-app.up.railway.app`

---

## Method 2: Deploy via Railway CLI

### Step 1: Install Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Or using Homebrew (Mac)
brew install railway
```

### Step 2: Login and Initialize
```bash
cd /home/user/algopay-plus/backend

# Login to Railway
railway login

# Initialize project
railway init

# Link to existing project (if you already created one)
railway link
```

### Step 3: Set Environment Variables
```bash
# You can set variables via CLI
railway variables set STRIPE_SECRET_KEY="sk_test_51SYVem1dwCp..."
railway variables set SUPABASE_URL="https://htugrxwhoojenhooaohk.supabase.co"

# Or upload from .env file
railway variables set --from-env-file .env
```

### Step 4: Deploy
```bash
# Deploy to Railway
railway up

# Or deploy with auto-deploy on git push
railway up --detach
```

---

## 📡 After Deployment

### 1. Get Your Railway Backend URL
After deployment, Railway provides a URL. It will look like:
```
https://algopay-plus-backend-production.up.railway.app
```

### 2. Update Frontend Configuration
Update your frontend `.env` file:
```env
REACT_APP_API_URL=https://your-railway-url.up.railway.app
```

### 3. Update Stripe Webhook URL
In your Stripe Dashboard:
1. Go to **Developers → Webhooks**
2. Click **"Add endpoint"**
3. Enter: `https://your-railway-url.up.railway.app/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Webhook signing secret**
6. Add it to Railway variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

### 4. Update CORS Settings
Make sure your backend allows requests from your frontend:
```env
FRONTEND_URL=https://your-frontend.vercel.app
```

---

## 🧪 Testing Your Deployment

### Test Health Endpoint
```bash
curl https://your-railway-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-28T...",
  "services": {
    "database": "connected",
    "stripe": true,
    "algorand": true,
    "email": true
  }
}
```

### Test Stripe Integration
```bash
curl -X POST https://your-railway-url.up.railway.app/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "creatorId": "test-creator",
    "supporterEmail": "test@example.com"
  }'
```

---

## 🔒 Security Checklist

Before going to production:

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Switch Stripe keys from test mode to live mode
- [ ] Enable CORS only for your frontend domain
- [ ] Set `NODE_ENV=production`
- [ ] Review Supabase RLS policies
- [ ] Enable Railway's built-in SSL/HTTPS
- [ ] Set up monitoring and logging

---

## 💰 Railway Pricing

- **Starter Plan**: $5/month (500 hours)
- **Developer Plan**: $20/month (unlimited hours)
- First $5 is free with trial credits

---

## 🆘 Troubleshooting

### Database Connection Issues
```bash
# Check if Railway can reach Supabase
railway run node test-stripe.js
```

### Environment Variables Not Loading
```bash
# List all variables
railway variables

# Check specific variable
railway variables get STRIPE_SECRET_KEY
```

### Logs
```bash
# View real-time logs
railway logs

# Or in Railway dashboard: Deployments → View Logs
```

---

## 📚 Additional Resources

- Railway Docs: https://docs.railway.app
- Railway CLI Reference: https://docs.railway.app/develop/cli
- Node.js Deployment Guide: https://docs.railway.app/guides/nodejs

---

**Need help?** Check Railway's Discord: https://discord.gg/railway
