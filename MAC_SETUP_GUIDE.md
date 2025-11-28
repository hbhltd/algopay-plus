# 🍎 Mac Setup Guide for Supportly

Hey! You're on a **Mac**, so the paths are different from the main guide. Follow these steps instead.

---

## 📍 Step 1: Find Where Your Repository Is

The repository is **NOT** at `/home/user/algopay-plus` (that's Linux).

On your Mac, it's somewhere under `/Users/hbhltd./`

**To find it, open Terminal and run:**

```bash
cd ~
find . -name "algopay-plus" -type d 2>/dev/null
```

This will show you something like:
```
./Documents/algopay-plus
```

or

```
./Desktop/algopay-plus
```

**Write down the location!** Let's say it's at `~/Documents/algopay-plus`

---

## 🔑 Step 2: Add Your Stripe SECRET Key

I've already added your **publishable key** (`pk_test_...`), but you also need your **secret key**.

**Get your Stripe secret key:**

1. Go to: https://dashboard.stripe.com/test/apikeys
2. Look for **Secret key** (it starts with `sk_test_...`)
3. Click "Reveal test key"
4. Copy it

**Now edit your backend .env file:**

On your Mac, the file is at:
```
<YOUR_REPO_LOCATION>/backend/.env
```

For example, if your repo is at `~/Documents/algopay-plus`:
```bash
nano ~/Documents/algopay-plus/backend/.env
```

**Find this line:**
```
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

**Replace it with your actual secret key:**
```
STRIPE_SECRET_KEY=sk_test_51SYVem1dwCpEvNtP...your actual key
```

Save with `Ctrl+O`, then `Enter`, then `Ctrl+X` to exit.

---

## ✅ Step 3: Verify Your Configuration

**Check backend .env has these values:**

```bash
cat ~/Documents/algopay-plus/backend/.env | grep STRIPE
```

You should see:
```
STRIPE_SECRET_KEY=sk_test_51SYVem... (your actual secret key)
STRIPE_PUBLISHABLE_KEY=pk_test_51SYVem1dwCpEvNtPHjYm175xEPiPN2o7WWK6Rgdxqjhd9jKTzuFLhSMv2HitGGufYCPIaR7t9H9Bhr6lJBlMnaVu00hwPipWT3
```

**Check frontend .env:**

```bash
cat ~/Documents/algopay-plus/frontend/.env | grep STRIPE
```

You should see:
```
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51SYVem1dwCpEvNtPHjYm175xEPiPN2o7WWK6Rgdxqjhd9jKTzuFLhSMv2HitGGufYCPIaR7t9H9Bhr6lJBlMnaVu00hwPipWT3
```

---

## 🚀 Step 4: Install and Start the Servers

**Replace `~/Documents/algopay-plus` with YOUR actual path!**

### Install Backend Packages:

```bash
cd ~/Documents/algopay-plus/backend
npm install
```

Wait for it to finish (2-3 minutes).

### Install Frontend Packages:

```bash
cd ~/Documents/algopay-plus/frontend
npm install
```

Wait for it to finish (3-5 minutes).

### Start Backend Server (Terminal 1):

```bash
cd ~/Documents/algopay-plus/backend
npm run dev
```

✅ Should see:
```
🚀 Supportly backend running on http://localhost:3001
```

**Leave this terminal open!**

### Start Frontend Server (Terminal 2):

Open a NEW terminal window and run:

```bash
cd ~/Documents/algopay-plus/frontend
npm start
```

✅ Should see:
```
Compiled successfully!
Local: http://localhost:3000
```

**Leave this terminal open too!**

---

## 🧪 Step 5: Test It Works

Open your browser and go to:

**Frontend:** http://localhost:3000

**Backend health:** http://localhost:3001/health

You should see the Supportly app!

---

## 🆘 What If Commands Don't Work?

### Error: "cd: no such file or directory"

This means you're using the wrong path. Use `pwd` to see where you are:

```bash
pwd
```

Then navigate correctly:

```bash
cd ~/Documents/algopay-plus  # or wherever YOUR repo is
```

### Error: "npm command not found"

You need to install Node.js first:

1. Go to: https://nodejs.org/
2. Download the **LTS version** (left button)
3. Install it
4. Close and reopen Terminal
5. Test: `node --version` (should show v18 or v20)

### Error: "Cannot find module"

You forgot to run `npm install`. Go to the directory and run:

```bash
npm install
```

---

## 📝 Quick Reference - Mac vs Linux Paths

| Guide Says (Linux) | Your Mac Path |
|-------------------|---------------|
| `/home/user/algopay-plus` | `~/Documents/algopay-plus` (or wherever you cloned it) |
| `/home/user/algopay-plus/backend` | `~/Documents/algopay-plus/backend` |
| `/home/user/algopay-plus/frontend` | `~/Documents/algopay-plus/frontend` |

**Remember:** `~` is shorthand for `/Users/hbhltd./`

---

## ✅ Current Status

**What I've already configured for you:**

✅ Stripe publishable key added to backend/.env
✅ Stripe publishable key added to frontend/.env
✅ Supabase configuration (already set up)
✅ Algorand testnet configuration

**What you need to do:**

⏳ Find your repository location on your Mac
⏳ Add your Stripe SECRET key to backend/.env
⏳ Run `npm install` in backend and frontend
⏳ Start both servers

---

## 🎯 Next Steps

1. **Find your repo location** (Step 1 above)
2. **Add Stripe secret key** (Step 2 above)
3. **Install packages** (Step 4 above)
4. **Start servers** (Step 4 above)
5. **Test it works** (Step 5 above)

Then tell me it's working, and I'll help you with the next features!

---

**Need help?** Just ask! 🚀
