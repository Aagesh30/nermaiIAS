import { db } from './infrastructure/firebase';

async function run() {
  const users = await db.collection('student_profiles').get();
  let student: any;
  for (const doc of users.docs) {
    if (doc.data().name === 'AAGESH N' || doc.data().displayName === 'AAGESH N' || doc.data().studentName === 'AAGESH N' || doc.data().name?.includes('AAGESH')) {
       student = { id: doc.id, ...doc.data() };
       break;
    }
  }
  if (!student) {
     console.log('Student not found');
     return;
  }
  console.log('Student:', student.name, student.email);
  const active = (student.programMemberships || [])
    .filter((m: any) => m.status === 'active' && m.batchId)
    .map((m: any) => m.batchId);
  const studentBatches = Array.from(new Set(active));
  console.log('Student batches:', studentBatches);

  const classes = await db.collection('classes').where('classType', 'in', ['recorded', 'youtube_recorded']).get();
  console.log('Total recorded classes in DB:', classes.docs.length);

  for (const doc of classes.docs) {
     const cls = doc.data();
     console.log('Class:', cls.title || cls.name, '| classType:', cls.classType, '| targetBatches:', cls.targetBatchIds, '| accessLevel:', cls.accessLevel);
  }
}
run().then(() => process.exit(0)).catch(console.error);
