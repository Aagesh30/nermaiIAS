import { db } from "../backend/infrastructure/firebase";

async function deleteAllTests() {
  console.log("Checking tests and test results in Firestore...");

  // 1. Fetch all tests
  const testsSnap = await db.collection("tests").get();
  console.log(`Found ${testsSnap.size} tests in 'tests' collection.`);
  
  // 2. Fetch all test results
  const resultsSnap = await db.collection("results").get();
  console.log(`Found ${resultsSnap.size} documents in 'results' collection.`);

  // 3. Fetch all test attempts (studentAttempts or attempts)
  const attemptsSnap = await db.collection("studentAttempts").get();
  console.log(`Found ${attemptsSnap.size} documents in 'studentAttempts' collection.`);

  // 4. Fetch offline permission requests
  const reqsSnap = await db.collection("offlineTestPermissionRequests").get();
  console.log(`Found ${reqsSnap.size} documents in 'offlineTestPermissionRequests' collection.`);

  // 5. Fetch testFeedback
  const fbSnap = await db.collection("testFeedback").get();
  console.log(`Found ${fbSnap.size} documents in 'testFeedback' collection.`);

  // Delete / Soft-delete all tests
  const batchSize = 400;
  
  // Hard delete / purge tests
  let deletedCount = 0;
  let batch = db.batch();
  for (const doc of testsSnap.docs) {
    batch.delete(doc.ref);
    deletedCount++;
    if (deletedCount % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Deleted all ${testsSnap.size} tests from 'tests'.`);

  // Delete results
  deletedCount = 0;
  batch = db.batch();
  for (const doc of resultsSnap.docs) {
    batch.delete(doc.ref);
    deletedCount++;
    if (deletedCount % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Deleted all ${resultsSnap.size} results from 'results'.`);

  // Delete studentAttempts
  deletedCount = 0;
  batch = db.batch();
  for (const doc of attemptsSnap.docs) {
    batch.delete(doc.ref);
    deletedCount++;
    if (deletedCount % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Deleted all ${attemptsSnap.size} studentAttempts.`);

  // Delete offline permission requests
  deletedCount = 0;
  batch = db.batch();
  for (const doc of reqsSnap.docs) {
    batch.delete(doc.ref);
    deletedCount++;
    if (deletedCount % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Deleted all ${reqsSnap.size} offlineTestPermissionRequests.`);

  // Delete testFeedback
  deletedCount = 0;
  batch = db.batch();
  for (const doc of fbSnap.docs) {
    batch.delete(doc.ref);
    deletedCount++;
    if (deletedCount % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`Deleted all ${fbSnap.size} testFeedback.`);

  console.log("All tests and test history have been completely deleted!");
  process.exit(0);
}

deleteAllTests().catch(err => {
  console.error("Error deleting tests:", err);
  process.exit(1);
});
