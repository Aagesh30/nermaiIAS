const admin = require("firebase-admin");
const dotenv = require("dotenv");
const bcrypt = require("bcrypt");
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

async function run() {
    const password = "nermaiadmin@unistrix";
    const passwordHash = await bcrypt.hash(password, 12);

    console.log("=== RESTORING SUPER ADMIN admin@nermai.com ===");

    // 1. Update admin_users collection
    const adminQuery = await db.collection("admin_users")
        .where("username", "==", "admin@nermai.com")
        .get();
    
    if (!adminQuery.empty) {
        for (const doc of adminQuery.docs) {
            await db.collection("admin_users").doc(doc.id).update({
                passwordHash: passwordHash,
                isDeleted: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Updated admin_users doc ID: ${doc.id}`);
        }
    } else {
        // Create if not exists
        await db.collection("admin_users").doc("super_admin_root").set({
            username: "admin@nermai.com",
            email: "admin@nermai.com",
            name: "Super Admin",
            role: "super_admin",
            passwordHash: passwordHash,
            tenantId: "default_tenant",
            isDeleted: false,
            createdAt: new Date().toISOString()
        });
        console.log("Created admin_users doc: super_admin_root");
    }

    // 2. Update users collection
    const usersQuery = await db.collection("users")
        .where("username", "==", "admin@nermai.com")
        .get();

    if (!usersQuery.empty) {
        for (const doc of usersQuery.docs) {
            await db.collection("users").doc(doc.id).update({
                password: password,
                isDeleted: false,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Updated users doc ID: ${doc.id}`);
        }
    } else {
        // Create if not exists
        await db.collection("users").doc("super_admin_root").set({
            id: "super_admin_root",
            username: "admin@nermai.com",
            password: password,
            name: "Super Admin",
            email: "admin@nermai.com",
            role: "super_admin",
            customPermissions: {},
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            isDeleted: false
        });
        console.log("Created users doc: super_admin_root");
    }

    // 3. Update staff collection
    const staffDoc = await db.collection("staff").doc("super_admin_root").get();
    if (staffDoc.exists) {
        await db.collection("staff").doc("super_admin_root").update({
            isDeleted: false,
            loginPassword: password,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("Updated staff doc: super_admin_root");
    } else {
        await db.collection("staff").doc("super_admin_root").set({
            id: "super_admin_root",
            employeeId: "EMP-000001",
            firstName: "Super",
            lastName: "Admin",
            dateOfBirth: "",
            gender: "",
            bloodGroup: "",
            email: "admin@nermai.com",
            phone: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
            designation: "Administrator",
            department: "Management",
            qualification: "",
            experienceYears: "",
            salary: "",
            joiningDate: new Date().toISOString().split("T")[0],
            photoUrl: "",
            emergencyContact: "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: "system",
            role: "super_admin",
            customPermissions: {},
            isDeleted: false,
            deletedAt: null
        });
        console.log("Created staff doc: super_admin_root");
    }

    console.log("=== COMPLETED ===");
}

run().catch(console.error);
