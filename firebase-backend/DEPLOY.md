# 🚀 Firebase Backend Deployment Guide

Complete guide to deploy your Certificate Generator backend to Firebase.

---

## 📋 Prerequisites

1. **Firebase CLI installed**
   ```bash
   npm install -g firebase-tools
   ```

2. **Logged in to Firebase**
   ```bash
   firebase login
   ```

3. **Firebase Project Created**
   - Project ID: `channel-partner-54334`
   - Already configured in your project

---

## 🔧 Step 1: Install Dependencies

```bash
cd firebase-backend/functions
npm install
cd ../..
```

---

## 🔐 Step 2: Configure Environment Variables

### Option A: Twilio (WhatsApp) - Optional

If you want WhatsApp functionality:

```bash
firebase functions:config:set \
  twilio.account_sid="YOUR_TWILIO_ACCOUNT_SID" \
  twilio.auth_token="YOUR_TWILIO_AUTH_TOKEN" \
  twilio.whatsapp_number="whatsapp:+14155238886"
```

Get your Twilio credentials from: https://console.twilio.com/

### Option B: Email Service - Optional

If you want email functionality:

```bash
firebase functions:config:set \
  email.user="your-email@gmail.com" \
  email.pass="your-app-password" \
  email.service="gmail" \
  email.from="your-email@gmail.com"
```

**Note:** For Gmail, you need to use an [App Password](https://support.google.com/accounts/answer/185833), not your regular password.

### Verify Configuration

```bash
firebase functions:config:get
```

---

## 🗄️ Step 3: Enable Required Services

### Enable Firestore Database

1. Go to: https://console.firebase.google.com/project/channel-partner-54334/firestore
2. Click **"Create Database"**
3. Select **"Start in production mode"** (or test mode for development)
4. Choose location (closest to you)
5. Click **"Enable"**

### Enable Storage

1. Go to: https://console.firebase.google.com/project/channel-partner-54334/storage
2. Click **"Get Started"**
3. Click **"Next"** (keep default rules for now)
4. Choose location (same as Firestore)
5. Click **"Done"**

### Enable Cloud Functions

1. Go to: https://console.firebase.google.com/project/channel-partner-54334/functions
2. If prompted, click **"Get Started"**
3. You may need to upgrade to **Blaze Plan** (Pay as you go)
   - Don't worry! It has a generous free tier
   - You'll only pay if you exceed free limits

---

## 📦 Step 4: Deploy Functions

```bash
cd firebase-backend
firebase deploy --only functions
```

This will:
- Install dependencies
- Build the functions
- Deploy to Firebase
- Give you a URL like: `https://us-central1-channel-partner-54334.cloudfunctions.net/api`

**Expected output:**
```
✔  functions[api(us-central1)]: Successful create operation.
Function URL: https://us-central1-channel-partner-54334.cloudfunctions.net/api
```

---

## 🗃️ Step 5: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

---

## 📁 Step 6: Deploy Storage Rules

```bash
firebase deploy --only storage:rules
```

---

## 🎯 Step 7: Update Frontend Configuration

After deployment, update your `.env` file:

```bash
# Get your function URL from the deployment output
# It should look like: https://us-central1-channel-partner-54334.cloudfunctions.net/api

# Update .env file
VITE_API_URL=https://us-central1-channel-partner-54334.cloudfunctions.net/api
```

Or if you want to use the local Node.js server for development:

```bash
VITE_API_URL=http://localhost:5000/api
```

---

## ✅ Step 8: Test the Deployment

### Test Health Check

```bash
curl https://us-central1-channel-partner-54334.cloudfunctions.net/api/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "Certificate Generator Firebase API is running",
  "timestamp": "2024-..."
}
```

### Test in Browser

1. Restart your frontend dev server:
   ```bash
   npm run dev
   ```

2. Open: http://localhost:5173

3. Try creating a certificate - it should work!

---

## 🔍 Available Endpoints

After deployment, these endpoints will be available:

- `GET /api/health` - Health check
- `GET /api/certificates` - Get all certificates
- `POST /api/certificates` - Create certificate
- `GET /api/certificates/:id` - Get certificate by ID
- `PUT /api/certificates/:id` - Update certificate
- `DELETE /api/certificates/:id` - Delete certificate
- `GET /api/certificates/:id/download` - Download PDF
- `POST /api/certificates/:id/send-whatsapp` - Send via WhatsApp
- `POST /api/certificates/:id/send-email` - Send via Email
- `GET /api/certificates/stats` - Get statistics

---

## 🐛 Troubleshooting

### Error: "Functions require Blaze plan"

**Solution:** Upgrade to Blaze plan (Pay as you go)
1. Go to: https://console.firebase.google.com/project/channel-partner-54334/usage
2. Click **"Modify Plan"**
3. Select **"Blaze Plan"**
4. Add billing information

### Error: "Permission denied"

**Solution:** Make sure you're logged in and have access to the project
```bash
firebase login
firebase use channel-partner-54334
```

### Error: "Cannot find module"

**Solution:** Install dependencies
```bash
cd firebase-backend/functions
npm install
```

### Functions timeout

**Solution:** Increase timeout in `firebase.json` or function configuration
- Default timeout is 60 seconds
- PDF generation can take time, especially on first run

---

## 📊 Monitoring

### View Function Logs

```bash
firebase functions:log
```

Or in Firebase Console:
https://console.firebase.google.com/project/channel-partner-54334/functions/logs

### View Function Metrics

https://console.firebase.google.com/project/channel-partner-54334/functions

---

## 🔄 Update Functions

To update functions after making changes:

```bash
cd firebase-backend
firebase deploy --only functions
```

---

## 🗑️ Delete Functions

To delete all functions:

```bash
firebase functions:delete api
```

---

## 📝 Quick Reference

```bash
# Login
firebase login

# Set project
firebase use channel-partner-54334

# Install dependencies
cd firebase-backend/functions && npm install

# Deploy everything
cd ../..
firebase deploy

# Deploy only functions
firebase deploy --only functions

# View logs
firebase functions:log

# Test locally (emulator)
cd firebase-backend
firebase emulators:start
```

---

## ✅ Deployment Checklist

- [ ] Firebase CLI installed
- [ ] Logged in to Firebase
- [ ] Dependencies installed (`npm install` in functions folder)
- [ ] Firestore enabled
- [ ] Storage enabled
- [ ] Cloud Functions enabled (Blaze plan)
- [ ] Environment variables configured (optional)
- [ ] Functions deployed
- [ ] Firestore rules deployed
- [ ] Storage rules deployed
- [ ] Frontend `.env` updated with function URL
- [ ] Tested health check endpoint
- [ ] Tested creating a certificate

---

## 🎉 You're Done!

Your Firebase backend is now live and ready to use!

**Function URL:** `https://us-central1-channel-partner-54334.cloudfunctions.net/api`

Update your frontend `.env` file and restart your dev server to use the Firebase backend.

