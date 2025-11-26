# 💜 AlgoPay Plus / Supportly

**A decentralized creator support platform built on Algorand blockchain**

Support creators with **zero platform fees**, reward supporters with **NFTs**, and process payments via **crypto & credit cards**.

---

## ✨ Features

### Core Features
- ✅ **Zero-fee crypto donations** - Direct USDC transfers on Algorand
- ✅ **Credit card payments** - via Stripe with auto-conversion to USDC
- ✅ **NFT rewards** - Automatically mint NFTs for top supporters
- ✅ **Email notifications** - Welcome, donations, receipts, weekly reports
- ✅ **Analytics dashboard** - Revenue tracking, growth metrics, exports
- ✅ **Multi-tenant** - Each creator gets their own page (@username)
- ✅ **Subscriptions** - Monthly/yearly creator subscriptions
- ✅ **Content gating** - Premium content for NFT holders

### Technical Stack
- **Frontend:** React 18, Pera Wallet, Stripe Elements
- **Backend:** Node.js, Express, Algorand SDK
- **Database:** Supabase (PostgreSQL)
- **Blockchain:** Algorand (Testnet/Mainnet)
- **Payments:** Stripe for cards, USDC for crypto
- **Email:** Resend / SendGrid / SMTP

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Stripe account (for card payments)
- Resend/SendGrid account (for emails)
- Pera Wallet browser extension

### 1. Clone & Install

```bash
git clone <your-repo-url> algopay-plus
cd algopay-plus

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Run the schema: `database/schema.sql`
4. Copy your project URL and API keys

### 3. Configure Environment Variables

**Backend (.env):**
```bash
cd backend
cp .env.example .env
# Edit .env with your actual values
```

**Frontend (.env):**
```bash
cd frontend
cp .env.example .env
# Edit .env with your actual values
```

### 4. Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### 5. Test It Out!

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- Health check: http://localhost:3001/health

---

## 📁 Project Structure

```
algopay-plus/
├── backend/
│   ├── server.js              # Main Express server
│   ├── email-notifications.js # Email system (5 templates)
│   ├── analytics.js           # Analytics & reporting
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── index.js
│   │   └── App.jsx            # Main React app
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   └── .env.example
├── database/
│   └── schema.sql             # Complete database schema
├── docs/
│   ├── SETUP.md              # Detailed setup guide
│   ├── API.md                # API documentation
│   └── DEPLOYMENT.md         # Production deployment
└── README.md                 # This file
```

---

## 🗄️ Database Schema

### Main Tables
- **creators** - Creator profiles and settings
- **donations** - All donation records
- **nft_configs** - NFT reward tier configurations
- **nfts** - Minted NFT records
- **subscriptions** - Creator subscription payments
- **content** - Gated content uploads
- **analytics_events** - Event tracking

See `database/schema.sql` for complete schema with indexes, triggers, and RLS policies.

---

## 🔌 API Endpoints

### Creators
- `POST /api/creators` - Create new creator
- `GET /api/creators/:username` - Get creator profile
- `GET /api/creators/:id/stats` - Get creator stats

### Donations
- `POST /api/donations` - Record donation
- `GET /api/donations/:creatorId` - List donations

### Payments (Stripe)
- `POST /api/payments/create` - Create payment intent
- `POST /api/stripe/webhook` - Handle Stripe webhooks

### NFTs
- `POST /api/nft/config` - Create NFT tier
- `GET /api/creators/:username/nfts` - Get NFT tiers

### Analytics
- `GET /api/analytics/dashboard/:creatorId` - Dashboard data
- `GET /api/analytics/revenue/:creatorId` - Revenue analytics
- `GET /api/analytics/supporters/:creatorId` - Supporter data
- `GET /api/analytics/export/csv/:creatorId` - Export CSV
- `GET /api/analytics/export/json/:creatorId` - Export JSON

### Email
- `POST /api/notifications/test` - Send test email

See `docs/API.md` for detailed documentation.

---

## 📧 Email System

### Providers Supported
1. **Resend** (Recommended) - Easiest setup
2. **SendGrid** - Popular alternative
3. **SMTP** - Use Gmail/custom server

### Email Templates
1. **Welcome** - New creator signup
2. **Donation Notification** - Alert creator of new donation
3. **Donation Receipt** - Thank you to supporter
4. **Weekly Report** - Weekly summary for creators
5. **Test Email** - Verify email configuration

### Configuration
```env
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@yourdomain.com
RESEND_API_KEY=re_your_key
```

---

## 📊 Analytics Features

### Dashboard Metrics
- Total revenue (period + all-time)
- Growth percentage vs previous period
- Donation count & breakdown
- Unique supporters
- Average donation amount
- Payment method distribution

### Advanced Analytics
- Revenue over time (charts)
- Top supporters list
- Retention rate calculation
- Hourly/weekly donation patterns
- Amount distribution analysis

### Export Options
- CSV export (for accounting)
- JSON export (full data dump)

---

## 🎨 NFT Rewards

### Features
- **Configurable tiers** - Set minimum donation amounts
- **Auto-minting** - NFTs mint automatically when threshold reached
- **Supply limits** - Set max supply per tier
- **IPFS storage** - Store metadata and images on IPFS
- **Gallery view** - Supporters can view their NFT collection

### How It Works
1. Creator configures NFT tier (e.g., $50 = Gold Badge)
2. Supporter donates $50+
3. System checks if donation qualifies for NFT
4. NFT mints automatically to supporter's wallet
5. Email notification sent with NFT details

---

## 🔐 Security

### Implemented
- ✅ Row Level Security (RLS) on all tables
- ✅ Webhook signature verification (Stripe)
- ✅ Input validation on all endpoints
- ✅ CORS protection
- ✅ Environment variable protection

### Best Practices
- Never commit `.env` files
- Use separate keys for dev/prod
- Enable 2FA on Supabase/Stripe accounts
- Regularly rotate API keys
- Monitor webhook endpoints

---

## 🚢 Deployment

### Recommended Stack
- **Frontend:** Vercel (easiest)
- **Backend:** Railway / Render / Heroku
- **Database:** Supabase (already hosted)
- **Blockchain:** Algorand Mainnet

### Quick Deploy

**1. Vercel (Frontend):**
```bash
cd frontend
npm install -g vercel
vercel --prod
```

**2. Railway (Backend):**
```bash
cd backend
npm install -g @railway/cli
railway login
railway init
railway up
```

See `docs/DEPLOYMENT.md` for detailed instructions.

---

## 💰 Cost Breakdown

### Development (Free Tier)
- Supabase: Free (up to 500MB database)
- Vercel: Free (hobby projects)
- Railway: $5/month (with free credits)
- Resend: Free (100 emails/day)
- Stripe: Free (pay-as-you-go on transactions)

### Production (Estimated)
- Supabase: $25/month (Pro plan)
- Railway: $20/month (backend hosting)
- Vercel: Free or $20/month (Pro for custom domains)
- Resend: $20/month (40K emails)
- Stripe: 2.9% + $0.30 per transaction

**Total: ~$70/month** for a professional setup

---

## 🧪 Testing

### Test Stripe Payments
Use these test card numbers:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0027 6000 3184`

