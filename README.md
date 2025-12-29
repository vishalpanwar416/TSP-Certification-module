# 🎓 Certificate Generator Dashboard

A web application for generating and managing certificates with Firebase backend. Built with React and Firebase (Firestore + Authentication).

## ✨ Features

- 📜 **Certificate Management** - Create, update, and delete certificates
- 📊 **Dashboard Interface** - Modern, responsive dashboard to manage certificates
- 🔐 **Google Authentication** - Secure login with Google via Firebase Auth
- 💾 **Cloud Database** - Firebase Firestore for storing certificate records
- 📈 **Statistics** - Track total certificates, sent, and pending deliveries
- 🎨 **Beautiful UI** - Premium dark theme with smooth animations

## 🏗️ Tech Stack

- **React 19** - UI library
- **Vite** - Build tool
- **Firebase** - Backend services (Firestore + Authentication)
- **Lucide React** - Icons
- **React Router DOM** - Navigation

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase project with Firestore and Authentication enabled

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/vishalpanwar416/TSP-Certification-module.git
cd TSP-Certification-module
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Configuration

The app is pre-configured with a Firebase project. If you want to use your own Firebase project:

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Firestore Database** and **Authentication** (Google Sign-In)
3. Update the config in `src/config/firebase.js` with your project credentials

## 🎯 Running the Application

### Development Mode

```bash
npm run dev
```

The app will start on `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
TSP-Certification-module/
├── src/                        # Frontend source
│   ├── components/            # React components
│   │   ├── Dashboard.jsx       # Main dashboard component
│   │   ├── Login.jsx           # Authentication page
│   │   └── ...
│   ├── config/
│   │   └── firebase.js         # Firebase configuration
│   ├── contexts/
│   │   └── AuthContext.jsx     # Authentication context
│   ├── services/
│   │   ├── api.js              # API exports
│   │   └── firebaseService.js  # Firebase Firestore operations
│   ├── App.jsx
│   └── index.css               # Design system
├── firebase-backend/          # Firebase Cloud Functions (optional)
│   ├── functions/             # Cloud Functions code
│   ├── firestore.rules        # Firestore security rules
│   ├── storage.rules          # Storage security rules
│   └── firebase.json          # Firebase configuration
├── public/                    # Static assets
├── package.json
└── README.md
```

## 🔐 Authentication

The app uses Firebase Authentication with Google Sign-In:

1. Click "Sign in with Google" on the login page
2. Authenticate with your Google account
3. Access the dashboard to manage certificates

## 📝 Usage Guide

### Creating a Certificate

1. Click **"Create Certificate"** button
2. Fill in the form:
   - **Recipient Name** (required): Name of the recipient
   - **Certificate Number** (auto-generated): Unique certificate identifier
   - **Award RERA Number** (optional): RERA registration number
   - **Description** (optional): Custom message
   - **Phone Number** (optional): WhatsApp number with country code
3. Click **"Create Certificate"**

### Managing Certificates

- View all certificates in the dashboard table
- **Edit**: Click the edit icon to modify certificate details
- **Delete**: Click the delete icon to remove a certificate
- **Track Status**: See which certificates have been sent via WhatsApp

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy (no additional configuration needed)

The `vercel.json` file is pre-configured for the build:
- Build command: `npm run build`
- Output directory: `dist`

### Deploy Firebase Functions (Optional)

If you want to use Firebase Cloud Functions:

```bash
cd firebase-backend
npm install
firebase deploy --only functions
```

## 🛠️ Configuration

### Firebase Configuration

Update `src/config/firebase.js` with your Firebase project credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
};
```

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👨‍💻 Author

Built with ❤️ for Top Selling Property

## 🤝 Support

For issues or questions, please create an issue in the repository.

---

**Happy Certificate Generating! 🎉**
