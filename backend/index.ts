import app from "./app";

/**
 * Main Firebase Cloud Functions & Cloud Run Serverless Entry Point
 * Exports Express app for Firebase Hosting rewrites and Cloud Functions / Cloud Run deployment.
 */
let firebaseApp: any = app;

try {
    // Dynamically require firebase-functions if available in environment
    const functions = require("firebase-functions");
    if (functions && functions.https) {
        firebaseApp = functions.https.onRequest(app);
    }
} catch (e) {
    // If firebase-functions package is not installed, export native Express app for Cloud Run / Node
}

export const api = firebaseApp;
export default app;
