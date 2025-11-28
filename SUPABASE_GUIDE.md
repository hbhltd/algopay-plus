# 📊 Supabase Dashboard Guide

## 🔗 Access Your Supabase Project

**Your Project URL**: https://htugrxwhoojenhooaohk.supabase.co
**Dashboard**: https://supabase.com/dashboard/project/htugrxwhoojenhooaohk

---

## 📋 Viewing Your Data

### 1. **Table Editor**
Navigate to: **Table Editor** (left sidebar)

You should see these tables:
- `creators` - Creator profiles and payment info
- `donations` - All donation records
- `nft_configs` - NFT reward tier configurations
- `nfts` - Minted NFT records
- `subscriptions` - Creator subscription payments
- `content` - Gated content uploads
- `analytics_events` - Event tracking
- `newsletter_subscribers` - Email subscribers
- `newsletters` - Newsletter drafts and sent emails

### 2. **SQL Editor**
Navigate to: **SQL Editor** (left sidebar)

Run queries to check your data:

```sql
-- View all creators
SELECT * FROM creators ORDER BY created_at DESC LIMIT 10;

-- View all donations
SELECT
  d.id,
  d.amount,
  d.currency,
  d.payment_method,
  d.created_at,
  c.username as creator_name
FROM donations d
JOIN creators c ON d.creator_id = c.id
ORDER BY d.created_at DESC
LIMIT 20;

-- Check Stripe-related donations
SELECT * FROM donations
WHERE payment_method = 'stripe'
ORDER BY created_at DESC;

-- View donation stats by creator
SELECT
  c.username,
  COUNT(d.id) as total_donations,
  SUM(d.amount) as total_amount,
  AVG(d.amount) as avg_amount
FROM creators c
LEFT JOIN donations d ON c.id = d.creator_id
GROUP BY c.id, c.username;
```

### 3. **Database Settings**
Navigate to: **Settings** → **Database**

Here you can find:
- Connection string
- Connection pooler settings
- Database password
- Migration history

---

## 🔑 API Keys & Configuration

Navigate to: **Settings** → **API**

You'll find:
- **Project URL**: `https://htugrxwhoojenhooaohk.supabase.co`
- **Anon/Public Key**: (for client-side)
- **Service Role Key**: (for server-side - KEEP SECRET!)

These are already configured in your `.env` file.

---

## 🔐 Row Level Security (RLS)

Navigate to: **Authentication** → **Policies**

Check that RLS policies are enabled for:
- `creators` table
- `donations` table
- `subscriptions` table
- Other sensitive tables

---

## 📈 Monitoring Your Database

### Database Health
Navigate to: **Database** → **Roles**

Check:
- Active connections
- Database size
- Table sizes

### Logs
Navigate to: **Logs**

View:
- Postgres logs
- API logs
- Real-time logs

---

## 🧪 Testing Database Connection from Railway

Once your backend is deployed on Railway, test the connection:

```bash
# SSH into Railway (if using Railway CLI)
railway shell

# Or test via API endpoint
curl https://your-railway-url.up.railway.app/health
```

Expected response showing database is connected:
```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "stripe": true
  }
}
```

---

## 🔄 Database Migrations

If you need to update the schema:

1. **Via SQL Editor in Supabase**:
   - Go to SQL Editor
   - Paste your migration SQL
   - Click "Run"

2. **Via Migration Files** (recommended for production):
   - Create migration file in `database/migrations/`
   - Run via Supabase CLI:
     ```bash
     supabase db push
     ```

---

## 📊 Sample Data for Testing

You can insert test data via SQL Editor:

```sql
-- Create a test creator
INSERT INTO creators (username, email, wallet_address, display_name)
VALUES ('testcreator', 'test@example.com', 'ALGO123...', 'Test Creator')
RETURNING *;

-- Create a test donation (replace creator_id with actual ID)
INSERT INTO donations (
  creator_id,
  supporter_email,
  amount,
  currency,
  payment_method,
  status
) VALUES (
  1, -- Use the ID from creator insert above
  'supporter@example.com',
  50.00,
  'USD',
  'stripe',
  'completed'
)
RETURNING *;
```

---

## 🆘 Troubleshooting

### Connection Issues from Railway

**Problem**: Backend can't connect to Supabase

**Solutions**:
1. Check environment variables in Railway:
   ```
   SUPABASE_URL=https://htugrxwhoojenhooaohk.supabase.co
   SUPABASE_KEY=your-anon-key
   ```

2. Verify Supabase project is active (not paused)

3. Check IP restrictions in Supabase (Settings → Database → Network Restrictions)

### API Key Issues

**Problem**: "Invalid API key" errors

**Solution**:
1. Go to Supabase Settings → API
2. Copy the correct key:
   - Use **anon/public** key for client-side
   - Use **service_role** key for server-side
3. Update Railway environment variables

---

## 💡 Quick Tips

1. **Use Table View**: Easiest way to see and edit data
2. **SQL Editor is Powerful**: Can run any PostgreSQL query
3. **Enable Replication**: For real-time features (Settings → Database → Replication)
4. **Backups**: Automatic daily backups on paid plans
5. **Monitor Usage**: Settings → Usage to track API calls and storage

---

## 📚 Resources

- Supabase Docs: https://supabase.com/docs
- SQL Tutorial: https://supabase.com/docs/guides/database
- JavaScript Client: https://supabase.com/docs/reference/javascript
- RLS Guide: https://supabase.com/docs/guides/auth/row-level-security

---

**Your Project Dashboard**: https://supabase.com/dashboard/project/htugrxwhoojenhooaohk
