# 🚀 Firebase CLI Deployment Steps

## Quick Deployment

### Step 1: Login to Firebase (One-time)

Open your terminal and run:

```bash
firebase login
```

This will open your browser to authenticate.

---

### Step 2: Install Dependencies

```bash
cd firebase-backend/functions
npm install
cd ../..
```

---

### Step 3: Deploy

**Option A: Use the deployment script**
```bash
cd firebase-backend
./deploy.sh
```

**Option B: Manual deployment**
```bash
cd firebase-backend
firebase deploy --only functions,firestore:rules,storage:rules
```

---

## What Gets Deployed

- ✅ **Cloud Functions** - Your API endpoints
- ✅ **Firestore Rules** - Database security rules
- ✅ **Storage Rules** - File storage security rules

---

## After Deployment

1. **Copy the Function URL** from the deployment output
   - It will look like: `https://us-central1-channel-partner-54334.cloudfunctions.net/api`

2. **Update your `.env` file** in the project root:
   ```env
   VITE_API_URL=https://us-central1-channel-partner-54334.cloudfunctions.net/api
   ```

3. **Restart your frontend:**
   ```bash
   npm run dev
   ```

---

## Troubleshooting

### "Failed to authenticate"
- Run: `firebase login`

### "Functions require Blaze plan"
- Go to Firebase Console → Upgrade to Blaze plan (free tier available)

### "Permission denied"
- Make sure you have access to the project
- Run: `firebase use channel-partner-54334`

---

## Manual Commands

```bash
# Check login status
firebase projects:list

# Set project
firebase use channel-partner-54334

# Deploy only functions
firebase deploy --only functions

# Deploy only rules
firebase deploy --only firestore:rules,storage:rules

# View logs
firebase functions:log
```

