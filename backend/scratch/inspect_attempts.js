const admin = require("firebase-admin");
require("dotenv").config({ path: "backend/.env" });

const clientEmail = process.env.DRIVE_CLIENT_EMAIL;
let privateKey = process.env.DRIVE_PRIVATE_KEY || "";
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, "\n");

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: "nermaiiasacademy-519c8",
        clientEmail,
        privateKey
    }),
    databaseURL: "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
});

const db = admin.firestore();

async function inspectAttempts() {
    const attemptsSnap = await db.collection("student_attempts").get();
    const sorted = attemptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    sorted.sort((a, b) => {
        const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return tB - tA;
    });

    console.log("=== MOST RECENT 3 ATTEMPTS ===");
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
        const att = sorted[i];
        console.log("Attempt ID:", att.id, "CreatedAt:", att.createdAt?.toDate?.() || att.createdAt, "Status:", att.status, "Answers:", att.answers);
        const resDoc = await db.collection("results").doc(att.id).get();
        if (resDoc.exists) {
            const r = resDoc.data();
            console.log("   Result:", r.obtainedMarks, r.status, "Correct:", r.correct, "Wrong:", r.wrong, "Skipped:", r.skipped);
            console.log("   Q Details sample:", JSON.stringify(r.questionDetails?.[0]));
        } else {
            console.log("   Result doc DOES NOT EXIST!");
        }
    }
}

inspectAttempts().catch(console.error);
