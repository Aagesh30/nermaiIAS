import { db } from './infrastructure/firebase';

async function queryClass() {
  const doc = await db.collection('classes').doc('1pmCGTKZ9Anz2B4vMs2b').get();
  console.log(JSON.stringify(doc.data(), null, 2));
}

queryClass().then(() => process.exit(0)).catch(console.error);
