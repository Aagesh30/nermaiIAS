import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../infrastructure/firebase";

async function run() {
  console.log("=== INSPECTING QUESTION REPORT LOGS IN FIRESTORE ===");
  const snapshot = await db.collection("question_report_logs").get();
  console.log(`Total logs found: ${snapshot.docs.length}`);
  snapshot.docs.forEach(doc => {
    console.log(`Doc ID: ${doc.id}`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

run().catch(console.error);
