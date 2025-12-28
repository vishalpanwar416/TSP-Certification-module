# Vercel Deployment Guide

This guide will help you deploy your Certificate Sender application to Vercel.

## Overview

Your application consists of two parts:
1. **Frontend** (React + Vite) - Main application interface
2. **Backend** (Node.js + Express) - API server

Both will be deployed separately on Vercel.

## Prerequisites

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

## Deployment Steps

### Step 1: Deploy the Backend API

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? (Select your account)
   - Link to existing project? **N**
   - Project name: `certificate-sender-api` (or your preferred name)
   - In which directory is your code located? `./`
   - Want to override the settings? **N**

4. After deployment, you'll get a URL like: `https://certificate-sender-api.vercel.app`

5. Set environment variables:
   ```bash
   vercel env add TWILIO_ACCOUNT_SID
   vercel env add TWILIO_AUTH_TOKEN
   vercel env add TWILIO_WHATSAPP_NUMBER
   vercel env add EMAIL_USER
   vercel env add EMAIL_PASS
   vercel env add EMAIL_HOST
   vercel env add EMAIL_PORT
   ```

6. Deploy to production:
   ```bash
   vercel --prod
   ```

### Step 2: Update Frontend API Configuration

1. Go back to the root directory:
   ```bash
   cd ..
   ```

2. Create or update `.env` file with your backend URL:
   ```bash
   echo "VITE_API_URL=https://your-backend-url.vercel.app" > .env
   ```

3. Update your API configuration in the source code if needed.

### Step 3: Deploy the Frontend

1. Update the `vercel.json` file in the root directory:
   - Replace `your-backend-url` with your actual backend Vercel URL

2. Deploy to Vercel:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? (Select your account)
   - Link to existing project? **N**
   - Project name: `certificate-sender` (or your preferred name)
   - In which directory is your code located? `./`
   - Want to override the settings? **N**

4. Set Firebase environment variables:
   ```bash
   vercel env add VITE_FIREBASE_API_KEY
   vercel env add VITE_FIREBASE_AUTH_DOMAIN
   vercel env add VITE_FIREBASE_PROJECT_ID
   vercel env add VITE_FIREBASE_STORAGE_BUCKET
   vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
   vercel env add VITE_FIREBASE_APP_ID
   ```

5. Deploy to production:
   ```bash
   vercel --prod
   ```

## Alternative: Deploy via Vercel Dashboard

### For Backend:

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Configure:
   - **Root Directory**: `server`
   - **Framework Preset**: Other
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
5. Add environment variables in the dashboard
6. Click "Deploy"

### For Frontend:

1. Click "Add New Project" again
2. Import the same Git repository
3. Configure:
   - **Root Directory**: `./` (root)
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Firebase environment variables
5. Update `VITE_API_URL` environment variable with backend URL
6. Click "Deploy"

## Post-Deployment

1. **Test your application**: Visit the frontend URL provided by Vercel
2. **Update Frontend API URL**: Make sure your frontend is pointing to the correct backend URL
3. **Configure CORS**: Ensure your backend allows requests from your frontend domain
4. **Monitor logs**: Use `vercel logs` to check for any issues

## Important Notes

- **Database**: SQLite won't work with Vercel's serverless functions. Consider migrating to:
  - PostgreSQL (Vercel Postgres)
  - MongoDB Atlas
  - Firebase Realtime Database/Firestore (you already have Firebase setup)

- **File Storage**: Uploaded files and generated certificates should be stored in:
  - Vercel Blob Storage
  - AWS S3
  - Firebase Storage (recommended since you have Firebase)

- **Puppeteer**: May have issues with Vercel's serverless limits. Consider:
  - Using Puppeteer on a different platform (Railway, Render)
  - Using a PDF generation service
  - Deploying backend separately on a platform that supports it

## Environment Variables Reference

### Frontend (.env):
```
VITE_API_URL=https://your-backend-url.vercel.app
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend (server/.env):
```
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_WHATSAPP_NUMBER=your_whatsapp_number
EMAIL_USER=your_email
EMAIL_PASS=your_email_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
PORT=3001
```

## Troubleshooting

### Build Fails
- Check the build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set correctly

### API Not Working
- Check CORS configuration
- Verify backend URL in frontend
- Check serverless function logs

### Database Issues
- Consider migrating to Firebase Firestore
- Or use Vercel Postgres

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel CLI Reference](https://vercel.com/docs/cli)
- [Vercel Support](https://vercel.com/support)
