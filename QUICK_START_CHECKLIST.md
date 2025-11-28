# ✅ Quick Start Checklist

## 🎯 Getting Everything Running

### 1. Access Supabase Dashboard
- [ ] Go to https://supabase.com/dashboard
- [ ] Sign in to your account
- [ ] Find project: **htugrxwhoojenhooaohk**
- [ ] Verify tables exist (creators, donations, etc.)
- [ ] Check that database is active

**Direct Link**: https://supabase.com/dashboard/project/htugrxwhoojenhooaohk

---

### 2. Deploy Backend to Railway

#### Option A: Via Railway Dashboard (Recommended)
- [ ] Go to https://railway.app/dashboard
- [ ] Click "New Project"
- [ ] Deploy from GitHub repo
- [ ] Select `algopay-plus` repository
- [ ] Set root directory to `/backend`
- [ ] Add all environment variables (see RAILWAY_DEPLOYMENT.md)
- [ ] Deploy and copy the Railway URL

#### Option B: Via Railway CLI
```bash
cd backend
npm i -g @railway/cli
railway login
railway init
railway up
```

**Copy your Railway URL**: `https://______.up.railway.app`

---

### 3. Configure Stripe Webhooks
- [ ] Go to https://dashboard.stripe.com/webhooks
- [ ] Click "Add endpoint"
- [ ] Enter URL: `https://your-railway-url.up.railway.app/api/stripe/webhook`
- [ ] Select events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.succeeded`
- [ ] Copy webhook signing secret
- [ ] Add to Railway variables: `STRIPE_WEBHOOK_SECRET=whsec_...`

---

### 4. Test Backend Connection

```bash
# Test health endpoint
curl https://your-railway-url.up.railway.app/health

# Expected response:
# {"status":"ok","services":{"database":"connected","stripe":true}}
```

---

### 5. Deploy Frontend (Optional - if using Vercel)

```bash
cd frontend
npm install -g vercel
vercel --prod
```

- [ ] Copy Vercel URL
- [ ] Update Railway backend env: `FRONTEND_URL=https://your-frontend.vercel.app`

---

### 6. Update Frontend Configuration

Edit `frontend/.env`:
```env
REACT_APP_API_URL=https://your-railway-url.up.railway.app
```

Then redeploy frontend or run locally:
```bash
cd frontend
npm start
```

---

### 7. Test Stripe Payment Flow

#### Create Test Payment
```bash
curl -X POST https://your-railway-url.up.railway.app/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "creatorId": "test-creator",
    "supporterEmail": "test@example.com"
  }'
```

#### Use Test Card in Frontend
- Card: `4242 4242 4242 4242`
- Expiry: Any future date
- CVC: Any 3 digits

---

### 8. Verify Data in Supabase

- [ ] Go to Supabase → Table Editor → `donations`
- [ ] Check for new donation records
- [ ] Verify `payment_method = 'stripe'`
- [ ] Check `status = 'completed'`

---

## 🔍 Network Access Explained

### Why No Network Access in Test Environment?
The test environment you were using has restricted network access for security. This prevents:
- Connections to external APIs (Stripe, Supabase)
- Database queries to remote servers
- Webhook callbacks

### Solution: Deploy to Real Environment
Once you deploy to Railway:
✅ Full network access
✅ Can connect to Supabase database
✅ Can make Stripe API calls
✅ Can receive webhook events

---

## 📍 Your URLs Reference

Keep track of these URLs:

| Service | URL |
|---------|-----|
| **Supabase Dashboard** | https://supabase.com/dashboard/project/htugrxwhoojenhooaohk |
| **Supabase API** | https://htugrxwhoojenhooaohk.supabase.co |
| **Railway Backend** | https://_______.up.railway.app |
| **Frontend (Vercel)** | https://_______.vercel.app |
| **Stripe Dashboard** | https://dashboard.stripe.com |

---

## 🆘 Common Issues

### Backend can't connect to Supabase
**Fix**: Check Railway environment variables:
- `SUPABASE_URL` is correct
- `SUPABASE_KEY` is the anon key from Supabase dashboard

### Stripe payments fail
**Fix**:
1. Verify `STRIPE_SECRET_KEY` in Railway
2. Check Stripe dashboard for errors
3. Ensure webhook endpoint is correct

### CORS errors in frontend
**Fix**: Set `FRONTEND_URL` in Railway backend to match your frontend URL

---

## 🎉 Success Checklist

You know everything is working when:
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Can create test payment and get `clientSecret`
- [ ] Test payment with card `4242...` succeeds
- [ ] Donation appears in Supabase `donations` table
- [ ] Frontend can fetch data from backend
- [ ] Stripe webhook receives events

---

## 📞 Need Help?

- **Railway Issues**: https://discord.gg/railway
- **Supabase Issues**: https://discord.gg/supabase
- **Stripe Issues**: https://support.stripe.com

---

**Next Steps**: See `RAILWAY_DEPLOYMENT.md` for detailed deployment instructions!
