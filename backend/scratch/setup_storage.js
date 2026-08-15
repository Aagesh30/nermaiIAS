const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from backend/.env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const projectId = process.env.FIREBASE_PROJECT_ID || 'nermaiiasacademy-519c8';
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : null;

const storageClient = new Storage({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  }
});

async function main() {
  const bucketName = 'nermaiiasacademy-519c8-resources';
  console.log(`Listing files in bucket "${bucketName}"...`);
  
  try {
    const bucket = storageClient.bucket(bucketName);
    const [files] = await bucket.getFiles();
    console.log("Files found:");
    files.forEach(file => {
      console.log(`- ${file.name} (size: ${file.metadata.size} bytes)`);
    });
  } catch (error) {
    console.error("Listing files failed:", error);
  }
}

main().then(() => {
  console.log("Done.");
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
