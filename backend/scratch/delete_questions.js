const { db } = require("../dist/infrastructure/firebase/index");

async function deleteQuestionsCollection() {
    try {
        console.log("Starting deletion of 'questions' collection only...");
        const collectionRef = db.collection("questions");
        let totalDeleted = 0;

        while (true) {
            // Fetch in batches of 400
            const snapshot = await collectionRef.limit(400).get();
            if (snapshot.empty) {
                break;
            }

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            totalDeleted += snapshot.size;
            console.log(`Deleted batch of ${snapshot.size} documents (Total deleted so far: ${totalDeleted})`);
        }

        console.log(`✅ Successfully deleted all ${totalDeleted} documents from 'questions' collection.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error deleting questions collection:", error);
        process.exit(1);
    }
}

deleteQuestionsCollection();
