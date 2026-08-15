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
  console.error("Error: Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

// AES-256-GCM Decryption matching backend/core/utils/encryption.ts
const ALGORITHM = 'aes-256-gcm';
const FALLBACK_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const keyHex = process.env.VIDEO_ENCRYPTION_KEY || FALLBACK_KEY;
const keyBuffer = Buffer.from(keyHex, 'hex');

function decrypt(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted data format');
    
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
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
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const decryptedPath = decrypt(data.storagePath);
    console.log(`\nID: ${doc.id}`);
    console.log(`Title: ${data.title}`);
    console.log(`Decrypted path: ${decryptedPath}`);
    
    if (decryptedPath) {
      const bucketName = 'nermaiiasacademy-519c8-resources';
      const file = storage.bucket(bucketName).file(decryptedPath);
      try {
        const [exists] = await file.exists();
        console.log(`File exists in "${bucketName}":`, exists);
      } catch (err) {
        console.log(`Error checking in "${bucketName}":`, err.message);
      }
    }
  }
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
