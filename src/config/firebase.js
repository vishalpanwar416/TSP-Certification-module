// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Verify auth is initialized
if (!auth) {
    console.error('Firebase Auth failed to initialize!');
}

export { app, analytics, auth, firebaseConfig };
