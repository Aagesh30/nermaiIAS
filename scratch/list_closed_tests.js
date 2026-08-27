const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nermaiiasacademy-519c8",
        databaseURL: process.env.FIREBASE_DATABASE_URL || "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
    });
}

const db = admin.firestore();

async function run() {
    try {
        const snapshot = await db.collection("tests").where("isDeleted", "==", false).get();
        console.log(`Total tests found: ${snapshot.size}`);
        const now = Date.now();
        let closedCount = 0;
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const endMs = data.endTime ? new Date(data.endTime).getTime() : null;
            if (endMs && now > endMs) {
                closedCount++;
                console.log(`Closed Test #${closedCount}: [ID: ${doc.id}] Title: ${data.title}, EndTime: ${data.endTime}`);
            }
        });
        console.log(`Total Closed Tests found: ${closedCount}`);
    } catch (err) {
        console.error("Error listing tests:", err);
    }
    process.exit(0);
}

run();
