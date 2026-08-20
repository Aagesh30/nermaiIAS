import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Import db directly from infrastructure/firebase to avoid double settings initialization
import { db } from "../infrastructure/firebase";
import { getMyLmsClasses } from "../modules/students/lms-service";

async function run() {
  console.log("=== HYBRID MODE ACCESS E2E TEST ===");

  const testStudentId = "test-hybrid-student-id";
  const testUserId = "test-hybrid-user-id";
  const ldcBatchId = "test-ldc-batch-id";
  const udcBatchId = "test-udc-batch-id";
  const classLdcId = "test-class-ldc-id";
  const classUdcId = "test-class-udc-id";

  try {
    // 1. Create mock batches
    console.log("Setting up mock batches...");
    await db.collection("batches").doc(ldcBatchId).set({
      id: ldcBatchId,
      batchName: "LDC Batch",
      course: "LDC Course",
      isDeleted: false
    });
    await db.collection("batches").doc(udcBatchId).set({
      id: udcBatchId,
      batchName: "UDC Batch",
      course: "UDC Course",
      isDeleted: false
    });

    // 2. Create mock student
    console.log("Creating mock student...");
    await db.collection("students").doc(testStudentId).set({
      id: testStudentId,
      batches: ["LDC Batch", "UDC Batch"],
      batchModes: {
        "LDC Batch": ["online"],
        "UDC Batch": ["offline"]
      },
      batch: "LDC Batch",
      type: "online",
      firstName: "Hybrid",
      lastName: "Tester",
      isDeleted: false
    });

    // 3. Create mock user
    console.log("Creating mock user...");
    await db.collection("users").doc(testUserId).set({
      id: testUserId,
      username: "hybridtest",
      studentId: testStudentId,
      role: "student",
      isDeleted: false
    });

    // 4. Create mock classes targeted at these batches
    console.log("Creating mock classes...");
    await db.collection("classes").doc(classLdcId).set({
      id: classLdcId,
      title: "LDC Online Class",
      classType: "recorded",
      targetBatchIds: [ldcBatchId],
      isDeleted: false,
      tenantId: "default_tenant"
    });
    await db.collection("classes").doc(classUdcId).set({
      id: classUdcId,
      title: "UDC Offline Class",
      classType: "recorded",
      targetBatchIds: [udcBatchId],
      isDeleted: false,
      tenantId: "default_tenant"
    });

    // 5. Test LMS Classes access logic
    console.log("Retrieving LMS classes...");
    const classes = await getMyLmsClasses(testUserId, "default_tenant");
    console.log("Retrieved classes count:", classes.length);

    const ldcClass = classes.find(c => c.id === classLdcId);
    const udcClass = classes.find(c => c.id === classUdcId);

    if (!ldcClass || !udcClass) {
      throw new Error("FAIL: Mock classes were not discovered!");
    }

    console.log("LDC Class Access Result:", ldcClass.access);
    console.log("UDC Class Access Result:", udcClass.access);

    // Assert: LDC Class (online mode for student) should be allowed: true
    // UDC Class (offline mode for student) should be allowed: false (requires request)
    if (ldcClass.access.allowed !== true) {
      throw new Error("FAIL: LDC class (online mode) should have allowed access!");
    }
    if (udcClass.access.allowed !== false) {
      throw new Error("FAIL: UDC class (offline mode) should have blocked access!");
    }

    console.log("\n🎉 ALL ACCESS CHECKS PASSED SUCCESSFULLY!");

  } catch (error) {
    console.error("❌ TEST FAILED:", error);
  } finally {
    // 6. Cleanup
    console.log("\nCleaning up test documents...");
    await db.collection("batches").doc(ldcBatchId).delete();
    await db.collection("batches").doc(udcBatchId).delete();
    await db.collection("students").doc(testStudentId).delete();
    await db.collection("users").doc(testUserId).delete();
    await db.collection("classes").doc(classLdcId).delete();
    await db.collection("classes").doc(classUdcId).delete();
    console.log("Cleanup completed.");
  }
}

run().catch(console.error);
