# 🚀 Quick Setup Guide

## Step 1: Install Dependencies

### Frontend Dependencies
```bash
npm install
```

### Backend Dependencies
```bash
cd server
npm install
cd ..
```

## Step 2: Configure Environment Variables

### Frontend Configuration
The frontend is already configured with `.env.example`. No changes needed for local development.

### Backend Configuration
Edit `server/.env` and update the following:

```env
# Server runs on this port
PORT=5000

# Twilio WhatsApp Credentials (Optional - can test without this)
TWILIO_ACCOUNT_SID=your_actual_account_sid_here
TWILIO_AUTH_TOKEN=your_actual_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Note:** You can skip WhatsApp configuration for now. The app will work perfectly - you just won't be able to send certificates via WhatsApp until you set it up.

## Step 3: Get Twilio Credentials (Optional)

### For Free Testing (Twilio Sandbox):

1. **Sign up for Twilio**
   - Go to https://www.twilio.com/try-twilio
   - Sign up for a free account

2. **Get Your Credentials**
   - After signing in, go to https://console.twilio.com/
   - Find your **Account SID** and **Auth Token** on the dashboard
   - Copy these to `server/.env`

3. **Set Up WhatsApp Sandbox**
   - In Twilio Console, go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
   - You'll see instructions like: "Join your sandbox by sending 'join <code>' to +1 415 523 8886"
   - Send that message from your WhatsApp to activate the sandbox
   - Now you can receive certificates on your WhatsApp!

### For Production (WhatsApp Business API):
- Apply for WhatsApp Business API approval
- Complete business verification process
- This requires more setup but allows unlimited messaging

## Step 4: Run the Application

### Option A: Run Both Servers Separately (Recommended for Development)

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
You should see:
```
✅ Server running on: http://localhost:5000
✅ Database initialized successfully
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```
You should see:
```
VITE ready in XXX ms
➜  Local:   http://localhost:5173/
```

**Open your browser:** http://localhost:5173

### Option B: Use the Start Script
```bash
npm run start:all
```
(Note: You may need to install `concurrently` for this)

## Step 5: Test the Application

1. **Create Your First Certificate**
   - Click "Create Certificate" button
   - Fill in:
     - Recipient Name: `Test Company Name`
     - Certificate Number: `TEST001`
     - Phone Number: `+919999999999` (your WhatsApp number)
   - Click "Create Certificate"

2. **View the Certificate**
   - Click the Eye icon (👁️) to preview the PDF
   - Click the Download icon (📥) to download

3. **Send via WhatsApp** (if configured)
   - Click the Send icon (📤)
   - Verify the phone number
   - Click "Send WhatsApp"
   - Check your WhatsApp for the message!

## 🎯 Quick Test Without WhatsApp

Don't want to set up WhatsApp right now? No problem!

1. Start the servers (both frontend and backend)
2. Create a certificate
3. Download and view the PDF
4. When you try to send via WhatsApp, you'll get a message saying it's not configured
5. But your certificate is generated and saved!

## 📂 Where Are My Files?

- **Generated PDFs:** `server/public/certificates/`
- **Database:** `server/database/certificates.db`
- **Logs:** Check the terminal where the backend is running

## 🐛 Troubleshooting

### "Cannot GET /"
- Make sure you're accessing the **frontend** URL: http://localhost:5173
- The backend runs on http://localhost:5000 (API only)

### "Failed to fetch certificates"
- Check if backend is running on port 5000
- Check terminal for errors
- Make sure both servers are running

### "Module not found" errors
- Run `npm install` in the root directory
- Run `npm install` in the `server` directory

### Puppeteer/Chromium errors (Linux)
```bash
sudo apt-get install -y chromium-browser
```

### Port already in use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

## 🎨 What You'll See

Your dashboard will have:
- 📊 **Statistics Cards** - Total certificates, sent, and pending
- 📋 **Certificates Table** - All your generated certificates
- 🎨 **Dark Premium Theme** - Beautiful gradient backgrounds
- ⚡ **Smooth Animations** - Modern UI with micro-interactions

## Next Steps

1. ✅ Create a few test certificates
2. ✅ Download and view them
3. ✅ Set up WhatsApp (optional)
4. ✅ Customize the certificate template if needed
5. ✅ Start using it for real!

## 💡 Pro Tips

- **Batch Creation**: Create multiple certificates and send them all at once
- **Database Backup**: Backup `server/database/certificates.db` regularly
- **Custom Templates**: Edit `server/src/utils/pdfGenerator.js` to customize the certificate design
- **Phone Format**: Always include country code (e.g., +91 for India)

---

**Need help?** Check the main README.md for detailed documentation!

**Ready to start?** Run the servers and open http://localhost:5173 🚀
