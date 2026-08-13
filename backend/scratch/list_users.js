const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
}

const db = admin.firestore();

async function run() {
    console.log("=== USERS COLLECTION ===");
    const usersSnapshot = await db.collection("users").get();
    usersSnapshot.docs.forEach(doc => {
        const d = doc.data();
        console.log(`[USER] ID: ${doc.id} | username: ${d.username} | isDeleted: ${d.isDeleted}`);
    });

    console.log("\n=== STAFF COLLECTION ===");
    const staffSnapshot = await db.collection("staff").get();
    staffSnapshot.docs.forEach(doc => {
        const d = doc.data();
        console.log(`[STAFF] ID: ${doc.id} | name: ${d.firstName} ${d.lastName} | isDeleted: ${d.isDeleted}`);
    });
}

run().catch(console.error);
