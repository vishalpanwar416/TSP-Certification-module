# 📚 Certificate Generator - Project Documentation

## 🎯 Project Overview

This is a **full-stack web application** designed to generate professional PDF certificates and distribute them via WhatsApp. Perfect for businesses, educational institutions, or organizations that need to issue certificates at scale.

### Key Capabilities
- ✅ Generate branded PDF certificates with custom data
- ✅ Store certificate records in a database
- ✅ Send certificates via WhatsApp with personalized messages
- ✅ Track delivery status
- ✅ Download certificates anytime
- ✅ Manage all certificates from a beautiful dashboard

---

## 🏗️ Architecture

### Technology Stack

**Frontend (Client)**
- React 19 - Modern UI library
- Vite - Lightning-fast build tool
- Lucide React - Beautiful icon library
- Axios - HTTP client for API calls
- Custom CSS - Premium dark theme design system

**Backend (Server)**
- Node.js + Express - Web server framework
- Puppeteer - Headless browser for PDF generation
- Better-SQLite3 - Fast, embedded SQL database
- Twilio SDK - WhatsApp Business API integration
- Multer - File upload handling

**Database**
- SQLite - Serverless, zero-configuration database
- Stores: certificates, recipient info, delivery status

---

## 📊 Database Schema

### `certificates` Table

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (PK) | UUID primary key |
| recipient_name | TEXT | Name of certificate recipient |
| certificate_number | TEXT (UNIQUE) | Unique certificate identifier |
| award_rera_number | TEXT | Optional RERA award number |
| description | TEXT | Custom certificate text |
| phone_number | TEXT | WhatsApp number with country code |
| email | TEXT | Recipient email address |
| pdf_path | TEXT | File system path to generated PDF |
| whatsapp_sent | BOOLEAN | Whether WhatsApp was sent (0/1) |
| whatsapp_sent_at | DATETIME | Timestamp of WhatsApp delivery |
| created_at | DATETIME | Record creation timestamp |
| updated_at | DATETIME | Record update timestamp |

**Indexes:**
- `idx_certificate_number` - Fast lookup by certificate number
- `idx_created_at` - Chronological sorting
- `idx_whatsapp_sent` - Filter by delivery status

---

## 🔌 API Reference

### Base URL
```
http://localhost:5000/api
```

### Endpoints

#### Health Check
```http
GET /api/health
```
Returns server status and timestamp.

#### Get All Certificates
```http
GET /api/certificates?limit=100&offset=0
```
Returns paginated list of certificates with metadata.

#### Create Certificate
```http
POST /api/certificates
Content-Type: application/json

{
  "recipient_name": "John Doe",
  "certificate_number": "CERT001",
  "award_rera_number": "RERA/123/456",
  "description": "Custom message",
  "phone_number": "+919876543210",
  "email": "john@example.com"
}
```
Creates certificate, generates PDF, returns certificate object.

#### Get Certificate by ID
```http
GET /api/certificates/:id
```

#### Update Certificate
```http
PUT /api/certificates/:id
Content-Type: application/json

{
  "phone_number": "+911234567890"
}
```

#### Delete Certificate
```http
DELETE /api/certificates/:id
```

#### Send via WhatsApp
```http
POST /api/certificates/:id/send-whatsapp
Content-Type: application/json

{
  "phone_number": "+919876543210"
}
```

#### Download Certificate PDF
```http
GET /api/certificates/:id/download
```

#### Get Statistics
```http
GET /api/certificates/stats
```
Returns:
```json
{
  "total": 100,
  "whatsapp_sent": 75,
  "pending": 25
}
```

---

## 🎨 Frontend Components

### Dashboard (`Dashboard.jsx`)
Main application view with:
- Statistics cards
- Certificate table
- Action buttons (create, view, download, send, delete)
- Modal management

### CreateCertificateModal (`CreateCertificateModal.jsx`)
Form for creating new certificates:
- Input validation
- Error handling
- Loading states
- Auto-PDF generation on submit

### SendWhatsAppModal (`SendWhatsAppModal.jsx`)
WhatsApp sending interface:
- Phone number input
- Format validation
- Certificate preview
- Status feedback

### API Service (`api.js`)
Centralized API client:
- Axios instance configuration
- All API methods
- Error handling
- URL generation

---

## 🎯 Certificate Template

The PDF generator creates certificates with:

**Header Section:**
- Company logo (Top Selling Property)
- Current year badge with ribbon
- Red wavy design elements

**Content Section:**
- "CERTIFICATE" title in large text
- "FOR APPRECIATION" subtitle
- Recipient name in italic, underlined style
- Descriptive text about the achievement
- Certificate number and RERA number (if provided)

**Footer Section:**
- Director and Founder signature lines
- Watermark with verification code

**Customization:**
Edit `server/src/utils/pdfGenerator.js` to modify:
- Colors, fonts, layout
- Company branding
- Certificate size (default: 1024x720px)
- Template structure

---

## 🔐 Environment Variables

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:5000/api
```

### Backend (`server/.env`)
```env
# Server
PORT=5000
NODE_ENV=development

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Database
DATABASE_PATH=./database/certificates.db

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## 📱 WhatsApp Integration

### How It Works

1. **Certificate Created** → PDF generated and saved
2. **Send Button Clicked** → Phone number validated
3. **API Call** → Twilio SDK creates WhatsApp message
4. **Message Sent** → Contains certificate link and details
5. **Status Updated** → `whatsapp_sent` set to true in database

