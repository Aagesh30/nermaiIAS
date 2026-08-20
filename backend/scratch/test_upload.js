const path = require("path");

// Change directory to the backend directory
process.chdir(path.resolve(__dirname, ".."));

// Initialize backend environment config
require("../dist/config/env");

// Access Firestore database instance initialized by the backend itself to initialize the Admin SDK
const { db } = require("../dist/infrastructure/firebase/index");

// Import the Google Drive upload function
const { uploadFileToGoogleDrive } = require("../dist/services/google_drive");

async function run() {
  try {
    console.log("Starting test upload to Google Drive using saved config...");
    const sampleBuffer = Buffer.from("Hello NERMAI IAS Academy Google Drive Upload Test!", "utf-8");
    const result = await uploadFileToGoogleDrive({
      fileName: "test_nermai_upload.txt",
      mimeType: "text/plain",
      buffer: sampleBuffer,
      subPath: "LMS/Daily Content"
    });

    console.log("Upload result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Upload error:", err);
  }
}

run();
