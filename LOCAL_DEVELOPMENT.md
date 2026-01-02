# Local Development Setup Guide

## Problem: Data Not Showing in Localhost

If data is not showing in localhost, it's likely because the Firebase Functions emulator is not running.

## Solution: Start Firebase Functions Emulator

### Step 1: Start the Firebase Functions Emulator

Open a **new terminal window** and run:

```bash
cd firebase-backend
npm install  # Only needed first time
firebase emulators:start --only functions
```

This will start the Firebase Functions emulator on port 5001.

### Step 2: Start the Frontend

In your **main terminal**, make sure you're in the root directory and run:

```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

### Step 3: Verify Environment Variable

Make sure you have a `.env` file in the root directory with:

```
VITE_API_URL=http://127.0.0.1:5001/channel-partner-54334/us-central1/api
```

## Quick Start (Both Servers)

If you want to run both servers easily, you can use two terminal windows:

**Terminal 1 (Backend):**
```bash
cd firebase-backend
firebase emulators:start --only functions
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

## Troubleshooting

### Issue: "Failed to fetch" or Network Error

**Solution:** Make sure the Firebase Functions emulator is running on port 5001.

Check if it's running:
```bash
lsof -ti:5001
```

If nothing is returned, the emulator is not running.

### Issue: CORS Errors

**Solution:** The emulator should handle CORS automatically. If you see CORS errors, make sure:
1. The emulator is running
2. The `.env` file has the correct URL
3. You restart the frontend after changing `.env`

### Issue: "Cannot connect to server"

**Solution:** 
1. Check that the emulator started successfully
2. Verify the URL in `.env` matches: `http://127.0.0.1:5001/channel-partner-54334/us-central1/api`
3. Check the browser console for the actual API URL being used

### Issue: Data still not showing

**Solution:**
1. Open browser DevTools (F12)
2. Check the Console tab for error messages
3. Check the Network tab to see if API requests are failing
4. Look for `[API Config]` logs in the console to verify the API URL

## Using Production API (Alternative)

If you don't want to run the emulator locally, you can use the production API by removing or commenting out the `VITE_API_URL` in `.env`, or setting it to:

```
VITE_API_URL=https://us-central1-channel-partner-54334.cloudfunctions.net/api
```

**Note:** This requires the production Firebase Functions to be deployed and accessible.

