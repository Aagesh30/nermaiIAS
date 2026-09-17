import admin from "firebase-admin";

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "nermaiiasacademy-519c8"
    });
}

const db = admin.firestore();

async function purgeAllExceptTwo() {
    console.log("Fetching active tests...");
    const testsSnap = await db.collection("tests").get();
    
    const preservedTitles = ["Maths Daily test", "maths _11.09.2026"];
    const activeTestIds = new Set<string>();
    
    let deletedTestsCount = 0;

    for (const doc of testsSnap.docs) {
        const title = (doc.data().title || "").trim();
        const shouldPreserve = preservedTitles.some(p => title.toLowerCase() === p.toLowerCase());
        
        if (shouldPreserve) {
            activeTestIds.add(doc.id);
            console.log(`[KEEP TEST] ID: ${doc.id} | Title: "${title}"`);
            await doc.ref.update({ isDeleted: false, published: true, status: "published" });
        } else {
            console.log(`[HARD DELETE TEST] ID: ${doc.id} | Title: "${title}"`);
            await doc.ref.delete();
            deletedTestsCount++;
        }
    }

    console.log(`\nPreserved ${activeTestIds.size} tests. Hard-deleted ${deletedTestsCount} test documents.`);

    // Purge orphan results
    console.log("\nPurging orphan results...");
    const resultsSnap = await db.collection("results").get();
    let resultsPurged = 0;
    for (const doc of resultsSnap.docs) {
        if (!activeTestIds.has(doc.data().testId)) {
            await doc.ref.delete();
            resultsPurged++;
        }
    }
    console.log(`Purged ${resultsPurged} result documents.`);

    // Purge orphan student_attempts
    console.log("\nPurging orphan student_attempts...");
    const attemptsSnap = await db.collection("student_attempts").get();
    let attemptsPurged = 0;
    for (const doc of attemptsSnap.docs) {
        if (!activeTestIds.has(doc.data().testId)) {
            await doc.ref.delete();
            attemptsPurged++;
        }
    }
    console.log(`Purged ${attemptsPurged} attempt documents.`);

    // Purge orphan leaderboards
    console.log("\nPurging orphan leaderboards...");
    const lbSnap = await db.collection("leaderboards").get();
    let lbPurged = 0;
    for (const doc of lbSnap.docs) {
        if (!activeTestIds.has(doc.data().testId)) {
            await doc.ref.delete();
            lbPurged++;
        }
    }
    console.log(`Purged ${lbPurged} leaderboard documents.`);

    console.log("\n✅ COMPLETE: Database now contains strictly ONLY the 2 requested tests and their matching results!");
    process.exit(0);
}

purgeAllExceptTwo().catch(err => {
    console.error("Purge error:", err);
    process.exit(1);
});
