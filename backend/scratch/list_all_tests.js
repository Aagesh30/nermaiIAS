const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
const admin = require("firebase-admin");

if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined;

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

async function run() {
    try {
        const snapshot = await db.collection("tests").get();
        console.log(`Total tests in 'tests' collection: ${snapshot.size}`);
        snapshot.docs.forEach((doc, idx) => {
            const d = doc.data();
            console.log(`Test #${idx+1}: [ID: ${doc.id}] Title: "${d.title}", isDeleted: ${d.isDeleted}`);
        });

        const resultsSnap = await db.collection("results").get();
        console.log(`Total documents in 'results': ${resultsSnap.size}`);

        const attemptsSnap = await db.collection("studentAttempts").get();
        console.log(`Total documents in 'studentAttempts': ${attemptsSnap.size}`);
    } catch (err) {
        console.error("Error listing tests:", err);
    }
    process.exit(0);
}

run();
