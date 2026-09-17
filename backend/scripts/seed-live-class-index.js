/**
 * seed-live-class-index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time script: creates the live_class_index/current document in Firestore.
 * The student-side onSnapshot listener watches this doc for real-time updates.
 * Without this document existing, the listener throws "permission-denied" even
 * though the Firestore rules say `allow read: if true`.
 *
 * Run once:  node backend/scripts/seed-live-class-index.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const admin = require('firebase-admin');

// Use Application Default Credentials (works inside Firebase Functions env)
// or service account key if GOOGLE_APPLICATION_CREDENTIALS is set
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function main() {
  const docRef = db.collection('live_class_index').doc('current');
  const snap = await docRef.get();

  if (snap.exists) {
    console.log('✅ live_class_index/current already exists:', snap.data());
    return;
  }

  await docRef.set({
    updatedAt: new Date().toISOString(),
    lastChangedClassId: 'init',
    action: 'INIT',
  });

  console.log('✅ Created live_class_index/current — student Firestore listeners will now connect successfully.');
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
