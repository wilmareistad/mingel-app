// src/services/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";   // 👈 LÄGG TILL
import { getAuth } from "firebase/auth";             // 👈 LÄGG TILL

const firebaseConfig = {
  apiKey: "AIzaSyCO9oy7AblSdb5uxvZ7kwEIG-mtvVuyns8",
  authDomain: "pulse-d724d.firebaseapp.com",
  projectId: "pulse-d724d",
  storageBucket: "pulse-d724d.firebasestorage.app",
  messagingSenderId: "549714159356",
  appId: "1:549714159356:web:bcd933e5d76e374ed89979"
};

const app = initializeApp(firebaseConfig);

// 🔥 EXPORTERA DETTA
export const db = getFirestore(app);
export const auth = getAuth(app);