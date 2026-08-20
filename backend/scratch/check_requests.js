const admin = require("firebase-admin");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

const localEnv = path.join(__dirname, "../.env.local");
const prodEnv = path.join(__dirname, "../.env");
if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
} else {
    dotenv.config({ path: prodEnv });
}

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        })
    });
}

const db = admin.firestore();

async function check() {
    try {
        console.log("Checking Firestore...");
        const snap = await db.collection("offlineTestPermissionRequests").get();
        console.log(`Found ${snap.size} requests in offlineTestPermissionRequests:`);
        snap.forEach(doc => {
            console.log(doc.id, "=>", doc.data());
        });
    } catch (e) {
        console.error("Error:", e);
    }
}

check();
