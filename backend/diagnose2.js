require('dotenv').config();
const { db } = require('./infrastructure/firebase');

async function diagnose() {
  console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'not-set');
  const classId = 'heJU8ctTKbR9SX5nTvle'; // INDIAN HISTORY 4
  console.log(`Diagnosing class: ${classId}`);
  
  const classDoc = await db.collection('classes').doc(classId).get();
  if (!classDoc.exists) {
    console.log("Class not found");
    return;
  }
  const cls = classDoc.data();
  console.log("Class tenantId:", cls.tenantId);
  
  const topicId = cls?.topicId;
  const topicDoc = await db.collection('topics').doc(topicId).get();
  if (!topicDoc.exists) {
    console.log(`Topic ${topicId} not found!`);
    return;
  }
  const topic = topicDoc.data();
  
  const subjectId = topic?.subjectId;
  const subjectDoc = await db.collection('subjects').doc(subjectId).get();
  if (!subjectDoc.exists) {
    console.log(`Subject ${subjectId} not found!`);
    return;
  }
  const subject = subjectDoc.data();
  
  const courseId = subject?.courseId;
  const courseDoc = await db.collection('courses').doc(courseId).get();
  if (!courseDoc.exists) {
    console.log(`Course ${courseId} not found!`);
    return;
  }
  const course = courseDoc.data();
  console.log("Course tenantId:", course.tenantId);
}

diagnose().then(() => process.exit(0)).catch(console.error);
