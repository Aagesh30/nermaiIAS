import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../infrastructure/firebase";

async function run() {
  console.log("=== BATCH-SPECIFIC OFFLINE TEST GATING & BYPASS E2E TEST ===");

  const test1Id = "test-tp-batch-1";
  const test2Id = "test-tp-batch-2";
  const student1Id = "test-tp-student-1";
  const student2Id = "test-tp-student-2";

  try {
    // 1. Create Student 1 in Batch A (offline)
    console.log("Creating mock student 1 in Batch A...");
    await db.collection("students").doc(student1Id).set({
      id: student1Id,
      batches: ["Batch A"],
      batchModes: {
        "Batch A": ["offline"]
      },
      batch: "Batch A",
      type: "offline",
      firstName: "Student",
      lastName: "One",
      isDeleted: false
    });

    // 2. Create Student 2 in Batch B (offline)
    console.log("Creating mock student 2 in Batch B...");
    await db.collection("students").doc(student2Id).set({
      id: student2Id,
      batches: ["Batch B"],
      batchModes: {
        "Batch B": ["offline"]
      },
      batch: "Batch B",
      type: "offline",
      firstName: "Student",
      lastName: "Two",
      isDeleted: false
    });

    // 3. Create Test 1 allowing only Batch A directly
    console.log("Creating Test 1 (direct allow for Batch A)...");
    await db.collection("tests").doc(test1Id).set({
      id: test1Id,
      title: "Test 1 (Batch A Allowed)",
      targetAudience: "batch",
      targetBatch: "Batch A",
      allowOfflineDirectly: true,
      allowOfflineDirectlyBatches: ["Batch A"],
      isDeleted: false
    });

    // 4. Create Test 2 allowing only Batch B directly
    console.log("Creating Test 2 (direct allow for Batch B)...");
    await db.collection("tests").doc(test2Id).set({
      id: test2Id,
      title: "Test 2 (Batch B Allowed)",
      targetAudience: "batch",
      targetBatch: "Batch A",
      allowOfflineDirectly: true,
      allowOfflineDirectlyBatches: ["Batch B"],
      isDeleted: false
    });

    // 5. Test gating simulation
    console.log("\nSimulating frontend gating checks...");

    const s1Doc = await db.collection("students").doc(student1Id).get();
    const s1 = s1Doc.data()!;

    const s2Doc = await db.collection("students").doc(student2Id).get();
    const s2 = s2Doc.data()!;

    const t1Doc = await db.collection("tests").doc(test1Id).get();
    const t1 = t1Doc.data()!;

    const t2Doc = await db.collection("tests").doc(test2Id).get();
    const t2 = t2Doc.data()!;

    // Helper simulation function matching our exact App.tsx logic
    const evaluateStudentAccess = (testObj: any, studentObj: any) => {
      const targetBatchName = testObj.targetBatch;
      const targetModes = targetBatchName && studentObj.batchModes ? (studentObj.batchModes[targetBatchName] || []) : [];
      
      const isOfflineForThisTest = (
        targetModes.length > 0
          ? (targetModes.includes("offline") && !targetModes.includes("online") && !targetModes.includes("recorded"))
          : (studentObj.type || "").toLowerCase() === "offline"
      );
      
      const studentBatchesList = Array.isArray(studentObj.batches) ? studentObj.batches : (studentObj.batch ? [studentObj.batch] : []);
      const isBatchAllowedDirectly = !!testObj.allowOfflineDirectly && studentBatchesList.some((bName: string) => 
        Array.isArray(testObj.allowOfflineDirectlyBatches) && testObj.allowOfflineDirectlyBatches.includes(bName)
      );
      
      const bypassOfflineRequest = isBatchAllowedDirectly;
      const requiresPermissionRequest = isOfflineForThisTest && !bypassOfflineRequest;

      return {
        isOfflineForThisTest,
        bypassOfflineRequest,
        requiresPermissionRequest
      };
    };

    const s1_t1 = evaluateStudentAccess(t1, s1);
    const s1_t2 = evaluateStudentAccess(t2, s1);
    const s2_t1 = evaluateStudentAccess(t1, s2);
    const s2_t2 = evaluateStudentAccess(t2, s2);

    console.log("Student 1 on Test 1 (Expected: bypass = true, requires = false):", s1_t1);
    console.log("Student 1 on Test 2 (Expected: bypass = false, requires = true):", s1_t2);
    console.log("Student 2 on Test 1 (Expected: bypass = false, requires = true):", s2_t1);
    console.log("Student 2 on Test 2 (Expected: bypass = true, requires = false):", s2_t2);

    if (s1_t1.requiresPermissionRequest !== false || s1_t1.bypassOfflineRequest !== true) {
      throw new Error("FAIL: Student 1 should bypass Test 1");
    }
    if (s1_t2.requiresPermissionRequest !== true || s1_t2.bypassOfflineRequest !== false) {
      throw new Error("FAIL: Student 1 should NOT bypass Test 2");
    }
    if (s2_t1.requiresPermissionRequest !== true || s2_t1.bypassOfflineRequest !== false) {
      throw new Error("FAIL: Student 2 should NOT bypass Test 1");
    }
    if (s2_t2.requiresPermissionRequest !== false || s2_t2.bypassOfflineRequest !== true) {
      throw new Error("FAIL: Student 2 should bypass Test 2");
    }

    console.log("\n🎉 ALL BATCH-SPECIFIC GATING & BYPASS CHECKS PASSED!");

  } catch (error) {
    console.error("❌ TEST FAILED:", error);
  } finally {
    console.log("\nCleaning up test documents...");
    await db.collection("students").doc(student1Id).delete();
    await db.collection("students").doc(student2Id).delete();
    await db.collection("tests").doc(test1Id).delete();
    await db.collection("tests").doc(test2Id).delete();
    console.log("Cleanup completed.");
  }
}

run().catch(console.error);
