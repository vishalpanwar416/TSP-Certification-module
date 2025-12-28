# 🔥 Firebase Setup - Enable Required APIs

## ⚠️ Current Issue

Your Firebase project needs some APIs enabled. Here's how to fix it:

---

## 🔐 Google Authentication Troubleshooting

### Common Issues and Solutions

#### Issue 1: "Popup blocked" or "Popup closed by user"
**Solution:** The code now automatically falls back to redirect method if popup is blocked.

#### Issue 2: "Unauthorized domain"
**Solution:** Add your domain to Firebase Console:
1. Go to: https://console.firebase.google.com/project/channel-partner-54334/authentication/settings
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Add:
   - `localhost` (for local development)
   - Your production domain (e.g., `yourdomain.com`)
   - Your Vercel domain (if deployed)

#### Issue 3: "Operation not allowed"
**Solution:** Enable Google Sign-In provider:
1. Go to: https://console.firebase.google.com/project/channel-partner-54334/authentication/providers
2. Click on **"Google"**
3. Toggle **"Enable"** to ON
4. Enter your **Support email** (required)
5. Click **"Save"**

#### Issue 4: OAuth consent screen not configured
**Solution:** Configure OAuth consent screen:
1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=channel-partner-54334
2. Fill in required fields:
   - App name
   - User support email
   - Developer contact email
3. Add scopes: `email`, `profile`, `openid`
4. Save and continue

#### Issue 5: API not enabled
**Solution:** Enable Google+ API:
1. Go to: https://console.cloud.google.com/apis/library?project=channel-partner-54334
2. Search for "Google+ API" or "Identity Toolkit API"
3. Click **"Enable"**

### Testing Google Authentication

1. **Check browser console** for specific error messages
2. **Try in incognito mode** to rule out extension interference
3. **Check popup blocker settings** in your browser
4. **Verify Firebase config** matches your project

### What Was Fixed

✅ Added automatic fallback from popup to redirect method
✅ Added better error handling with user-friendly messages
✅ Added proper Google Auth Provider configuration
✅ Added redirect result handling
✅ Added scope configuration (email, profile)

---

---

## 🔧 Step-by-Step Fix

### Step 1: Go to Firebase Console

Open: https://console.firebase.google.com/project/channel-partner-54334/overview

### Step 2: Enable Required Services

#### Enable Cloud Functions:
1. Click on **"Build"** → **"Functions"**
2. Click **"Get Started"**
3. Click **"Upgrade Project"** (Blaze plan required for Cloud Functions)
   - Don't worry! It has a generous free tier
   - You'll only pay if you exceed free limits

#### Enable Firestore:
1. Click on **"Build"** → **"Firestore Database"**
2. Click **"Create Database"**
3. Select **"Start in production mode"**
4. Choose location (closest to you)
5. Click **"Enable"**

#### Enable Storage:
1. Click on **"Build"** → **"Storage"**
2. Click **"Get Started"**
3. Click **"Next"** (keep default rules for now)
4. Choose location (same as Firestore)
5. Click **"Done"**

### Step 3: Upgrade to Blaze Plan (Required for Cloud Functions)

1. Go to: https://console.firebase.google.com/project/channel-partner-54334/usage
2. Click **"Modify Plan"**
3. Select **"Blaze Plan"** (Pay as you go)
4. Add billing information

**Don't worry about cost!**
- Free tier includes: 2M function calls/month
- Perfect for development and small-scale apps
- You'll only be charged if you exceed free limits

### Step 4: Deploy Again

After enabling all services:

```bash
cd firebase-backend
firebase deploy --only functions,firestore,storage
```

---

## 🎯 Alternative: Use Node.js Backend (Already Running!)

Your **Node.js backend is LIVE** and ready to use!

```
✅ Running on: http://localhost:5000
✅ All features working
✅ No deployment needed
```

You can use this while setting up Firebase!

---

## 💡 Quick Decision Guide

### Use Node.js Backend if:
- ✅ You want to test NOW
- ✅ You're developing locally
- ✅ You don't want to set up billing yet

### Use Firebase Backend if:
- ✅ You want serverless deployment
- ✅ You need auto-scaling
- ✅ You want global distribution
- ✅ You're ready to deploy to production

---

## 🚀 Current Status

**Backend Options:**
1. **Node.js** - ✅ RUNNING on http://localhost:5000
2. **Firebase** - ⏳ Needs API enablement

**Frontend:**
- ⏳ Needs file watcher fix OR use simple test HTML

**What's Working:**
- ✅ Certificate generation
- ✅ PDF creation
- ✅ Database (SQLite for Node.js)
- ✅ All API endpoints

---

##  Next Steps

### Option 1: Fix Frontend and Use Node.js Backend
```bash
# Fix file watcher limit (enter your password)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p

# Start frontend
npm run dev

# Open: http://localhost:5173
```

### Option 2: Enable Firebase APIs and Deploy
Follow the steps above, then:
```bash
cd firebase-backend
firebase deploy
```

### Option 3: Use Simple Test Page (I can create)
I can create a simple HTML page to test the backend right now!

---

**Which would you like to do?** 🚀