### Message Template
```
🎉 *Congratulations [Name]!*

You have been awarded a Certificate of Appreciation 
from *Top Selling Property*.

📜 *Certificate Number:* [CERT_NUMBER]
🏆 *Award RERA Number:* [RERA_NUMBER]

📥 *Download your certificate:*
[DOWNLOAD_LINK]

Thank you for your commitment and excellence!

*www.topsellingproperty.com*
```

### Twilio Setup

**Sandbox Mode (Free Testing):**
1. Sign up at twilio.com
2. Get Account SID and Auth Token
3. Join WhatsApp sandbox
4. Test with your own number

**Production Mode:**
1. Apply for WhatsApp Business API
2. Verify business
3. Get approved number
4. Unlimited messaging capability

---

## 🚀 Deployment Guide

### Frontend Deployment (Vercel/Netlify)

1. **Build the frontend:**
   ```bash
   npm run build
   ```

2. **Configure environment:**
   ```
   VITE_API_URL=https://your-api-domain.com/api
   ```

3. **Deploy `dist/` folder**

### Backend Deployment (Railway/Render/Heroku)

1. **Set environment variables** on hosting platform

2. **Install dependencies:**
   ```bash
   cd server && npm install
   ```

3. **Start command:**
   ```bash
   npm start
   ```

4. **Ensure Chromium** is available for Puppeteer
   - Most platforms support Puppeteer out of the box
   - Check platform-specific Puppeteer documentation

---

## 🔧 Development Workflow

### Starting Development

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run server
```

### Making Changes

**Frontend:**
1. Edit React components in `src/components/`
2. Hot reload automatically updates browser
3. Test in browser at http://localhost:5173

**Backend:**
1. Edit server files in `server/src/`
2. Server auto-restarts with nodemon
3. Test API with frontend or Postman

**Database:**
- View/edit: `server/database/certificates.db`
- Use SQLite browser or CLI
- Schema auto-created on first run

### Testing

**Manual Testing:**
1. Create a test certificate
2. Download and verify PDF
3. Send to test WhatsApp number
4. Check database records

**API Testing:**
Use Postman/Insomnia or curl:
```bash
curl http://localhost:5000/api/health
```

---

## 📦 File Structure Details

```
Certificate-Sender/
│
├── src/                          # Frontend source
│   ├── components/
│   │   ├── Dashboard.jsx         # Main dashboard UI
│   │   ├── CreateCertificateModal.jsx
│   │   └── SendWhatsAppModal.jsx
│   ├── services/
│   │   └── api.js                # API client
│   ├── App.jsx                   # Root component
│   ├── main.jsx                  # Entry point
│   └── index.css                 # Design system
│
├── server/                       # Backend source
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js       # SQLite setup
│   │   ├── controllers/
│   │   │   └── certificateController.js  # Request handlers
│   │   ├── models/
│   │   │   └── Certificate.js    # Database model
│   │   ├── routes/
│   │   │   └── certificates.js   # API routes
│   │   ├── utils/
│   │   │   ├── pdfGenerator.js   # Puppeteer PDF creation
│   │   │   └── whatsappService.js # Twilio integration
│   │   └── index.js              # Express server
│   │
│   ├── public/
│   │   └── certificates/         # Generated PDFs (gitignored)
│   │
│   ├── database/                 # SQLite files (gitignored)
│   │   └── certificates.db
│   │
│   ├── package.json
│   └── .env                      # Environment config
│
├── public/                       # Static assets
├── package.json                  # Frontend dependencies
├── vite.config.js                # Vite configuration
├── README.md                     # Main documentation
├── SETUP.md                      # Quick start guide
└── PROJECT_DOCS.md              # This file
```

---

## 🐛 Common Issues & Solutions

### Issue: "Port already in use"
**Solution:**
```bash
# Find and kill process
lsof -ti:5000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

### Issue: "Puppeteer failed to launch"
**Solution:**
```bash
# Install Chromium
sudo apt-get install chromium-browser  # Linux
brew install chromium  # macOS
```

### Issue: "WhatsApp not configured"
**Solution:** This is normal! App works without WhatsApp. To enable:
1. Sign up for Twilio
2. Add credentials to `server/.env`
3. Restart backend server

### Issue: "Database locked"
**Solution:**
```bash
# Stop all server instances
# Delete database and restart
rm server/database/certificates.db
npm run server
```

### Issue: "CORS errors"
**Solution:** Ensure `FRONTEND_URL` in `server/.env` matches your frontend URL.

---

## ⚡ Performance Optimization

### PDF Generation
- Puppeteer launches headless browser per request
- Consider implementing PDF caching
- Queue system for bulk generation

### Database
- SQLite is fast for <100k records
- Add indexes for frequently queried fields
- Consider PostgreSQL for >100k records

### API
- Implement rate limiting for production
- Add request validation middleware
- Enable gzip compression

---

## 🔒 Security Considerations

### Current Implementation
- Environment variables for sensitive data
- CORS configuration
- Input validation on API

### Recommendations for Production
- Add JWT authentication
- Implement rate limiting
- Validate and sanitize all inputs
- Use HTTPS only
- Add API key authentication
- Implement role-based access control

---

## 🎓 Learning Resources

**React:**
- https://react.dev/

**Express.js:**
- https://expressjs.com/

**Puppeteer:**
- https://pptr.dev/

**Twilio WhatsApp API:**
- https://www.twilio.com/docs/whatsapp

**SQLite:**
- https://www.sqlite.org/docs.html

---

## 🤝 Contributing

To contribute to this project:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📝 License

MIT License - Free to use for personal and commercial projects.

---

## 👨‍💻 Support & Contact

For questions or issues:
- Check SETUP.md for quick start
- Review this documentation
- Check the README.md
- Search existing issues

---

**Built with ❤️ for Top Selling Property**

Last Updated: December 2025
