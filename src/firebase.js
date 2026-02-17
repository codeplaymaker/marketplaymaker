import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase client config — these are public keys, safe to include in client bundle
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyAg9UWRG334AInTD7m4bDkm9u8mJQGtSDc",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "marketplaymaker-2e4b9.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "marketplaymaker-2e4b9",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "marketplaymaker-2e4b9.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "639311000126",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:639311000126:web:e8cd8664067e4b1f21976f",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-7XNP5PX3WF",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
export default app;
