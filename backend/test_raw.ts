import { db } from './infrastructure/firebase';

async function queryRaw() {
  const doc = await db.collection('live_sessions').doc('xbXbEkd461AF3QjwXu8C').get();
  console.log(JSON.stringify(doc.data(), null, 2));
}

queryRaw().then(() => process.exit(0)).catch(console.error);
