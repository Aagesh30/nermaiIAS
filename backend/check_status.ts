import { db } from './infrastructure/firebase';

async function checkSessions() {
  const classesSnap = await db.collection('classes').where('classType', '==', 'live').get();
  
  for (const doc of classesSnap.docs) {
    const cls = doc.data();
    if (cls.title?.includes('MEDIVAL') || cls.name?.includes('MEDIVAL')) {
      console.log('Found class:', doc.id, cls.title, cls.status, cls.classType);
      
      const liveSessionSnap = await db.collection('live_sessions').where('classId', '==', doc.id).get();
      liveSessionSnap.docs.forEach(lsDoc => {
        console.log('  LiveSession:', lsDoc.id, lsDoc.data().status);
      });
    }
  }
}

checkSessions().then(() => process.exit(0)).catch(console.error);
