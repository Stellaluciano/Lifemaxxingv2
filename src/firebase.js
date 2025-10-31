// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBjtV9YPp2djn3xDUCz_kb-oMKSLU6UXn0",
  authDomain: "lifemaxxing-4b353.firebaseapp.com",
  projectId: "lifemaxxing-4b353",
  storageBucket: "lifemaxxing-4b353.firebasestorage.app",
  messagingSenderId: "471719994299",
  appId: "1:471719994299:web:ea01493f86b83e29df5a9e",
  measurementId: "G-45R5TQQGVF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);