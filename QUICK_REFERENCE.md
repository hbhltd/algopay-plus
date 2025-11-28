# ⚡ Quick Reference Card

## 🚀 Start Servers

```bash
# Terminal 1 - Backend
cd /home/user/algopay-plus/backend
npm run dev

# Terminal 2 - Frontend
cd /home/user/algopay-plus/frontend
npm start
```

## 🌐 URLs

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001
- **Health Check:** http://localhost:3001/health
- **Supabase:** https://supabase.com/dashboard/project/htugrxwhoojenhooaohk

## 🔑 Test Credentials

**Stripe Test Card:**
- Card: `4242 4242 4242 4242`
- Expiry: `12/34`
- CVC: `123`

**Algorand Testnet:**
- Server: `https://testnet-api.algonode.cloud`
- USDC Asset ID: `10458941`
- Faucet: https://bank.testnet.algorand.network/

## 📋 Common Commands

```bash
# Install dependencies
cd backend && npm install
cd frontend && npm install

# Apply migrations
# → See MANUAL_MIGRATION_GUIDE.md

# Check logs
# → Look at Terminal 1 (backend)

# Test email
curl -X POST http://localhost:3001/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com"}'
```

## 🗄️ Database Queries

```sql
-- Suspend account
UPDATE creators SET account_status = 'suspended' WHERE username = 'testuser';

-- Restore account
UPDATE creators SET account_status = 'active' WHERE username = 'testuser';

-- Check subscriptions
SELECT username, subscription_status, subscription_end_date FROM creators;
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `backend/.env` | Backend secrets |
| `frontend/.env` | Frontend config |
| `backend/server.js` | Main API |
| `frontend/src/App.jsx` | Frontend app |
| `BEGINNER_SETUP_GUIDE.md` | Full setup guide |

## 🆘 Troubleshooting

**Backend won't start:**
- Check `.env` file exists
- Verify Supabase credentials
- Check port 3001 is available

**Frontend shows errors:**
- Check backend is running
- Verify `REACT_APP_API_URL` in `.env`
- Open browser console (F12)

**Donations fail:**
- Use test card: `4242 4242 4242 4242`
- Check Stripe keys in `.env`
- Look at backend logs

---

**📖 Full Guide:** [BEGINNER_SETUP_GUIDE.md](./BEGINNER_SETUP_GUIDE.md)
