import { db } from './infrastructure/firebase';
async function run() {
  const snapshot = await db.collection('classes').where('title', '==', 'POLITY').get();
  snapshot.forEach(doc => console.log(doc.id, '=>', doc.data()));
  process.exit(0);
}
run();
