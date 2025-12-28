# 🔐 Complete Firebase Authentication Setup Guide

## Step 1: Login to Firebase CLI

Open your terminal and run:

```bash
firebase login
```

This will:
1. Open your browser
2. Ask you to sign in with your Google account
3. Grant permissions to Firebase CLI
4. Complete the login process

**Note:** Make sure you use the same Google account that has access to the Firebase project `channel-partner-54334`

---

## Step 2: Enable Google Sign-In in Firebase Console

### Option A: Direct Link (Easiest)
1. Go to: **https://console.firebase.google.com/project/channel-partner-54334/authentication/providers**
2. Click on **"Google"** in the providers list
3. Toggle **"Enable"** to **ON**
4. Enter a **Support email** (your email address)
5. Click **"Save"**

### Option B: Manual Navigation
1. Go to: https://console.firebase.google.com/
2. Select project: **channel-partner-54334**
3. Click **"Authentication"** in the left sidebar
4. Click **"Sign-in method"** tab
5. Find **"Google"** and click on it
6. Toggle **"Enable"** to **ON**
7. Enter **Support email**
8. Click **"Save"**

---

## Step 3: Configure OAuth Consent Screen (If Required)

If you see an error about OAuth consent screen:

1. Go to: **https://console.cloud.google.com/apis/credentials/consent?project=channel-partner-54334**
2. If you see "Create" button, click it
3. Select **"External"** user type
4. Click **"Create"**
5. Fill in required fields:
   - **App name**: Top Selling Properties
   - **User support email**: Your email
   - **Developer contact information**: Your email
6. Click **"Save and Continue"**
7. On **Scopes** page: Click **"Save and Continue"** (default scopes are fine)
8. On **Test users** page: Click **"Save and Continue"**
9. On **Summary** page: Click **"Back to Dashboard"**

---

## Step 4: Add Authorized Domains

1. Go to: **https://console.firebase.google.com/project/channel-partner-54334/authentication/settings**
2. Scroll to **"Authorized domains"**
3. Make sure these domains are listed:
   - `localhost` (should be there by default)
   - Your production domain (if deployed)
   - Your Vercel/Netlify domain (if deployed)

If `localhost` is missing, click **"Add domain"** and add it.

---

## Step 5: Enable Required APIs

1. Go to: **https://console.cloud.google.com/apis/library?project=channel-partner-54334**
2. Search for **"Identity Toolkit API"**
3. If it shows "Enable", click it
4. Click **"Enable"** button

---

## Step 6: Verify Setup

After completing all steps:

1. **Restart your dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. **Hard refresh your browser:**
   - Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

3. **Test Google Sign-In:**
   - Click "Continue with Google" button
   - Select your Google account
   - You should be signed in successfully!

---

## ✅ Checklist

- [ ] Logged in to Firebase CLI (`firebase login`)
- [ ] Google Sign-In provider is **Enabled** in Firebase Console
- [ ] Support email is entered
- [ ] OAuth consent screen is configured (if prompted)
- [ ] `localhost` is in authorized domains
- [ ] Identity Toolkit API is enabled (if needed)
- [ ] Dev server restarted
- [ ] Browser cache cleared

---

## 🆘 Troubleshooting

### Error: "auth/configuration-not-found"
- **Fix:** Enable Google Sign-In in Firebase Console (Step 2)

### Error: "auth/unauthorized-domain"
- **Fix:** Add your domain to authorized domains (Step 4)

### Error: "OAuth consent screen not configured"
- **Fix:** Configure OAuth consent screen (Step 3)

### Error: "Auth not initialized"
- **Fix:** Restart dev server and hard refresh browser

### Still not working?
1. Check browser console for specific error messages
2. Verify Firebase project ID matches: `channel-partner-54334`
3. Wait 1-2 minutes after enabling (Firebase needs time to propagate)
4. Try incognito mode to rule out extensions

---

## 📞 Quick Links

- **Firebase Console**: https://console.firebase.google.com/project/channel-partner-54334
- **Authentication Providers**: https://console.firebase.google.com/project/channel-partner-54334/authentication/providers
- **Authorized Domains**: https://console.firebase.google.com/project/channel-partner-54334/authentication/settings
- **OAuth Consent**: https://console.cloud.google.com/apis/credentials/consent?project=channel-partner-54334
- **API Library**: https://console.cloud.google.com/apis/library?project=channel-partner-54334

