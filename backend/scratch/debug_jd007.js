const dotenv = require("dotenv");
const path = require("path");

// Load .env.local
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

async function main() {
    console.log("--- SEARCHING ALL COLLECTIONS FOR 'c8a838d8-2191-472f-978f-ec79b70cbee2' ---");
    const collections = ["users", "staff", "students", "student_profiles", "admin_users"];
    for (const col of collections) {
        const doc = await db.collection(col).doc("c8a838d8-2191-472f-978f-ec79b70cbee2").get();
        if (doc.exists) {
            console.log(`Found in collection '${col}':`);
            console.log(JSON.stringify(doc.data(), null, 2));
        }
    }

    console.log("\n--- SEARCHING ADMIN_USERS COLLECTION FOR 'JD' or matching documents ---");
    const adminSnapshot = await db.collection("admin_users").get();
    adminSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (doc.id === "c8a838d8-2191-472f-978f-ec79b70cbee2" || (data.username && data.username.toLowerCase().includes("jd")) || (data.name && data.name.toLowerCase().includes("jd"))) {
            console.log(`Admin User Doc ID: ${doc.id}`);
            console.log(JSON.stringify(data, null, 2));
        }
    });

    console.log("\n--- SEARCHING STAFF COLLECTION FOR matching documents ---");
    const staffSnapshot = await db.collection("staff").get();
    staffSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (doc.id === "c8a838d8-2191-472f-978f-ec79b70cbee2" || (data.loginUsername && data.loginUsername.toLowerCase().includes("jd")) || (data.firstName && data.firstName.toLowerCase().includes("jd")) || (data.lastName && data.lastName.toLowerCase().includes("jd"))) {
            console.log(`Staff Doc ID: ${doc.id}`);
            console.log(JSON.stringify(data, null, 2));
        }
    });

    console.log("\n--- SEARCHING SUBJECTS FOR History or Maths defaultStaffId ---");
    const subjectsSnapshot = await db.collection("subjects").get();
    subjectsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.name === "History" || data.name === "Maths") {
            console.log(`Subject Doc ID: ${doc.id}`);
            console.log(JSON.stringify(data, null, 2));
        }
    });

    process.exit(0);
}

main().catch(console.error);
