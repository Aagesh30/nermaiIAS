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
    console.log("--- SEARCHING USERS COLLECTION FOR 'JD007' OR 'teacher_JD' ---");
    const usersSnapshot = await db.collection("users").get();
    usersSnapshot.docs.forEach(doc => {
        const d = doc.data();
        if ((d.username && d.username.toLowerCase().includes("jd")) || (d.name && d.name.toLowerCase().includes("jd"))) {
            console.log(`User Doc ID: ${doc.id}`);
            console.log(JSON.stringify(d, null, 2));
        }
    });

    process.exit(0);
}

main().catch(console.error);
