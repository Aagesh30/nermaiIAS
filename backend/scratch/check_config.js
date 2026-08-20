const path = require("path");

// Change directory to the backend directory
process.chdir(path.resolve(__dirname, ".."));

// Initialize backend environment config
require("../dist/config/env");

// Access Firestore database instance
const { db } = require("../dist/infrastructure/firebase/index");

async function run() {
  try {
    console.log("Fetching settings/drive_config...");
    const doc = await db.collection("settings").doc("drive_config").get();
    if (doc.exists) {
      console.log("Document data:", JSON.stringify(doc.data(), null, 2));
    } else {
      console.log("settings/drive_config does not exist!");
    }
  } catch (err) {
    console.error("Error fetching doc:", err);
  }
}

run();
