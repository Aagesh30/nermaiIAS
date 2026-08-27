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

async function run() {
    try {
        const snapshot = await db.collection("tests").where("isDeleted", "==", false).get();
        console.log(`Total active tests found: ${snapshot.size}`);
        const now = Date.now();
        let closedCount = 0;
        
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const endMs = data.endTime ? new Date(data.endTime).getTime() : null;
            if (endMs && now > endMs) {
                closedCount++;
                console.log(`Deleting Closed Test #${closedCount}: [ID: ${doc.id}] Title: ${data.title}, EndTime: ${data.endTime}`);
                batch.update(doc.ref, {
                    isDeleted: true,
                    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                    deletedBy: "admin_cleanup"
                });
            }
        });
        
        if (closedCount > 0) {
            await batch.commit();
            console.log(`Successfully deleted ${closedCount} closed tests.`);
        } else {
            console.log("No closed tests found to delete.");
        }
    } catch (err) {
        console.error("Error deleting tests:", err);
    }
    process.exit(0);
}

run();
