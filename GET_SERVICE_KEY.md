# How to Get Your Supabase Service Key

## You Need TWO Different Keys:

### 1. ✅ Publishable Key (You Already Have This)
**Format:** `sb_publishable_...`
**Your Key:** `sb_publishable_yrmks0E2VZmVLxEojI-92Q_Cn6XaJQf`
**Used In:** Frontend (already in frontend/.env)
**Safe to share:** Yes, can be public

### 2. ❌ Service Key (You NEED This Now)
**Format:** Long JWT token starting with `eyJhbGci...` OR `sb_secret_...`
**Used In:** Backend (needed in backend/.env)
**Safe to share:** NO! Keep secret!

---

## Where to Find Your Service Key:

**Step-by-step:**

1. **Go to:** https://supabase.com/dashboard/project/htugrxwhoojenhooaohk/settings/api

2. **Scroll down to "Project API keys"**

3. **You'll see TWO keys listed:**
   ```
   anon / public
   ├── Key: sb_publishable_... ✅ (you have this)

   service_role
   ├── Key: [Hidden] ❌ (you need this!)
   ```

4. **Click "Reveal" next to "service_role"**

5. **Copy the ENTIRE key** - it will be VERY long

---

## What It Looks Like:

### ❌ WRONG (Publishable - you sent this):
```
sb_publishable_yrmks0E2VZmVLxEojI-92Q_Cn6XaJQf
```

### ✅ RIGHT (Service Key - looks like this):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0dWdyeHdob29qZW5ob29hb2hrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTYxNjE2MTYxNiwiZXhwIjoxOTMxNzM3NjE2fQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
(Much longer, starts with `eyJ`)

OR possibly:
```
sb_secret_xxxxxxxxxxxxxxxxxxxx
```

---

## Once You Have It:

Paste it into `backend/.env` on line 9:

```env
SUPABASE_SERVICE_KEY=eyJhbGci... # paste the LONG key here
```

Then I can start your servers!
