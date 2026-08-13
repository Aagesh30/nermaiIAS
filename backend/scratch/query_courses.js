const dotenv = require("dotenv");
const path = require("path");

// Load .env.local
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const admin = require("firebase-admin");

const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            project_id: process.env.FIREBASE_PROJECT_ID,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: privateKey,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.firestore();

async function main() {
    console.log("--- GETTING ALL COURSES ---");
    const snapshot = await db.collection("courses").get();
    console.log(`Total courses: ${snapshot.size}`);
    snapshot.docs.forEach(doc => {
        console.log(`Course Doc ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });

    console.log("--- GETTING ALL BATCHES ---");
    const batchSnapshot = await db.collection("batches").get();
    console.log(`Total batches: ${batchSnapshot.size}`);
    batchSnapshot.docs.forEach(doc => {
        console.log(`Batch Doc ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });

    process.exit(0);
}

main().catch(console.error);
