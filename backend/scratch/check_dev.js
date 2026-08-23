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

async function check() {
    console.log("Checking admin_users for developer...");
    const adminSnap = await db.collection("admin_users").where("username", "==", "developer@unistrix").get();
    if (adminSnap.empty) {
        console.log("No developer@unistrix in admin_users");
    } else {
        adminSnap.forEach(doc => {
            console.log("Found in admin_users:", doc.id, doc.data());
        });
    }

    console.log("Checking users for developer...");
    const usersSnap = await db.collection("users").where("username", "==", "developer@unistrix").get();
    if (usersSnap.empty) {
        console.log("No developer@unistrix in users");
    } else {
        usersSnap.forEach(doc => {
            console.log("Found in users:", doc.id, doc.data());
        });
    }

    console.log("Checking Firebase Auth for developer...");
    try {
        const userRecord = await admin.auth().getUserByEmail("developer@unistrix");
        console.log("Found in Firebase Auth:", userRecord.uid, userRecord.customClaims);
    } catch (e) {
        console.log("Error finding in Firebase Auth:", e.message);
    }
}

check().catch(console.error);
