const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "nermaiiasacademy-519c8"
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
