# 🔥 Firebase Backend Setup Guide

## ✨ What Changed

Your backend is now **Firebase-based** (serverless)!

### New Architecture:
- ✅ **Firebase Cloud Functions** - API endpoints (replaces Express server)
- ✅ **Firebase Firestore** - NoSQL database (replaces SQLite)
- ✅ **Firebase Storage** - PDF file storage (replaces local filesystem)
- ✅ **Auto-Scaling** - Handles any traffic automatically
- ✅ **No Server Management** - Firebase handles everything

---

## 🚀 Quick Setup (5 Steps)

### Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Step 2: Login to Firebase

```bash
firebase login
```

This will open your browser to sign in with Google.

### Step 3: Create Firebase Project

1. Go to https://console.firebase.google.com/
2. Click **"Add Project"**
3. Name it: `certificate-generator` (or your choice)
4. Disable Google Analytics (optional)
5. Click **"Create Project"**

### Step 4: Initialize Firebase in Your Project

```bash
cd firebase-backend
firebase init
```

**Select:**
- ☑️  Firestore
- ☑️  Functions
- ☑️  Storage
- ☑️  Hosting (optional)

**Answer the questions:**
- Use existing project: Select your project
- Firestore rules: `firestore.rules`
- Firestore indexes: `firestore.indexes.json`
- Functions language: JavaScript
- ESLint: No
- Install dependencies: Yes
- Storage rules: `storage.rules`
- Public directory: `../dist` (for hosting)

### Step 5: Install Function Dependencies

```bash
cd functions
npm install
cd ..
```

---

## 🔧 Configure Twilio (WhatsApp)

### Set Twilio Credentials

```bash
firebase functions:config:set \
  twilio.account_sid="YOUR_ACCOUNT_SID" \
  twilio.auth_token="YOUR_AUTH_TOKEN" \
  twilio.whatsapp_number="whatsapp:+14155238886"
```

**Note:** Replace with your actual Twilio credentials from https://console.twilio.com/

### Verify Config

```bash
firebase functions:config:get
```

---

## 🎯 Deploy to Firebase

### Deploy Everything

```bash
firebase deploy
```

This deploys:
- Cloud Functions (API)
- Firestore rules
- Storage rules
- Hosting (optional)

### Deploy Only Functions

```bash
firebase deploy --only functions
```

### Deploy Only Database Rules

```bash
firebase deploy --only firestore,storage
```

---

## 🧪 Test Locally (Emulators)

### Start Firebase Emulators

```bash
firebase emulators:start
```

This starts:
- Functions: http://localhost:5001
- Firestore: http://localhost:4000 (UI)
- Storage: http://localhost:9199
- Emulator UI: http://localhost:4000

### Update Frontend to Use Emulator

Edit `src/services/api.js`:

```javascript
const API_BASE_URL = 'http://localhost:5001/YOUR_PROJECT_ID/us-central1/api';
```

Replace `YOUR_PROJECT_ID` with your Firebase project ID.

---

## 📡 Get Your API URL

### After Deployment

```bash
firebase functions:list
```

Your API URL will be:
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api
```

### Update Frontend

Edit `src/services/api.js`:

```javascript
const API_BASE_URL = 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api';
```

Or create `.env`:
```env
VITE_API_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api
```

---

## 📊 Firebase Console Access

### Firestore Database
https://console.firebase.google.com/project/YOUR_PROJECT/firestore

View/edit all certificates here.

### Storage
https://console.firebase.google.com/project/YOUR_PROJECT/storage

View all generated PDF files.

### Functions
https://console.firebase.google.com/project/YOUR_PROJECT/functions

Monitor function executions, logs, and errors.

---

## 🔌 API Endpoints (Same as Before)

Your API endpoints stay the same, just new base URL:

```
GET    /health                           - Health check
GET    /certificates                     - Get all certificates
POST   /certificates                     - Create certificate
GET    /certificates/:id                 - Get one
PUT    /certificates/:id                 - Update
DELETE /certificates/:id                 - Delete
POST   /certificates/:id/send-whatsapp   - Send WhatsApp
GET    /certificates/stats               - Get statistics
```

**Full URL Example:**
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api/certificates
```

---

## 📦 Firestore Data Structure

### `certificates` Collection

Each document has:
```json
{
  "id": "uuid",
  "recipient_name": "string",
  "certificate_number": "string",
  "award_rera_number": "string | null",
  "description": "string | null",
  "phone_number": "string | null",
  "email": "string | null",
  "pdf_url": "https://storage.googleapis.com/...",
  "whatsapp_sent": false,
  "whatsapp_sent_at": null,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

---

## 💰 Firebase Pricing

### Free Tier (Spark Plan)

**Firestore:**
- 1 GB storage
- 50k reads/day
- 20k writes/day

**Storage:**
- 5 GB storage
- 1 GB download/day

**Functions:**
- 2M invocations/month
- 400k GB-seconds/month

**This is MORE than enough for testing!**

### Paid Tier (Blaze Plan)

- Pay as you go
- Still has free tier included
- Very affordable for small/medium apps

---

## 🛠️ Useful Firebase Commands

```bash
# View logs
firebase functions:log

# View config
firebase functions:config:get

# Delete function
firebase functions:delete FUNCTION_NAME

# Open Firebase console
firebase open

# List all projects
firebase projects:list

# Switch project
firebase use PROJECT_NAME
```

---

## 🔄 Development Workflow

### Local Development

```bash
# Terminal 1 - Firebase Emulators
cd firebase-backend
firebase emulators:start

# Terminal 2 - Frontend
cd ..
npm run dev
```

### Update API URL for Local Testing

```javascript
// src/services/api.js
const API_BASE_URL = 'http://localhost:5001/YOUR_PROJECT_ID/us-central1/api';
```

---

## 📝 Update Frontend for Firebase

### Option 1: Environment Variable

Create/update `.env`:
```env
VITE_API_URL=https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api
```

### Option 2: Direct Update

Edit `src/services/api.js`:
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/api';
```

---

## 🎯 Deployment Checklist

- [ ] Firebase project created
- [ ] Firebase initialized (`firebase init`)
- [ ] Functions dependencies installed
- [ ] Twilio credentials configured (optional)
- [ ] Functions deployed (`firebase deploy --only functions`)
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] API URL updated in frontend
- [ ] Frontend tested with Firebase backend

---

## 🐛 Troubleshooting

### "Firebase command not found"
```bash
npm install -g firebase-tools
```

### "Permission denied"
```bash
firebase login --reauth
```

### "Functions deployment failed"
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### "CORS errors"
CORS is already configured in `functions/index.js`. Make sure you redeploy functions.

### View Function Logs
```bash
firebase functions:log --only api
```

---

## 🚀 Next Steps

1. **Deploy to Firebase:**
   ```bash
   cd firebase-backend
   firebase deploy
   ```

2. **Get your API URL:**
   ```bash
   firebase functions:list
   ```

3. **Update frontend** with new API URL

4. **Test everything** works!

5. **Optional:** Set up Twilio for WhatsApp

---

## 📚 Resources

- **Firebase Console:** https://console.firebase.google.com/
- **Firebase Docs:** https://firebase.google.com/docs
- **Cloud Functions:** https://firebase.google.com/docs/functions
- **Firestore:** https://firebase.google.com/docs/firestore
- **Storage:** https://firebase.google.com/docs/storage

---

**🎉 Your Firebase Backend is Ready!**

The serverless architecture will scale automatically and you don't need to manage any servers!

---

**Questions?** Check the main `README.md` or Firebase documentation.
