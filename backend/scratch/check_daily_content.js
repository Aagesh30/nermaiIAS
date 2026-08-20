const path = require("path");

// Change directory to the backend directory so env.ts resolves paths correctly
process.chdir(path.resolve(__dirname, ".."));

// Initialize backend environment config relative to this script file
require("../dist/config/env");

// Access Firestore database instance initialized by the backend itself
const { db } = require("../dist/infrastructure/firebase/index");

async function run() {
  try {
    console.log("Fetching dailyContent collection...");
    const snapshot = await db.collection("dailyContent").get();
    console.log(`Found ${snapshot.size} documents.`);
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Document: ID=${doc.id}, Title="${data.title}", Type=${data.type}, Source=${data.source}, URL="${data.url}", DriveId=${data.googleDriveFileId}`);
    });
  } catch (err) {
    console.error("Error fetching collection:", err);
  }
}

run();
