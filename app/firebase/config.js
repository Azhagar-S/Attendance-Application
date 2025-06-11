// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD5WImRiTBBI_rimCryO_QTXFFZ2WjZMz4",
  authDomain: "attendance-app-7035a.firebaseapp.com",
  projectId: "attendance-app-7035a",
  storageBucket: "attendance-app-7035a.firebasestorage.app",
  messagingSenderId: "373411544385",
  appId: "1:373411544385:web:e26e0149395809ece475c0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Initialize Firebase Database
export const db = getFirestore(app);

// Initialize Firebase Storage
export const storage = getStorage(app);


