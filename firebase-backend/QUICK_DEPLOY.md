# ⚡ Quick Deploy - Firebase Backend

## 🚀 Fast Track (5 Minutes)

### 1. Install Dependencies
```bash
cd firebase-backend/functions
npm install
cd ../..
```

### 2. Enable Services (One-time setup)

**Firestore:**
- https://console.firebase.google.com/project/channel-partner-54334/firestore
- Click "Create Database" → Production mode → Enable

**Storage:**
- https://console.firebase.google.com/project/channel-partner-54334/storage
- Click "Get Started" → Next → Done

**Functions:**
- https://console.firebase.google.com/project/channel-partner-54334/functions
- May need to upgrade to Blaze plan (free tier available)

### 3. Deploy
```bash
cd firebase-backend
firebase login  # If not already logged in
firebase deploy --only functions,firestore:rules,storage:rules
```

### 4. Get Your API URL

After deployment, you'll see:
```
Function URL: https://us-central1-channel-partner-54334.cloudfunctions.net/api
```

### 5. Update Frontend

Edit `.env` in project root:
```env
VITE_API_URL=https://us-central1-channel-partner-54334.cloudfunctions.net/api
```

### 6. Test
```bash
# Restart frontend
npm run dev

# Test in browser
# Try creating a certificate!
```

---

## ✅ Done!

Your Firebase backend is now live! 🎉

For detailed instructions, see `DEPLOY.md`