### Test USDC on Algorand Testnet
1. Get testnet ALGO from [faucet](https://bank.testnet.algorand.network/)
2. Opt-in to USDC (Asset ID: 10458941)
3. Get testnet USDC from faucet
4. Test donation flow

### Test Email
```bash
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com"}'
```

---

## 📚 Documentation

- **Setup Guide:** `docs/SETUP.md`
- **API Reference:** `docs/API.md`
- **Deployment:** `docs/DEPLOYMENT.md`
- **Database Schema:** `database/schema.sql`

---

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists and has all variables
- Verify Supabase credentials
- Check port 3001 is available

### Frontend shows blank page
- Check console for errors (F12)
- Verify `REACT_APP_API_URL` in `.env`
- Check backend is running

### Emails not sending
- Verify email provider credentials
- Check `EMAIL_PROVIDER` setting
- Test with `/api/notifications/test` endpoint
- Check spam folder

### Stripe payments failing
- Verify webhook secret is correct
- Check Stripe dashboard for errors
- Ensure webhook endpoint is accessible
- Use Stripe CLI for local testing

---

## 🎯 Roadmap

### Phase 1: Foundation ✅
- [x] Multi-tenant platform
- [x] Creator profiles
- [x] Basic donation flow

### Phase 2: NFT Rewards ✅
- [x] NFT configuration
- [x] Auto-minting
- [x] NFT gallery

### Phase 3: Payments ✅
- [x] Stripe integration
- [x] Card payments
- [x] USDC conversion

### Phase 4: Analytics ✅
- [x] Dashboard metrics
- [x] Revenue tracking
- [x] Email notifications
- [x] CSV/JSON export

### Phase 5: Advanced Features 🔄
- [ ] Content gating
- [ ] Subscription tiers
- [ ] Mobile app
- [ ] Custom domains
- [ ] Advanced analytics

---

## 🤝 Contributing

This is a learning/portfolio project. Feel free to fork and modify!

---

## 📄 License

MIT License - feel free to use for your own projects!

---

## 💡 Support

Need help?
- Check `docs/` folder for detailed guides
- Review API documentation
- Test with provided examples

---

**Built with ❤️ using Algorand blockchain**

🚀 **Ready to support creators with zero fees!**
