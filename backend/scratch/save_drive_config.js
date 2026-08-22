require('dotenv').config();
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

async function run() {
  try {
    const config = {
      appsScriptUrl: "https://script.google.com/macros/s/AKfycbzS2AFPce56GWDFuPS_v76eKK-N7aQ6x1PJcopG-SNo6FCfhQVMOTB1tZeul-UDRmCL/exec",
      rootFolderId: "1nPahkENBlw1St-4gjky5HRxZRznGT_97",
      folderName: "nermai",
      updatedAt: new Date().toISOString()
    };
    
    await db.collection("settings").doc("drive_config").set(config, { merge: true });
    console.log("✅ Google Drive config prepopulated successfully in Firestore!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to prepopulate Google Drive config:", error);
    process.exit(1);
  }
}

run();
