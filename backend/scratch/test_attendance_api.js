const dotenv = require("dotenv");
const path = require("path");
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

async function checkPolitySessions() {
  const sessionIds = ['U35Gon1DAP3dtw4TeUUx', 'OFF6Tq3gXZybtl2XcPmC', '9s0ToPgvQls3kuEowwjO', 'JzFTmatvJ0T9J8Y4VAWF'];
  for (const sId of sessionIds) {
    console.log(`\n=== CHECKING SESSION/CLASS ID: ${sId} ===`);
    const lsDoc = await db.collection('live_sessions').doc(sId).get();
    if (lsDoc.exists) {
      console.log(`LiveSession doc found:`, lsDoc.data());
    } else {
      console.log(`LiveSession doc NOT found for ID: ${sId}`);
    }

    const clsDoc = await db.collection('classes').doc(sId).get();
    if (clsDoc.exists) {
      console.log(`Classes doc found:`, clsDoc.data());
    } else {
      console.log(`Classes doc NOT found for ID: ${sId}`);
    }

    const attSnap = await db.collection('lms_class_attendance').where('classId', '==', sId).get();
    console.log(`lms_class_attendance for classId ${sId}: ${attSnap.size} docs`);
    attSnap.docs.forEach(d => console.log('  Att doc:', d.id, d.data()));
  }
}

checkPolitySessions().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
