import * as admin from 'firebase-admin';

// Initialize with default credential if not initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function diagnose() {
  const classId = 'heJU8ctTKbR9SX5nTvle'; // INDIAN HISTORY 4
  console.log(`Diagnosing class: ${classId}`);
  
  const classDoc = await db.collection('classes').doc(classId).get();
  if (!classDoc.exists) {
    console.log("Class not found");
    return;
  }
  const cls = classDoc.data();
  console.log("Class:", { ...cls, encryptedVideoId: 'REDACTED' });
  
  const topicId = cls?.topicId;
  const topicDoc = await db.collection('topics').doc(topicId).get();
  if (!topicDoc.exists) {
    console.log(`Topic ${topicId} not found!`);
    return;
  }
  const topic = topicDoc.data();
  console.log("Topic:", topic);
  
  const subjectId = topic?.subjectId;
  const subjectDoc = await db.collection('subjects').doc(subjectId).get();
  if (!subjectDoc.exists) {
    console.log(`Subject ${subjectId} not found!`);
    return;
  }
  const subject = subjectDoc.data();
  console.log("Subject:", subject);
  
  const courseId = subject?.courseId;
  const courseDoc = await db.collection('courses').doc(courseId).get();
  if (!courseDoc.exists) {
    console.log(`Course ${courseId} not found!`);
    return;
  }
  const course = courseDoc.data();
  console.log("Course:", course);
}

diagnose().then(() => process.exit(0)).catch(console.error);
