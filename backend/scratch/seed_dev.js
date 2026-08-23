const admin = require("firebase-admin");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
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

async function seed() {
    console.log("Seeding developer user...");
    const username = "developer@unistrix";
    const password = "Unistrix@24252630";
    const passwordHash = await bcrypt.hash(password, 12);

    const docId = "developer_root";
    await db.collection("admin_users").doc(docId).set({
        username: username,
        email: username,
        name: "Unistrix Developer",
        role: "developer",
        passwordHash: passwordHash,
        tenantId: "default_tenant",
        isDeleted: false,
        createdAt: new Date().toISOString()
    });
    console.log("✅ Seeded developer user in admin_users collection!");

    // Also verify by printing
    const doc = await db.collection("admin_users").doc(docId).get();
    console.log("Document content in Firestore:", doc.data());
}

seed().catch(console.error);
