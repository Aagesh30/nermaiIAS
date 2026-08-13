const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    });
}

const db = admin.firestore();

async function deleteCollection(collectionRef, batchSize = 100) {
    const query = collectionRef.limit(batchSize);
    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, resolve, reject);
    });
}

async function deleteQueryBatch(query, resolve, reject) {
    try {
        const snapshot = await query.get();
        const batchSize = snapshot.size;
        if (batchSize === 0) {
            resolve();
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Recurse to handle remaining docs
        process.nextTick(() => {
            deleteQueryBatch(query, resolve, reject);
        });
    } catch (err) {
        reject(err);
    }
}

async function run() {
    console.log("Starting database cleanup...");

    // 1. Retrieve all admin emails from Firestore admin_users collection
    console.log("Reading admin users...");
    const adminUsersSnap = await db.collection("admin_users").get();
    const adminEmails = new Set();
    
    adminUsersSnap.docs.forEach(doc => {
        const d = doc.data();
        if (d.email) adminEmails.add(d.email.toLowerCase().trim());
        if (d.username && d.username.includes("@")) {
            adminEmails.add(d.username.toLowerCase().trim());
        }
        console.log(`[ADMIN PRESERVE] Username: ${d.username} | Email: ${d.email || "N/A"}`);
    });
    
    // Always preserve default developer email
    adminEmails.add("developer@unistrix");
    console.log(`Total admins preserved: ${adminEmails.size}`);

    // 2. Wipe Firestore Collections except admin_users
    console.log("\nListing root collections in Firestore...");
    const collections = await db.listCollections();
    
    for (const col of collections) {
        const colId = col.id;
        if (colId === "admin_users") {
            console.log(`[FIRESTORE] Skipping admin credentials collection: ${colId}`);
            continue;
        }

        console.log(`[FIRESTORE] Deleting collection: ${colId}...`);
        await deleteCollection(col, 200);
        console.log(`[FIRESTORE] Successfully deleted collection: ${colId}`);
    }

    // 3. Clean Firebase Auth users
    console.log("\nCleaning Firebase Auth users...");
    let nextPageToken;
    let deletedAuthCount = 0;
    let keptAuthCount = 0;

    do {
        const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
        for (const userRecord of listUsersResult.users) {
            const email = (userRecord.email || "").toLowerCase().trim();
            const uid = userRecord.uid;
            
            // Check if user is in admin list or has developer claims
            const customClaims = userRecord.customClaims || {};
            const isDeveloperOrAdmin = 
                customClaims.role === "developer" || 
                customClaims.role === "admin" ||
                customClaims.role === "super_admin" ||
                adminEmails.has(email) || 
                email.includes("developer") || 
                email.includes("admin");

            if (isDeveloperOrAdmin) {
                console.log(`[AUTH] Keeping admin user: ${email || uid}`);
                keptAuthCount++;
            } else {
                console.log(`[AUTH] Deleting user: ${email || uid}`);
                await admin.auth().deleteUser(uid);
                deletedAuthCount++;
            }
        }
        nextPageToken = listUsersResult.pageToken;
    } while (nextPageToken);

    console.log(`\nCleanup complete!`);
    console.log(`Firestore: All non-admin collections deleted.`);
    console.log(`Firebase Auth: Deleted ${deletedAuthCount} non-admin users, kept ${keptAuthCount} admin/developer users.`);
}

run()
    .then(() => process.exit(0))
    .catch(err => {
        console.error("Cleanup failed:", err);
        process.exit(1);
    });
