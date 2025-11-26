# 🚀 AlgoPay Plus - Setup Instructions

**Get started in 3 commands!**

---

## ⚡ Quick Setup (2 Minutes)

### Step 1: Clone the Repository

```bash
git clone https://github.com/hbhltd/algopay-plus.git
cd algopay-plus
```

### Step 2: Run Automated Setup

```bash
./setup.sh
```

This will:
- ✅ Check Node.js and npm
- ✅ Create .env files
- ✅ Install all dependencies (backend + frontend)
- ✅ Set everything up automatically

### Step 3: Start Testing

```bash
cd backend
npm run dev
```

**That's it! Your backend is running!** 🎉

---

## 🧪 Test It Works

Open a new terminal and run:

```bash
./test-health.sh
```

You should see:
```
✅ Backend is running!
✅ Health check returns 200 OK
```

---

## 📱 Start Frontend (Optional)

In another terminal:

```bash
cd frontend
npm start
```

Browser opens to: **http://localhost:3000**

---

## 📚 Documentation

- **START_HERE.md** - Quick reference
- **QUICKSTART.md** - Full 10-minute guide
- **TESTING_GUIDE.md** - Complete testing scenarios
- **README.md** - Project documentation

---

## 💡 What You Can Test Immediately

✅ Backend server
✅ Health endpoints
✅ Frontend UI
✅ Email system (console mode)
✅ API structure

**Optional (5 min):** Set up Supabase for full database features
→ See QUICKSTART.md for instructions

---

## 🆘 Troubleshooting

**Setup script won't run?**
```bash
chmod +x setup.sh
./setup.sh
```

**Need help?**
```bash
cat START_HERE.md
```

---

**Ready? Just run:**
```bash
./setup.sh
```

Then:
```bash
cd backend
npm run dev
```

🚀 **Happy testing!**
