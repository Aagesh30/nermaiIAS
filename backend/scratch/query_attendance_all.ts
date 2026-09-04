import dotenv from 'dotenv';
dotenv.config();
import { db } from '../infrastructure/firebase';

async function checkAll() {
  console.log('\n=== lms_class_attendance collection ===');
  const lmsSnap = await db.collection('lms_class_attendance').get();
  console.log('Total docs in lms_class_attendance:', lmsSnap.size);
  lmsSnap.forEach(doc => {
    console.log('Doc ID:', doc.id, 'Data:', JSON.stringify(doc.data()));
  });

  console.log('\n=== live_sessions joinedParticipantsDetails check ===');
  const liveSnap = await db.collection('live_sessions').get();
  liveSnap.forEach(doc => {
    const data = doc.data();
    if (data.joinedParticipantsDetails && Object.keys(data.joinedParticipantsDetails).length > 0) {
      console.log('LiveSession ID:', doc.id, 'classId:', data.classId, 'Title:', data.title, 'Participants:', JSON.stringify(data.joinedParticipantsDetails));
    }
  });
}

checkAll().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
