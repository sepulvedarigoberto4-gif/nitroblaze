// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCSsDs_fcT1lYeSsvbI51f5KEbgyZq3pek",
  authDomain: "nitroblaze-350bf.firebaseapp.com",
  projectId: "nitroblaze-350bf",
  storageBucket: "nitroblaze-350bf.firebasestorage.app",
  messagingSenderId: "107366140735",
  appId: "1:107366140735:web:7494931fda3e4d1fec618a",
  measurementId: "G-X7YEHVSBCD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
