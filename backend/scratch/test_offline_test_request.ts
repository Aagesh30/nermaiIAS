import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../infrastructure/firebase";

async function run() {
  console.log("=== OFFLINE TEST GATING & BYPASS E2E TEST ===");

  const restrictedTestId = "test-tp-restricted-id";
  const directTestId = "test-tp-direct-id";
  const testStudentId = "test-tp-student-id";

  try {
    // 1. Create a student with UDC (offline) batch modes
    console.log("Creating mock student...");
    await db.collection("students").doc(testStudentId).set({
      id: testStudentId,
      batches: ["UDC Batch"],
      batchModes: {
        "UDC Batch": ["offline"]
      },
      batch: "UDC Batch",
      type: "offline",
      firstName: "Test",
      lastName: "ExamTaker",
      isDeleted: false
    });

    // 2. Create the two test records
    console.log("Creating mock tests...");
    await db.collection("tests").doc(restrictedTestId).set({
      id: restrictedTestId,
      title: "Restricted Test",
      targetAudience: "batch",
      targetBatch: "UDC Batch",
      allowOfflineDirectly: false,
      isDeleted: false
    });

    await db.collection("tests").doc(directTestId).set({
      id: directTestId,
      title: "Direct Test",
      targetAudience: "batch",
      targetBatch: "UDC Batch",
      allowOfflineDirectly: true,
      isDeleted: false
    });

    // 3. Test gating simulation
    console.log("\nSimulating frontend gating checks for student...");
    const studentDoc = await db.collection("students").doc(testStudentId).get();
    const student = studentDoc.data()!;

    // Fetch tests
    const restrictedTestDoc = await db.collection("tests").doc(restrictedTestId).get();
    const restrictedTest = restrictedTestDoc.data()!;

    const directTestDoc = await db.collection("tests").doc(directTestId).get();
    const directTest = directTestDoc.data()!;

    // Helper simulation function
    const evaluateStudentAccess = (t: any, s: any) => {
      const targetBatchName = t.targetBatch;
      const targetModes = targetBatchName && s.batchModes ? (s.batchModes[targetBatchName] || []) : [];
      
      const isOfflineForThisTest = (
        targetModes.length > 0
          ? (targetModes.includes("offline") && !targetModes.includes("online") && !targetModes.includes("recorded"))
          : (s.type || "").toLowerCase() === "offline"
      );
      
      const bypassOfflineRequest = !!t.allowOfflineDirectly;
      const requiresPermissionRequest = isOfflineForThisTest && !bypassOfflineRequest;

      return {
        isOfflineForThisTest,
        requiresPermissionRequest
      };
    };

    const restrictedRes = evaluateStudentAccess(restrictedTest, student);
    const directRes = evaluateStudentAccess(directTest, student);

    console.log("Restricted Test Check:", restrictedRes);
    console.log("Direct Test Check:", directRes);

    if (restrictedRes.requiresPermissionRequest !== true) {
      throw new Error("FAIL: Restricted test should require permission request for offline student!");
    }
    if (directRes.requiresPermissionRequest !== false) {
      throw new Error("FAIL: Direct test should bypass permission request for offline student!");
    }

    console.log("\n🎉 ALL OFFLINE TEST GATING & BYPASS CHECKS PASSED!");

  } catch (error) {
    console.error("❌ TEST FAILED:", error);
  } finally {
    console.log("\nCleaning up test documents...");
    await db.collection("students").doc(testStudentId).delete();
    await db.collection("tests").doc(restrictedTestId).delete();
    await db.collection("tests").doc(directTestId).delete();
    console.log("Cleanup completed.");
  }
}

run().catch(console.error);
