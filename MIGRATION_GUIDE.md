# Database Migration Guide

## 🚀 Quick Start: Apply Pending Migrations

Your database has pending migrations that need to be applied to enable new features like:
- Donor Shop (exclusive items for supporters)
- Cloud Storage Connections (S3, R2, B2, etc.)
- Social Media Integration
- Multiple Payment Methods
- QR Code Generation
- Boost vs Wings (one-time vs recurring donations)

### Method 1: Supabase SQL Editor (⚡ Fastest - Recommended)

1. **Open Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/htugrxwhoojenhooaohk
   ```

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Get the Migration SQL**
   ```bash
   node database/print-migration.js
   ```
   Or manually open: `/database/migrations/008_add_shop_storage_social.sql`

4. **Execute**
   - Copy the SQL from the migration file
   - Paste into the SQL Editor
   - Click "Run" (or press `Cmd/Ctrl + Enter`)

5. **Verify** (Run this query)
   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'shop_items',
       'creator_storage',
       'social_media_connections',
       'creator_payment_methods',
       'donation_qr_codes',
       'page_builder_sessions'
     )
   ORDER BY table_name;
   ```
   You should see 6 tables.

### Method 2: Command Line (Requires Setup)

1. **Get Database Connection String**
   - Go to Supabase Dashboard > Project Settings > Database
   - Under "Connection pooling", copy the connection string
   - Format: `postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - You'll need to replace `[PASSWORD]` with your actual database password

2. **Add to Environment**
   ```bash
   echo "DATABASE_URL=your_connection_string_here" >> backend/.env
   ```

3. **Run Migrations**
   ```bash
   cd backend
   npm run migrate
   ```

## 📋 Available Migrations

| Migration | Description | Status |
|-----------|-------------|--------|
| 001 | Enhanced subscriptions | ✅ Applied |
| 002 | Discord integration | ✅ Applied |
| 003 | Zapier integration | ✅ Applied |
| 004 | QuickBooks integration | ✅ Applied |
| 005 | Social media integration | ✅ Applied |
| 006 | Digital products | ✅ Applied |
| 007 | Account status management | ✅ Applied |
| **008** | **Shop/Storage/Social** | ⏳ **Pending** |

## 🔍 What Migration 008 Adds

### New Tables

1. **`page_builder_sessions`** - Anonymous page building sessions
   - Allows users to build their page before purchasing
   - 24-hour session expiry
   - Converts to creator account on payment

2. **`shop_items`** - Donor rewards/exclusive content
   - Digital products, exclusive access, perks
   - Stock management
   - Donor-only or Wings-only items
   - Cloud storage integration

3. **`shop_access_tokens`** - Access control for shop items
   - Generated after donations
   - Boost (1 year expiry) or Wings (unlimited)
   - Tracks donation value for tiered access

4. **`shop_purchases`** - Purchase history
   - Tracks what donors have claimed
   - Download tracking and limits
   - Temporary signed URLs (24h)

5. **`creator_storage`** - Cloud storage connections
   - S3, Cloudflare R2, Backblaze B2
   - DigitalOcean Spaces, Google Cloud Storage
   - Encrypted credentials (AES-256-GCM)
   - Primary storage designation

6. **`social_media_connections`** - Social accounts
   - Twitter/X, Instagram, YouTube, TikTok
   - Facebook, LinkedIn, Twitch, Discord
   - Auto-posting capabilities
   - OAuth token management

7. **`creator_payment_methods`** - Payment options
   - Stripe, PayPal, Pera Wallet, Lightning
   - Circle (USDC), Noah, Cash App
   - Encrypted credentials
   - Per-creator customization

8. **`donation_qr_codes`** - Offline payments
   - Printable QR codes
   - Preset or donor-choice amounts
   - Scan tracking
   - Expiration dates

### New Columns on Existing Tables

**`donations` table:**
- `donation_type` - 'boost' or 'wings'
- `is_recurring` - Boolean flag
- `recurring_subscription_id` - External subscription ID
- `recurring_frequency` - 'monthly' or 'yearly'

## 🔒 Security Features

All migrations include:
- Row Level Security (RLS) policies
- Encrypted credential storage
- GDPR-compliant data handling
- Audit logging
- Access control

## 🛠️ Troubleshooting

### "relation already exists" error
This means the table is already created. You can either:
- Skip that migration
- Or modify the SQL to use `CREATE TABLE IF NOT EXISTS` (already included in migration 008)

### Permission denied
Make sure you're using the Service Role key, not the Anonymous key.

### Connection timeout
- Check your internet connection
- Verify the Supabase project is active
- Try using the SQL Editor method instead

## 📚 Next Steps

After applying migrations:
1. ✅ Test the new tables in SQL Editor
2. ✅ Review the new API endpoints that use these tables
3. ✅ Update your frontend to use new features
4. ✅ Configure storage providers (S3, etc.)
5. ✅ Set up payment method integrations

## 🆘 Need Help?

- Check migration SQL: `node database/print-migration.js 008_add_shop_storage_social.sql`
- View all migrations: `ls database/migrations/`
- Supabase docs: https://supabase.com/docs/guides/database
