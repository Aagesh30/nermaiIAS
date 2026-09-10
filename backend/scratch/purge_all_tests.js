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

async function deleteCollection(collectionName) {
    const snap = await db.collection(collectionName).get();
    console.log(`Deleting ${snap.size} documents from collection '${collectionName}'...`);
    
    if (snap.empty) return 0;
    
    let batch = db.batch();
    let count = 0;
    let totalDeleted = 0;

    for (const doc of snap.docs) {
        batch.delete(doc.ref);
        count++;
        totalDeleted++;
        if (count >= 400) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
    console.log(`Successfully deleted ${totalDeleted} documents from '${collectionName}'.`);
    return totalDeleted;
}

async function purgeAllTests() {
    try {
        console.log("Starting full purge of all test collections in Firebase Firestore...");
        
        await deleteCollection("tests");
        await deleteCollection("results");
        await deleteCollection("studentAttempts");
        await deleteCollection("offlineTestPermissionRequests");
        await deleteCollection("testFeedback");

        console.log("\nPurge completed successfully! All old test data has been deleted from Firebase.");
    } catch (err) {
        console.error("Error purging test collections:", err);
    }
    process.exit(0);
}

purgeAllTests();
