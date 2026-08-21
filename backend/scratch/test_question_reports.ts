import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../infrastructure/firebase";
import admin from "firebase-admin";

async function run() {
  console.log("=== QUESTION REPORT CONSTRAINT & LOGGING E2E TEST ===");

  const testId = "test-tp-reports";
  const student1Id = "student-tp-reporter-1";
  const student2Id = "student-tp-reporter-2";

  try {
    // 1. Create mock students
    console.log("Creating mock students...");
    await db.collection("students").doc(student1Id).set({
      id: student1Id,
      firstName: "Reporter",
      lastName: "One",
      rollNumber: "9001",
      isDeleted: false
    });

    await db.collection("students").doc(student2Id).set({
      id: student2Id,
      firstName: "Reporter",
      lastName: "Two",
      rollNumber: "9002",
      isDeleted: false
    });

    // Clean up any existing logs
    await db.collection("question_report_logs").doc(`${testId}_4_${student1Id}`).delete();
    await db.collection("question_report_logs").doc(`${testId}_4_${student2Id}`).delete();
    await db.collection("question_reports").doc(testId).delete();

    // Helper to simulate report controller logic
    const simulateReport = async (sId: string, qIndex: number) => {
      const logId = `${testId}_${qIndex}_${sId}`;
      const logRef = db.collection("question_report_logs").doc(logId);

      // Check duplicate
      const logDoc = await logRef.get();
      if (logDoc.exists) {
        throw new Error("already reported");
      }

      // Fetch student details
      let studentName = "Student";
      let rollNumber = "";
      
      const studentDoc = await db.collection("students").doc(sId).get();
      if (studentDoc.exists) {
        const sData = studentDoc.data()!;
        studentName = `${sData.firstName || ""} ${sData.lastName || ""}`.trim() || "Student";
        rollNumber = sData.rollNumber || "";
      }

      // Write log doc
      await logRef.set({
        id: logId,
        testId,
        qIndex,
        studentId: sId,
        studentName,
        rollNumber,
        reportedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Increment aggregate
      const qKey = `Q.N ${qIndex + 1}`;
      const reportRef = db.collection("question_reports").doc(testId);
      await reportRef.set({
        reports: {
          [qKey]: admin.firestore.FieldValue.increment(1)
        }
      }, { merge: true });
    };

    // Test 1: Student 1 reports Q5 (first time)
    console.log("Student 1 reporting Q5 (expected success)...");
    await simulateReport(student1Id, 4);
    console.log("Report successful!");

    // Test 2: Student 1 reports Q5 (second time, expected failure)
    console.log("Student 1 reporting Q5 again (expected failure)...");
    try {
      await simulateReport(student1Id, 4);
      throw new Error("FAIL: Duplicate report succeeded");
    } catch (e: any) {
      if (e.message === "already reported") {
        console.log("Duplicate blocked successfully!");
      } else {
        throw e;
      }
    }

    // Test 3: Student 2 reports Q5 (expected success)
    console.log("Student 2 reporting Q5 (expected success)...");
    await simulateReport(student2Id, 4);
    console.log("Report successful!");

    // Test 4: Retrieve and verify logs
    console.log("\nVerifying logs in Firestore...");
    const snapshot = await db.collection("question_report_logs")
      .where("testId", "==", testId)
      .get();

    console.log(`Found ${snapshot.docs.length} log entries.`);
    snapshot.docs.forEach(doc => {
      console.log(`- Entry: ${doc.id} | Name: ${doc.data().studentName} | Roll: ${doc.data().rollNumber}`);
    });

    if (snapshot.docs.length !== 2) {
      throw new Error(`FAIL: Expected 2 logs, got ${snapshot.docs.length}`);
    }

    // Verify aggregate counts
    const aggDoc = await db.collection("question_reports").doc(testId).get();
    const count = aggDoc.data()?.reports?.["Q.N 5"];
    console.log(`Aggregate count for Q.N 5: ${count} (expected 2)`);
    if (count !== 2) {
      throw new Error(`FAIL: Expected aggregate count of 2, got ${count}`);
    }

    console.log("\n🎉 ALL REPORT CONSTRAINT & LOGGING E2E CHECKS PASSED!");

  } catch (error) {
    console.error("❌ TEST FAILED:", error);
  } finally {
    console.log("\nCleaning up mock documents...");
    await db.collection("students").doc(student1Id).delete();
    await db.collection("students").doc(student2Id).delete();
    await db.collection("question_report_logs").doc(`${testId}_4_${student1Id}`).delete();
    await db.collection("question_report_logs").doc(`${testId}_4_${student2Id}`).delete();
    await db.collection("question_reports").doc(testId).delete();
    console.log("Cleanup completed.");
  }
}

run().catch(console.error);
