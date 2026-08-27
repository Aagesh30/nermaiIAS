const path = require("path");

// Change directory to the backend directory
process.chdir(path.resolve(__dirname, ".."));

// Initialize backend environment config
require("../dist/config/env");

// Access drive upload service
const { uploadFileToGoogleDrive } = require("../dist/services/google_drive");

async function run() {
  try {
    console.log("Starting test upload to Google Drive via Apps Script...");
    const buffer = Buffer.from("Hello World from Test Upload Script using Fetch", "utf-8");
    const result = await uploadFileToGoogleDrive({
      fileName: "test-scratch-file-fetch.txt",
      mimeType: "text/plain",
      buffer: buffer,
      subPath: "Test Portal/Question Images"
    });
    console.log("Upload result:", JSON.stringify(result, null, 2));
  } catch (err) {
    console.error("Upload failed with error:", err);
  }
}

run();
