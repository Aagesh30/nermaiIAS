import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from "firebase/auth";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Safely obtain React Native persistence function if running in native mobile bundle
const getRNPersistence = (): any => {
  try {
    const fbAuth = require("@firebase/auth");
    if (fbAuth && typeof fbAuth.getReactNativePersistence === "function") {
      return fbAuth.getReactNativePersistence(AsyncStorage);
    }
  } catch (e) {}
  try {
    const fbAuthMod = require("firebase/auth");
    if (fbAuthMod && typeof fbAuthMod.getReactNativePersistence === "function") {
      return fbAuthMod.getReactNativePersistence(AsyncStorage);
    }
  } catch (e) {}
  return undefined;
};

// Firebase App Configuration for NERMAI IAS ACADEMY — Project: nermaiiasacademy-519c8
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBZ07n1v6D7ZT5O0nIcut6JuSb0GMtM0fo",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "nermaiiasacademy-519c8.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "nermaiiasacademy-519c8.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "587850155187",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:587850155187:web:0f2c25a69a6b73f4391cc6",
  measurementId: "G-K2L1JCLKP6"
};

import { getFirestore } from "firebase/firestore";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);

// Initialize Auth with AsyncStorage persistence for React Native to resolve memory persistence warnings
export const auth = (() => {
  if (Platform.OS === "web") {
    return getAuth(app);
  } else {
    try {
      const persistence = getRNPersistence();
      if (persistence) {
        return initializeAuth(app, { persistence });
      }
      return getAuth(app);
    } catch (e) {
      return getAuth(app);
    }
  }
})();

export const handleFirebaseGoogleSignIn = async (fallbackName?: string, fallbackPhone?: string) => {
  if (Platform.OS === "web") {
    const provider = new GoogleAuthProvider();
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const isMobileBrowser = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    try {
      if (isMobileBrowser) {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("nermai_pending_guest_name", fallbackName || "");
          localStorage.setItem("nermai_pending_guest_phone", fallbackPhone || "");
        }
        await signInWithRedirect(auth, provider);
        return new Promise(() => {});
      } else {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        return {
          email: user.email,
          name: user.displayName || user.email?.split("@")[0] || "Guest Learner",
          photoURL: user.photoURL,
          uid: user.uid
        };
      }
    } catch (error: any) {
      console.error("Firebase Google Sign-In error:", error);
      throw error;
    }
  } else {
    // Native Mobile (Expo Go / Android / iOS)
    // signInWithPopup is a web-only method not supported natively in React Native.
    // Provide a mobile guest authentication fallback using user-entered name and phone.
    const cleanName = (fallbackName || "Guest").trim();
    const cleanPhone = (fallbackPhone || "0000000000").trim();
    const sanitizedEmail = `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${cleanPhone.slice(-4)}@guest.nermaiias.com`;

    return {
      email: sanitizedEmail,
      name: cleanName,
      photoURL: "",
      uid: `mobile_guest_${Date.now()}`
    };
  }
};
