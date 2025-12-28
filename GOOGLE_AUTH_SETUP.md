# 🔐 Google Authentication Setup Guide

## ⚠️ Error: `auth/configuration-not-found`

This error means **Google Sign-In is not enabled** in your Firebase project. Follow these steps to fix it:

---

## 🚀 Quick Fix (3 Steps)

### Step 1: Open Firebase Authentication Console

Go directly to:
**https://console.firebase.google.com/project/channel-partner-54334/authentication/providers**

Or navigate manually:
1. Go to https://console.firebase.google.com/
2. Select project: **channel-partner-54334**
3. Click **"Authentication"** in the left sidebar
4. Click **"Sign-in method"** tab

### Step 2: Enable Google Sign-In

1. Find **"Google"** in the list of sign-in providers
2. Click on **"Google"**
3. Toggle the **"Enable"** switch to **ON**
4. Enter a **Support email** (required):
   - Use your email address (e.g., `your-email@gmail.com`)
   - This is used for OAuth consent screen
5. Click **"Save"**

### Step 3: Configure OAuth Consent Screen (If Required)

If you see an error about OAuth consent screen:

1. Go to: **https://console.cloud.google.com/apis/credentials/consent?project=channel-partner-54334**
2. Select **"External"** user type
3. Click **"Create"**
4. Fill in required fields:
   - **App name**: Top Selling Properties (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. On **Scopes** page, click **"Save and Continue"** (default scopes are fine)
7. On **Test users** page, click **"Save and Continue"**
8. On **Summary** page, click **"Back to Dashboard"**

---

## ✅ Verify Setup

After enabling Google Sign-In:

1. **Refresh your app** (or restart dev server)
2. **Try Google Sign-In again**
3. It should now work! 🎉

---

## 🔧 Additional Configuration (If Needed)

### Add Authorized Domains

If you get "unauthorized-domain" error:

1. Go to: **https://console.firebase.google.com/project/channel-partner-54334/authentication/settings**
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Add:
   - `localhost` (for local development)
   - Your production domain (if deployed)
   - Your Vercel/Netlify domain (if deployed)

### Enable Required APIs

If you see API errors:

1. Go to: **https://console.cloud.google.com/apis/library?project=channel-partner-54334**
2. Search for **"Identity Toolkit API"**
3. Click **"Enable"**

---

## 📝 Quick Checklist

- [ ] Google Sign-In provider is **Enabled** in Firebase Console
- [ ] Support email is entered
- [ ] OAuth consent screen is configured (if prompted)
- [ ] `localhost` is in authorized domains
- [ ] Identity Toolkit API is enabled (if needed)

---

## 🆘 Still Not Working?

1. **Check browser console** for specific error messages
2. **Clear browser cache** and try again
3. **Try incognito mode** to rule out extensions
4. **Verify Firebase project ID** matches: `channel-partner-54334`
5. **Wait 1-2 minutes** after enabling (Firebase needs time to propagate)

---

## 📞 Need Help?

If issues persist:
- Check Firebase Console for any error messages
- Verify your Firebase project is active
- Make sure you have proper permissions on the project

