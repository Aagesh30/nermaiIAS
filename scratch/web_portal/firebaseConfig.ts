import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

// Firebase App Configuration for NERMAI IAS ACADEMY
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyC5vOGWLIC_dieEagnTcPLP533_xCmlsQA",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "nermaiiasacademy-519c8.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "nermaiiasacademy-519c8.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "895310146246",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:895310146246:web:71a8491c9356f48a1085c7"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const handleFirebaseGoogleSignIn = async () => {
  const provider = new GoogleAuthProvider();
  provider.addScope("email");
  provider.addScope("profile");
  
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    return {
      email: user.email,
      name: user.displayName || user.email?.split("@")[0] || "Guest Learner",
      photoURL: user.photoURL,
      uid: user.uid
    };
  } catch (error: any) {
    console.error("Firebase Google Sign-In error:", error);
    throw error;
  }
};
