const dotenv = require("dotenv");
const path = require("path");

// Load .env relative to backend/scratch/ (so ../.env is backend/.env)
dotenv.config({ path: path.join(__dirname, "../.env") });

console.log("Loaded Project ID:", process.env.FIREBASE_PROJECT_ID);

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
    console.log("Fetching admissions...");
    const snapshot = await db.collection("admissions").get();
    console.log(`Total admissions found: ${snapshot.size}`);
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`  Name: ${data.name}`);
        console.log(`  Phone: ${data.phone}`);
        console.log(`  Status: ${data.status}`);
        console.log(`  IsDeleted: ${data.isDeleted}`);
        console.log(`  CreatedAt: ${data.createdAt ? data.createdAt.toDate().toISOString() : "N/A"}`);
    });
    process.exit(0);
}

main().catch(console.error);
