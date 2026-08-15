const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const crypto = require('crypto');
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

if (!clientEmail || !privateKey) {
  console.error("Error: Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in .env.local");
  process.exit(1);
}

// AES Decryption matching backend/core/utils/encryption.ts
function decrypt(text) {
  if (!text) return '';
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const key = Buffer.from(process.env.AES_SECRET_KEY || '12345678901234567890123456789012', 'utf-8');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return '';
  }
}

const app = initializeApp({
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  projectId
});

const db = getFirestore(app);
const storage = getStorage(app);

async function main() {
  console.log("Fetching resources from Firestore...");
  const snapshot = await db.collection('resources').orderBy('createdAt', 'desc').limit(5).get();
  
  console.log("\nRecent resources:");
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const decryptedPath = decrypt(data.storagePath);
    console.log(`- ID: ${doc.id}`);
    console.log(`  Title: ${data.title}`);
    console.log(`  Provider: ${data.provider}`);
    console.log(`  Encrypted storagePath: ${data.storagePath}`);
    console.log(`  Decrypted storagePath: ${decryptedPath}`);
    console.log(`  MimeType: ${data.mimeType}`);
    console.log(`  File size: ${data.fileSize}`);
    console.log(`  Created at: ${data.createdAt}`);
    
    if (data.provider === 'firebase_storage' && decryptedPath) {
      const bucketName = 'nermaiiasacademy-519c8-resources';
      const file = storage.bucket(bucketName).file(decryptedPath);
      try {
        const [exists] = await file.exists();
        console.log(`  File exists in "${bucketName}":`, exists);
      } catch (err) {
        console.log(`  Error checking file in "${bucketName}":`, err.message);
      }
      
      const defaultBucket = 'nermaiiasacademy-519c8.appspot.com';
      const fileDefault = storage.bucket(defaultBucket).file(decryptedPath);
      try {
        const [existsDefault] = await fileDefault.exists();
        console.log(`  File exists in "${defaultBucket}":`, existsDefault);
      } catch (err) {
        console.log(`  Error checking file in "${defaultBucket}":`, err.message);
      }
    }
    console.log("-----------------------------------------");
  }
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
