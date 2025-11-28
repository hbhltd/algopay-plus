# 📋 Manual Migration Guide - Step by Step

**When to use this guide:** If you prefer to apply migrations manually (recommended for beginners to understand what's happening!)

---

## 🎯 Overview

You have **4 pending migrations** to apply. Each one adds new features to your database.

**Time needed:** 15-20 minutes total

---

## 🚀 Before You Start

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Click on your project: `htugrxwhoojenhooaohk`

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Keep this window open - you'll use it for all migrations

3. **Open your project folder:**
   - Navigate to: `/home/user/algopay-plus/database/migrations/`
   - You'll be copying files from here

---

## Migration 1: Shop, Storage & Social Media

### What this adds:
- **Shop items** - Creators can offer exclusive content to donors
- **Storage connections** - Connect S3, R2, Backblaze, etc.
- **Social media** - Link Twitter, Instagram, YouTube, etc.
- **Payment methods** - Track which payment methods each creator accepts
- **QR codes** - Generate QR codes for offline donations

### How to apply:

**Step 1:** In Supabase SQL Editor, click **"New Query"**

**Step 2:** Open this file on your computer:
```
/home/user/algopay-plus/database/migrations/008_add_shop_storage_social.sql
```

**Step 3:** Select ALL the text (Ctrl+A or Cmd+A), then copy it (Ctrl+C or Cmd+C)

**Step 4:** Paste into Supabase SQL Editor (Ctrl+V or Cmd+V)

**Step 5:** Click the **"Run"** button (bottom right corner)

**Step 6:** Wait 5-10 seconds...

✅ **Success looks like:**
```
Success. No rows returned
```

❌ **If you see an error:**
- If it says "already exists" → That's OK! It means you already ran this migration
- Any other error → Copy the error message and ask for help

**Step 7:** Verify it worked
- In Supabase, go to "Table Editor" (left sidebar)
- You should see these new tables:
  - `shop_items`
  - `shop_access_tokens`
  - `shop_purchases`
  - `creator_storage`
  - `social_media_connections`
  - `creator_payment_methods`
  - `donation_qr_codes`

---

## Migration 2: Community Subscribers

### What this adds:
- **Community members** - Email-only subscribers (no wallet required)
- **GDPR compliance** - Consent tracking and data privacy
- **Subscriber management** - Import, export, manage subscribers

### How to apply:

**Step 1:** Click **"New Query"** in Supabase SQL Editor

**Step 2:** Open this file:
```
/home/user/algopay-plus/database/migrations/009_add_community_subscribers.sql
```

**Step 3:** Copy ALL the text

**Step 4:** Paste into Supabase SQL Editor

**Step 5:** Click **"Run"**

✅ **Success!** You should see: "Success. No rows returned"

**Step 6:** Verify it worked
- Go to "Table Editor"
- You should see new table: `community_subscribers`

---

## Migration 3: Newsletter System

### What this adds:
- **Newsletter campaigns** - Send email newsletters to your community
- **Email templates** - Create reusable email templates
- **Send tracking** - See who opened/clicked your emails
- **Campaign analytics** - Track newsletter performance

### How to apply:

**Step 1:** Click **"New Query"**

**Step 2:** Open this file:
```
/home/user/algopay-plus/database/migrations/010_add_newsletter_system.sql
```

**Step 3:** Copy ALL the text

**Step 4:** Paste into Supabase SQL Editor

**Step 5:** Click **"Run"**

✅ **Success!** You should see: "Success. No rows returned"

**Step 6:** Verify it worked
- Go to "Table Editor"
- You should see new tables:
  - `newsletter_campaigns`
  - `newsletter_sends`

---

## Migration 4: QR Code Scan Tracking

### What this adds:
- **QR scan tracking** - Track when people scan QR codes
- **Analytics function** - Database function to record scans

### How to apply:

**Step 1:** Click **"New Query"**

**Step 2:** Open this file:
```
/home/user/algopay-plus/database/migrations/011_add_qr_scan_function.sql
```

**Step 3:** Copy ALL the text

**Step 4:** Paste into Supabase SQL Editor

**Step 5:** Click **"Run"**

✅ **Success!** You should see: "Success. No rows returned"

**Step 6:** Verify it worked
- Go to "Database" → "Functions" in Supabase
- You should see new function: `record_qr_scan`

---

## ✅ Verification Checklist

After applying all migrations, verify everything worked:

### Check Tables:
Go to "Table Editor" in Supabase and confirm you see:

**From Migration 008:**
- [ ] `page_builder_sessions`
- [ ] `shop_items`
- [ ] `shop_access_tokens`
- [ ] `shop_purchases`
- [ ] `creator_storage`
- [ ] `social_media_connections`
- [ ] `creator_payment_methods`
- [ ] `donation_qr_codes`

**From Migration 009:**
- [ ] `community_subscribers`

**From Migration 010:**
- [ ] `newsletter_campaigns`
- [ ] `newsletter_sends`

### Check Functions:
Go to "Database" → "Functions" and confirm:

**From Migration 011:**
- [ ] `record_qr_scan`

**From Migration 008:**
- [ ] `check_shop_access`
- [ ] `generate_shop_token`

---

## 🎉 You're Done!

All migrations have been applied! Your database now has:

✅ **8 new tables** for shop, community, and newsletters
✅ **3 new functions** for QR tracking and shop access
✅ **Enhanced donations table** with Boost vs Wings tracking
✅ **Row-level security** on all new tables

---

## 🚨 Troubleshooting

### "Already exists" error
**This is OK!** It means the migration was already applied.
Just move on to the next migration.

### "Permission denied" error
**Fix:** Make sure you're using your `service_role` key, not the `anon` key.

### "Syntax error" error
**Fix:** Make sure you copied the ENTIRE file contents. Sometimes copying from certain text editors can miss parts.

### Tables don't show up
**Fix:**
1. Refresh the page (F5)
2. Click "Table Editor" again
3. Check if you're looking at the right project (`htugrxwhoojenhooaohk`)

---

## 📞 Need Help?

If something isn't working:

1. **Check the error message** - It usually tells you what's wrong
2. **Screenshot the error** - So we can see exactly what happened
3. **Note which migration failed** - (008, 009, 010, or 011)
4. **Ask for help!** - I'm here to guide you

---

## 🎯 Next Steps

After all migrations are applied:

1. **Start your servers** - See BEGINNER_SETUP_GUIDE.md Phase 3
2. **Test the features** - Try creating shop items, sending newsletters
3. **Add suspension notice** - We'll do this together next!

---

**You've got this! 🚀**
