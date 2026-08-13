const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "nermaiiasacademy-519c8",
        databaseURL: "https://nermaiiasacademy-519c8-default-rtdb.firebaseio.com"
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
