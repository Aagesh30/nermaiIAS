import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import admin from "firebase-admin";
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }) });
}
const db = admin.firestore();
async function run() {
    const snap = await db.collection("student_attempts").get();
    console.log("Total attempts:", snap.docs.length);
    snap.docs.forEach(doc => {
        const d = doc.data();
        if (doc.id.startsWith("549619a7") || doc.id.includes("549619a7")) {
            console.log("=== Attempt ID:", doc.id, "===");
            console.log(JSON.stringify(d, null, 2));
        }
    });
}
run().catch(console.error);
