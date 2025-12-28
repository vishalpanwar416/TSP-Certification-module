# ⚠️ Firebase Deployment Requirements

## Current Status

Your Firebase project needs to be upgraded to deploy Cloud Functions.

---

## ✅ Required Steps

### 1. Upgrade to Blaze Plan (REQUIRED)

**Why:** Cloud Functions require the Blaze (pay-as-you-go) plan.

**Don't worry about cost:**
- Free tier includes: 2M function invocations/month
- 400,000 GB-seconds of compute time/month
- 5GB storage/month
- Perfect for development and small-scale apps

**Upgrade:**
1. Go to: https://console.firebase.google.com/project/channel-partner-54334/usage/details
2. Click **"Modify Plan"** or **"Upgrade"**
3. Select **"Blaze Plan"**
4. Add billing information (credit card required)
5. Complete the upgrade

**Time:** ~2 minutes

---

### 2. Enable Firebase Storage

1. Go to: https://console.firebase.google.com/project/channel-partner-54334/storage
2. Click **"Get Started"**
3. Click **"Next"** (keep default rules)
4. Choose location (same as Firestore if you have it)
5. Click **"Done"**

**Time:** ~1 minute

---

### 3. Enable Firestore Database (if not already enabled)

1. Go to: https://console.firebase.google.com/project/channel-partner-54334/firestore
2. Click **"Create Database"**
3. Select **"Start in production mode"** (or test mode for dev)
4. Choose location (closest to you)
5. Click **"Enable"**

**Time:** ~1 minute

---

## 🚀 After Completing Requirements

Once all services are enabled:

```bash
cd firebase-backend
firebase deploy --only functions,firestore:rules,storage:rules
```

---

## 🔄 Alternative: Use Local Node.js Backend

If you don't want to upgrade to Blaze plan right now, you can continue using the local Node.js backend:

1. **Keep using local backend:**
   ```bash
   # In one terminal
   cd server
   npm start
   
   # In another terminal
   npm run dev
   ```

2. **Your `.env` is already configured:**
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

This works perfectly for development and testing!

---

## 📊 Quick Links

- **Upgrade to Blaze:** https://console.firebase.google.com/project/channel-partner-54334/usage/details
- **Enable Storage:** https://console.firebase.google.com/project/channel-partner-54334/storage
- **Enable Firestore:** https://console.firebase.google.com/project/channel-partner-54334/firestore
- **Check Status:** Run `./check-status.sh` in firebase-backend folder

---

## ✅ Checklist

- [ ] Upgraded to Blaze plan
- [ ] Enabled Firebase Storage
- [ ] Enabled Firestore Database
- [ ] Ready to deploy!

---

**Note:** The Blaze plan free tier is very generous. You'll only be charged if you exceed the free limits, which is unlikely for development and small-scale production use.

