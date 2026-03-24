import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCO9oy7AblSdb5uxvZ7kwEIG-mtvVuyns8",
  authDomain: "pulse-d724d.firebaseapp.com",
  projectId: "pulse-d724d",
  storageBucket: "pulse-d724d.firebasestorage.app",
  messagingSenderId: "549714159356",
  appId: "1:549714159356:web:bcd933e5d76e374ed89979"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);