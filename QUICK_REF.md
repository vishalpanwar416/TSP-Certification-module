# 🚀 Quick Reference Card

## Start the Application

```bash
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend  
npm run dev
```

**Then open:** http://localhost:5173

---

## Create a Certificate

1. Click **"Create Certificate"**
2. Fill required fields:
   - Recipient Name
   - Certificate Number
3. Optional: phone, email, RERA number
4. Click **"Create Certificate"**
5. PDF generated automatically!

---

## Send via WhatsApp

1. Click 📤 (Send icon)
2. Enter phone number: `+919876543210`
3. Click **"Send WhatsApp"**

**Note:** Requires Twilio setup. Works without it too!

---

## Common Commands

```bash
# Install dependencies
npm install
cd server && npm install

# Start frontend only
npm run dev

# Start backend only
npm run server

# Build for production
npm run build

# View database
sqlite3 server/database/certificates.db

# Check servers are running
lsof -i:5000  # Backend
lsof -i:5173  # Frontend
```

---

## File Locations

- **PDFs:** `server/public/certificates/`
- **Database:** `server/database/certificates.db`
- **Logs:** Terminal output
- **Config:** `server/.env`

---

## API Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Get all certificates
curl http://localhost:5000/api/certificates

# Create certificate
curl -X POST http://localhost:5000/api/certificates \
  -H "Content-Type: application/json" \
  -d '{"recipient_name":"Test","certificate_number":"T001"}'
```

---

## WhatsApp Setup (Optional)

1. Go to: https://www.twilio.com/try-twilio
2. Sign up & get credentials
3. Edit `server/.env`:
   ```env
   TWILIO_ACCOUNT_SID=your_sid
   TWILIO_AUTH_TOKEN=your_token
   ```
4. Restart backend: `npm run server`

---

## Troubleshooting

**Can't connect to API?**
→ Check backend is running on port 5000

**WhatsApp not working?**
→ It's optional! App works without it

**Port in use?**
```bash
lsof -ti:5000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**PDF generation fails?**
```bash
sudo apt-get install chromium-browser
```

---

## URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000/api
- **Health Check:** http://localhost:5000/api/health
- **Certificate PDFs:** http://localhost:5000/certificates/

---

## Default Credentials

None required! Open app works immediately.

---

**Need more help?** 
→ Check `SETUP.md` or `PROJECT_DOCS.md`
