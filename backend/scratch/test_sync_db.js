const dotenv = require("dotenv");
const path = require("path");

// Load .env.local from backend
dotenv.config({ path: path.join(__dirname, "../.env.local") });

const admin = require("firebase-admin");
const privateKey = process.env.FIREBASE_PRIVATE_KEY 
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : undefined;

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            project_id: process.env.FIREBASE_PROJECT_ID,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: privateKey,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const db = admin.firestore();
const XLSX = require('xlsx');

const LMS_COLLECTIONS = {
  COURSES: 'courses',
  SUBJECTS: 'subjects',
  TOPICS: 'topics',
  SUBTOPICS: 'subtopics',
  CLASSES: 'classes',
};

async function main() {
  const courseId = 'erp_course_ldc'; // target course (LDC)
  const filePath = path.join(__dirname, '../..', 'Nermai_Faculty_Tracker (2).xlsx');
  const userId = 'admin_test';

  console.log(`Starting sync for course ${courseId} using file: ${filePath}`);

  const workbook = XLSX.readFile(filePath);
  
  const subjectSheetNames = [
    'History',
    'Geography',
    'Polity',
    'Economy',
    'Environment',
    'Science',
    'Maths',
    'Aptitude',
    'Reasoning',
    'World History'
  ];

  const result = [];

  for (const sheetName of workbook.SheetNames) {
    if (!subjectSheetNames.includes(sheetName)) continue;

    console.log(`Processing sheet: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Find or create subject
    const subjectSnapshot = await db.collection(LMS_COLLECTIONS.SUBJECTS)
      .where('courseId', '==', courseId)
      .where('name', '==', sheetName)
      .where('isDeleted', '==', false)
      .get();
    
    let subject;
    if (!subjectSnapshot.empty) {
      subject = { id: subjectSnapshot.docs[0].id, ...subjectSnapshot.docs[0].data() };
      console.log(`Found existing subject: ${sheetName} (ID: ${subject.id})`);
    } else {
      const docRef = db.collection(LMS_COLLECTIONS.SUBJECTS).doc();
      subject = {
        id: docRef.id,
        courseId,
        name: sheetName,
        order: subjectSheetNames.indexOf(sheetName) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: userId,
        updatedBy: userId,
        isDeleted: false
      };
      await docRef.set(subject);
      console.log(`Created new subject: ${sheetName} (ID: ${subject.id})`);
    }

    let currentTopicName = '';
    let currentTopic = null;
    let orderIndex = 1;

    for (const row of rows) {
      const keys = Object.keys(row);
      const sNoKey = keys.find(k => k.startsWith('NERMAI IAS ACADEMY') || k.includes('S.No'));
      if (!sNoKey) continue;
      const sNo = row[sNoKey];
      if (sNo === 'S.No') continue;

      const topicVal = row['__EMPTY'];
      const subtopicVal = row['__EMPTY_1'];

      if (topicVal) {
        currentTopicName = String(topicVal).trim();
        currentTopic = null; // Reset
      }

      if (!subtopicVal) continue;
      const subtopicName = String(subtopicVal).trim();

      // 1. Find or create Topic
      if (currentTopicName && !currentTopic) {
        const topicSnapshot = await db.collection(LMS_COLLECTIONS.TOPICS)
          .where('subjectId', '==', subject.id)
          .where('name', '==', currentTopicName)
          .where('isDeleted', '==', false)
          .get();

        if (!topicSnapshot.empty) {
          currentTopic = { id: topicSnapshot.docs[0].id, ...topicSnapshot.docs[0].data() };
        } else {
          const docRef = db.collection(LMS_COLLECTIONS.TOPICS).doc();
          currentTopic = {
            id: docRef.id,
            subjectId: subject.id,
            name: currentTopicName,
            order: orderIndex++,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: userId,
            updatedBy: userId,
            isDeleted: false
          };
          await docRef.set(currentTopic);
        }
      }

      if (!currentTopic) continue;

      // Extract tracking attributes
      const facultyName = row['__EMPTY_2'] ? String(row['__EMPTY_2']).trim() : '';
      const dateOfClass = row['__EMPTY_3'] ? String(row['__EMPTY_3']).trim() : '';
      const classNo = row['__EMPTY_4'] ? Number(row['__EMPTY_4']) : 0;
      const durationHrs = row['__EMPTY_5'] ? Number(row['__EMPTY_5']) : 0;
      const mode = row['__EMPTY_6'] ? String(row['__EMPTY_6']).trim() : '';
      const batchSection = row['__EMPTY_7'] ? String(row['__EMPTY_7']).trim() : '';
      const coverageStatus = row['__EMPTY_8'] ? String(row['__EMPTY_8']).trim() : '';
      const percentCovered = row['__EMPTY_9'] ? Number(row['__EMPTY_9']) : 0;
      const testConducted = row['__EMPTY_10'] ? String(row['__EMPTY_10']).trim() : '';
      const testDate = row['__EMPTY_11'] ? String(row['__EMPTY_11']).trim() : '';
      const avgScore = row['__EMPTY_12'] ? Number(row['__EMPTY_12']) : 0;
      const remarks = row['__EMPTY_13'] ? String(row['__EMPTY_13']).trim() : '';

      const subtopicPayload = {
        topicId: currentTopic.id,
        name: subtopicName,
        order: orderIndex++,
        description: remarks || '',
        completed: coverageStatus.toLowerCase() === 'done',
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        // Additional tracking properties
        facultyName,
        dateOfClass,
        classNo,
        durationHrs,
        mode,
        batchSection,
        coverageStatus,
        percentCovered,
        testConducted,
        testDate,
        avgScore,
        remarks
      };

      // 2. Find or create/update Subtopic
      const subtopicSnapshot = await db.collection(LMS_COLLECTIONS.SUBTOPICS)
        .where('topicId', '==', currentTopic.id)
        .where('name', '==', subtopicName)
        .where('isDeleted', '==', false)
        .get();

      if (!subtopicSnapshot.empty) {
        const subtopicId = subtopicSnapshot.docs[0].id;
        await db.collection(LMS_COLLECTIONS.SUBTOPICS).doc(subtopicId).update(subtopicPayload);
      } else {
        const docRef = db.collection(LMS_COLLECTIONS.SUBTOPICS).doc();
        const newSubtopic = {
          id: docRef.id,
          createdAt: new Date().toISOString(),
          createdBy: userId,
          isDeleted: false,
          ...subtopicPayload
        };
        await docRef.set(newSubtopic);
      }
    }

    result.push({ subjectName: sheetName, rowsCount: rows.length });
  }

  console.log('Sync finished successfully! Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(console.error);
