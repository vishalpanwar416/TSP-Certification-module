# 🎓 Certificate Generator Dashboard

A full-stack web application for generating PDF certificates and sending them via WhatsApp. Built with React, Node.js, Express, Puppeteer, and Twilio WhatsApp API.

## ✨ Features

- 📜 **PDF Certificate Generation** - Automatically generate beautiful PDF certificates
- 📊 **Dashboard Interface** - Modern, responsive dashboard to manage certificates
- 📱 **WhatsApp Integration** - Send certificates directly via WhatsApp
- 💾 **Database Management** - SQLite database for storing certificate records
- 📥 **Download Certificates** - Download generated PDFs anytime
- 📈 **Statistics** - Track total certificates, sent, and pending deliveries
- 🎨 **Beautiful UI** - Premium dark theme with smooth animations

## 🏗️ Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **Axios** - HTTP client
- **Lucide React** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **Puppeteer** - PDF generation
- **Better-SQLite3** - Database
- **Twilio** - WhatsApp API
- **Multer** - File uploads

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Twilio account (for WhatsApp integration)

## 🚀 Installation

### 1. Clone the Repository

```bash
cd /home/vishal/Development/React/Certificate-Sender
```

### 2. Frontend Setup

```bash
# Install frontend dependencies
npm install

# Copy environment file
cp .env.example .env

# The .env file should contain:
# VITE_API_URL=http://localhost:5000/api
```

### 3. Backend Setup

```bash
# Navigate to server directory
cd server

# Install backend dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env and add your Twilio credentials:
# TWILIO_ACCOUNT_SID=your_account_sid
# TWILIO_AUTH_TOKEN=your_auth_token
# TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

## 🔑 WhatsApp Setup (Twilio)

### Option 1: Twilio Sandbox (Free for Testing)

1. Sign up at [Twilio](https://www.twilio.com/try-twilio)
2. Go to [Twilio Console](https://console.twilio.com/)
3. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
4. Follow the instructions to connect your WhatsApp to the sandbox
5. Copy your Account SID and Auth Token to `server/.env`

### Option 2: WhatsApp Business API (Production)

1. Apply for WhatsApp Business API approval on Twilio
2. Complete business verification
3. Configure your approved WhatsApp number
4. Update `TWILIO_WHATSAPP_NUMBER` in `server/.env`

**Note:** The application works without WhatsApp credentials - certificates will be generated and can be downloaded, but WhatsApp sending will be disabled.

## 🎯 Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```
The backend will start on `http://localhost:5000`

**Terminal 2 - Frontend:**
```bash
npm run dev
```
The frontend will start on `http://localhost:5173`

### Access the Application
Open your browser and navigate to `http://localhost:5173`

## 📁 Project Structure

```
Certificate-Sender/
├── src/                        # Frontend source
│   ├── components/
│   │   ├── Dashboard.jsx       # Main dashboard component
│   │   ├── CreateCertificateModal.jsx
│   │   └── SendWhatsAppModal.jsx
│   ├── services/
│   │   └── api.js              # API service layer
│   ├── App.jsx
│   └── index.css               # Design system
├── server/                     # Backend source
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js     # Database configuration
│   │   ├── controllers/
│   │   │   └── certificateController.js
│   │   ├── models/
│   │   │   └── Certificate.js  # Certificate model
│   │   ├── routes/
│   │   │   └── certificates.js # API routes
│   │   ├── utils/
│   │   │   ├── pdfGenerator.js # PDF generation
│   │   │   └── whatsappService.js # WhatsApp integration
│   │   └── index.js            # Express server
│   ├── public/
│   │   └── certificates/       # Generated PDFs
│   └── database/               # SQLite database
├── package.json
└── README.md
```

## 🔌 API Endpoints

### Certificates

- `GET /api/health` - Health check
- `GET /api/certificates` - Get all certificates
- `POST /api/certificates` - Create new certificate
- `GET /api/certificates/:id` - Get certificate by ID
- `PUT /api/certificates/:id` - Update certificate
- `DELETE /api/certificates/:id` - Delete certificate
- `POST /api/certificates/:id/send-whatsapp` - Send via WhatsApp
- `GET /api/certificates/:id/download` - Download PDF
- `GET /api/certificates/stats` - Get statistics

## 📝 Usage Guide

### Creating a Certificate

1. Click **"Create Certificate"** button
2. Fill in the form:
   - **Recipient Name** (required): Name of the recipient
   - **Certificate Number** (required): Unique certificate identifier
   - **Award RERA Number** (optional): RERA registration number
   - **Description** (optional): Custom message (uses default if empty)
   - **Phone Number** (optional): WhatsApp number with country code
   - **Email** (optional): Recipient's email
3. Click **"Create Certificate"**
4. PDF will be generated automatically

### Sending via WhatsApp

1. Click the **Send** icon (📤) for any certificate
2. Enter the recipient's WhatsApp number with country code
   - Format: `+919876543210` (for India)
   - Format: `+1234567890` (for USA)
3. Click **"Send WhatsApp"**
4. Recipient will receive a message with the certificate link

### Downloading Certificates

- Click the **Download** icon (📥) to download the PDF
- Click the **Eye** icon (👁️) to preview the certificate

## 🎨 Certificate Design

The generated certificates feature:
- Professional red and white wave design
- Company branding (Top Selling Property)
- Recipient name in elegant italic font
- Certificate and RERA numbers
- Director and Founder signature lines
- Year badge with ribbon
- Customizable description text

## 🛠️ Customization

### Modify Certificate Template

Edit `server/src/utils/pdfGenerator.js` to customize:
- Colors and styling (CSS in `getCertificateHTML`)
- Layout and structure
- Company information
- Signature fields

### Change API Port

Edit `server/.env`:
```env
PORT=5000  # Change to your preferred port
```

### Database Location

Edit `server/.env`:
```env
DATABASE_PATH=./database/certificates.db
```

## 🐛 Troubleshooting

### "WhatsApp service is not configured"
- Ensure Twilio credentials are set in `server/.env`
- Verify Account SID and Auth Token are correct
- Check if WhatsApp number is in correct format

### PDF Generation Fails
- Ensure Puppeteer dependencies are installed
- On Linux, you may need: `sudo apt-get install -y chromium-browser`

### Database Errors
- Delete `server/database/certificates.db` and restart server
- Database will be recreated automatically

## 📦 Production Build

### Frontend
```bash
npm run build
```
Built files will be in `dist/` directory

### Backend
```bash
cd server
npm start
```

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👨‍💻 Author

Built with ❤️ for Top Selling Property

## 🤝 Support

For issues or questions, please create an issue in the repository.

---

**Happy Certificate Generating! 🎉**
