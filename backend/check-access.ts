import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function check() {
  const classes = await db.collection('classes').limit(20).get();
  for (const doc of classes.docs) {
    const data = doc.data();
    console.log(doc.id, '->', {
      title: data.title,
      accessLevel: data.accessLevel,
      targetBatchIds: data.targetBatchIds,
      classType: data.classType
    });
  }
}

check().then(() => process.exit(0)).catch(console.error);
