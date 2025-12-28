# 🔥 Firebase Backend - Quick Start

## 🚀 One-Command Setup

```bash
# 1. Go to Firebase backend folder
cd firebase-backend

# 2. Login to Firebase
firebase login

# 3. Create a new Firebase project at:
# https://console.firebase.google.com/

# 4. Initialize Firebase (select Firestore, Functions, Storage)
firebase init

# 5. Install dependencies
cd functions && npm install && cd ..

# 6. Deploy to Firebase
firebase deploy
```

---

## 📡 Get Your API URL

After deploying, run:

```bash
firebase functions:list
```

**Your API URL will be:**
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api
```

---

## 🧪 Test Locally First

```bash
# Start Firebase emulators
firebase emulators:start
```

**Emulator URLs:**
- Functions: `http://localhost:5001/YOUR_PROJECT_ID/us-central1/api`
- Firestore UI: `http://localhost:4000`

---

## 🔧 Configure WhatsApp (Optional)

```bash
firebase functions:config:set \
  twilio.account_sid="YOUR_SID" \
  twilio.auth_token="YOUR_TOKEN"
```

---

## 📱 Update Frontend

Edit `.env`:
```env
VITE_API_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api
```

Or for local testing:
```env
VITE_API_URL=http://localhost:5001/YOUR_PROJECT_ID/us-central1/api
```

---

## ✅ Done!

Your Firebase backend is now live and accessible from anywhere!

**More details:** See `FIREBASE_SETUP.md`

---

## 🎯 Common Commands

```bash
# Deploy
firebase deploy

# View logs
firebase functions:log

# Open Firebase console
firebase open

# List functions
firebase functions:list
```

---

**Need Help?** Check `FIREBASE_SETUP.md` for detailed instructions!
