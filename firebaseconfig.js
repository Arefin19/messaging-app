import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage'; // Add this import

const firebaseConfig = {
  apiKey: "AIzaSyAMU7O4Su1w6i7s-V9cuIIBP_r-8-EwUg4",
  authDomain: "prio-13d1f.firebaseapp.com",
  projectId: "prio-13d1f",
  storageBucket: "prio-13d1f.appspot.com", // Changed to the correct storage bucket format
  messagingSenderId: "953169374121",
  appId: "1:953169374121:web:6f1347e97153435d4bf2b8",
  measurementId: "G-DRPJWMFMWV"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app); // Initialize storage

export { db, auth, storage }; // Export storage