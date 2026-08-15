const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const admin = require('firebase-admin');

const run = async () => {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  const db = admin.firestore();

  // Look up user by ID f6d0db45-eb74-401b-a6d3-5a25c792ecf8
  const userDoc = await db.collection('users').doc('f6d0db45-eb74-401b-a6d3-5a25c792ecf8').get();
  if (userDoc.exists) {
    console.log('User document found:');
    console.log(JSON.stringify(userDoc.data(), null, 2));
  } else {
    console.log('User document not found in "users" collection.');
  }
};

run().catch(console.error);
