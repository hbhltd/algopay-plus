# Apply Migration 008: Shop, Storage, and Social Features

## Option 1: Run in Supabase SQL Editor (Recommended for Quick Setup)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/htugrxwhoojenhooaohk
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `/database/migrations/008_add_shop_storage_social.sql`
5. Paste into the SQL editor
6. Click "Run" or press Cmd/Ctrl + Enter

## Option 2: Run via Command Line (Requires DATABASE_URL)

1. Get your Supabase database connection string:
   - Go to Project Settings > Database
   - Copy the "Connection string" under "Connection pooling"
   - It should look like: `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

2. Add to `/backend/.env`:
   ```
   DATABASE_URL=your_connection_string_here
   ```

3. Run the migration:
   ```bash
   cd backend
   npm run migrate
   ```

## What This Migration Adds

✅ **Page Builder Sessions** - Anonymous page building before purchase
✅ **Donor Shop** - Exclusive items/content for donors
✅ **Creator Storage** - Connect S3/R2/B2/etc buckets
✅ **Social Media Connections** - Link social accounts
✅ **Payment Methods Table** - Track which payment methods creators accept
✅ **QR Codes** - Generate QR codes for offline donations
✅ **Boost vs Wings** - One-time vs recurring donation tracking

## Verification

After running the migration, verify it worked by running this query in SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'shop_items',
    'creator_storage',
    'social_media_connections',
    'creator_payment_methods',
    'donation_qr_codes'
  )
ORDER BY table_name;
```

You should see all 5 tables listed.
