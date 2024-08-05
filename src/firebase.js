import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';  // Import getStorage

const firebaseConfig = {
  apiKey: "AIzaSyAg9UWRG334AInTD7m4bDkm9u8mJQGtSDc",
  authDomain: "marketplaymaker-2e4b9.firebaseapp.com",
  projectId: "marketplaymaker-2e4b9",
  storageBucket: "marketplaymaker-2e4b9.appspot.com",
  messagingSenderId: "639311000126",
  appId: "1:639311000126:web:e8cd8664067e4b1f21976f",
  measurementId: "G-7XNP5PX3WF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const storage = getStorage(app);  // Initialize Firebase Storage

export { auth, db, storage };
export default app;
