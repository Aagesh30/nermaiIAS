const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

async function run() {
  const db = admin.firestore();
  const attSnap = await db.collection("lms_attendance").get();
  
  console.log(`Found ${attSnap.size} attendance records.`);
  attSnap.forEach(doc => {
    console.log(doc.id, doc.data());
  });
}

run().catch(console.error);
