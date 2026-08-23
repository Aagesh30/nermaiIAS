import { db } from '../infrastructure/firebase';

async function run() {
  console.log("Checking live classes in DB...");
  const classesSnap = await db.collection("classes").where("classType", "==", "live").get();
  
  console.log(`Found ${classesSnap.size} live classes.`);
  classesSnap.forEach(doc => {
    const data = doc.data();
    console.log(`Class ID: ${doc.id}, Title: ${data.title}, Created By: ${data.createdBy}, Teacher ID: ${data.teacherId}, Participant Admins: ${data.participantAdminIds?.join(",")}, Host ID: ${data.hostId}`);
  });
}

run().catch(console.error).finally(() => process.exit(0));
