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
  console.log('Using project:', process.env.FIREBASE_PROJECT_ID);

  // 1. Get LMS courses
  const lmsSnapshot = await db.collection('courses')
    .where('tenantId', '==', 'default_tenant')
    .where('isDeleted', '==', false)
    .get();
  console.log(`LMS Courses count (tenantId == 'default_tenant'):`, lmsSnapshot.size);
  lmsSnapshot.forEach(doc => {
    console.log(' - Course ID:', doc.id, 'Name:', doc.data().name);
  });

  // 2. Get batches
  const batchSnapshot = await db.collection('batches')
    .where('isDeleted', '==', false)
    .get();
  console.log(`Batches count:`, batchSnapshot.size);
  batchSnapshot.forEach(doc => {
    console.log(' - Batch ID:', doc.id, 'Batch Name:', doc.data().batchName, 'Course:', doc.data().course);
  });
};

run().catch(console.error);
