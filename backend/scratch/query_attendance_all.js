const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('../infrastructure/firebase/serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAll() {
  console.log('=== 1. classes collection ===');
  const classesSnap = await db.collection('classes').get();
  classesSnap.forEach(doc => {
    console.log('Class ID:', doc.id, 'Data:', JSON.stringify(doc.data()));
  });

  console.log('\n=== 2. lms_class_attendance collection ===');
  const lmsSnap = await db.collection('lms_class_attendance').get();
  console.log('Total docs in lms_class_attendance:', lmsSnap.size);
  lmsSnap.forEach(doc => {
    console.log('Doc ID:', doc.id, 'Data:', JSON.stringify(doc.data()));
  });

  console.log('\n=== 3. live_sessions collection ===');
  const liveSnap = await db.collection('live_sessions').get();
  console.log('Total docs in live_sessions:', liveSnap.size);
  for (const doc of liveSnap.docs) {
    console.log('LiveSession ID:', doc.id, 'Data:', JSON.stringify(doc.data()));
    const partSnap = await doc.ref.collection('participants').get();
    console.log('  Participants subcollection count:', partSnap.size);
    partSnap.forEach(p => console.log('    Participant ID:', p.id, 'Data:', JSON.stringify(p.data())));
  }

  console.log('\n=== 4. attendance_sessions collection ===');
  const attSnap = await db.collection('attendance_sessions').get();
  console.log('Total docs in attendance_sessions:', attSnap.size);
  attSnap.forEach(doc => {
    console.log('Doc ID:', doc.id, 'Data:', JSON.stringify(doc.data()));
  });
}

checkAll().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
