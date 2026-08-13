const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config({ path: path.join(__dirname, "../.env") });

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
    console.log("Searching users for username '1234'...");
    const snapshot = await db.collection("users").where("username", "==", "1234").get();
    console.log(`Found ${snapshot.size} user docs:`);
    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Doc ID: ${doc.id}`);
        console.log(`  role: ${data.role}`);
        console.log(`  studentId: ${data.studentId}`);
        console.log(`  isDeleted: ${data.isDeleted}`);
        console.log(`  deletedAt: ${data.deletedAt ? (data.deletedAt.toDate ? data.deletedAt.toDate().toISOString() : data.deletedAt) : "N/A"}`);
        console.log(`  createdAt: ${data.createdAt}`);
    });
    
    console.log("\nSearching students for loginUsername '1234'...");
    const studentSnapshot = await db.collection("students").where("loginUsername", "==", "1234").get();
    console.log(`Found ${studentSnapshot.size} student docs:`);
    studentSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`Doc ID: ${doc.id}`);
        console.log(`  name: ${data.name}`);
        console.log(`  isDeleted: ${data.isDeleted}`);
        console.log(`  createdAt: ${data.createdAt}`);
    });

    process.exit(0);
}

main().catch(console.error);
