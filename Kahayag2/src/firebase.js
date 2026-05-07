import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCo2SDsQxfHpz1fOUltzjcZaqcEiwkRvpg",
  authDomain: "kahayagcateringservices.firebaseapp.com",
  projectId: "kahayagcateringservices",
  storageBucket: "kahayagcateringservices.firebasestorage.app",
  messagingSenderId: "907124275570",
  appId: "1:907124275570:web:8c8fdb8fea46b556fa05eb",
  measurementId: "G-V2VE1N3XY0"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup };

// Error handling utility used across pages
export const handleFirestoreError = (error, operation = '') => {
  console.error(`Firestore error${operation ? ` during ${operation}` : ''}:`, error);
};

// Operation type constants used across pages
export const OperationType = {
  READ: 'read',
  WRITE: 'write',
  UPDATE: 'update',
  DELETE: 'delete',
};