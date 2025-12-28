// Firebase Configuration
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCZVYDaxjRUUZG1XCVlxFEJrOPhMle6noI",
    authDomain: "channel-partner-54334.firebaseapp.com",
    projectId: "channel-partner-54334",
    storageBucket: "channel-partner-54334.firebasestorage.app",
    messagingSenderId: "801644118506",
    appId: "1:801644118506:web:5645c69a35f3e49a3ab293",
    measurementId: "G-TNB66PSD89"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { app, analytics, auth, firebaseConfig };
