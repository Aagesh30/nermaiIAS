import { AccessRulesService } from '../modules/access-rules/service';
import { db } from '../infrastructure/firebase';

const service = new AccessRulesService();
const tenantId = 'default_tenant';

async function runTests() {
  const studentId = 'test_student_123';
  const batchId = 'test_offline_batch';

  console.log("=== SACS QUOTA TEST ===");

  await db.collection('admin_users').doc(studentId).set({
      role: 'student',
      tenantId
  });

  const { redisClient } = await import('../infrastructure/redis');
  
  const mockContext = {
    version: 1,
    userId: studentId,
    tenantId,
    role: 'student',
    batchIds: [batchId],
    programs: [],
    accessProfiles: [],
    studentName: 'Test Student',
    studentEmail: 'test@example.com',
    cachedAt: Math.floor(Date.now() / 1000)
  };

  await redisClient.set(`access:${studentId}`, JSON.stringify(mockContext));

  await db.collection('batch_capabilities').doc(batchId).set({
      tenantId,
      batchType: 'offline'
  });

  const snap = await db.collection('access_requests').where('studentId', '==', studentId).get();
  for (const doc of snap.docs) {
      await doc.ref.delete();
  }

  try {
      console.log("\n--- TEST 1: Deduplication (Same Entity & Date) ---");
      await service.submitAccessRequest(studentId, 'entity_1', 'class', 'Polity Class A', 'missed_live', undefined, tenantId, '2026-08-10');
      console.log("Request 1 (Polity A, Aug 10): Allowed");
      
      const req1Snap = await db.collection('access_requests').where('studentId', '==', studentId).get();
      await req1Snap.docs[0].ref.update({ status: 'expired' });

      await service.submitAccessRequest(studentId, 'entity_1', 'class', 'Polity Class A', 'missed_live', undefined, tenantId, '2026-08-10');
      console.log("Request 2 (Polity A, Aug 10): Allowed");
      
      const req2Snap = await db.collection('access_requests').where('studentId', '==', studentId).where('status', '==', 'pending').get();
      await req2Snap.docs[0].ref.update({ status: 'expired' });

      await service.submitAccessRequest(studentId, 'entity_1', 'class', 'Polity Class A', 'missed_live', undefined, tenantId, '2026-08-10');
      console.log("Request 3 (Polity A, Aug 10): Allowed");

      const req3Snap = await db.collection('access_requests').where('studentId', '==', studentId).where('status', '==', 'pending').get();
      await req3Snap.docs[0].ref.update({ status: 'expired' });

      const { AccessRulesRepository } = await import('../modules/access-rules/repository');
      const repo = new AccessRulesRepository();
      const usage1 = await repo.getStudentRequestUsage(studentId, '2020-01-01T00:00:00.000Z');
      console.log("-> Current usage after 3 identical requests:", usage1, "(Expected: 1)");

      console.log("\n--- TEST 2: Unique Requests ---");
      await service.submitAccessRequest(studentId, 'entity_1', 'class', 'Polity Class A', 'missed_live', undefined, tenantId, '2026-08-17');
      console.log("Request 4 (Polity A, Aug 17): Allowed");

      await service.submitAccessRequest(studentId, 'entity_2', 'class', 'History Class B', 'missed_live', undefined, tenantId, '2026-08-10');
      console.log("Request 5 (History B, Aug 10): Allowed");

      await service.submitAccessRequest(studentId, 'entity_3', 'class', 'Geo Class C', 'missed_live', undefined, tenantId, undefined);
      console.log("Request 6 (Geo C, No Date): Allowed");

      await service.submitAccessRequest(studentId, 'entity_4', 'class', 'Economy Class D', 'missed_live', undefined, tenantId, undefined);
      console.log("Request 7 (Economy D, No Date): Allowed");

      const usage2 = await repo.getStudentRequestUsage(studentId, '2020-01-01T00:00:00.000Z');
      console.log("-> Current usage after 4 more unique requests:", usage2, "(Expected: 5)");

      console.log("\n--- TEST 3: Limit Exceeded ---");
      const reqId = await service.submitAccessRequest(studentId, 'entity_5', 'class', 'Science Class E', 'missed_live', undefined, tenantId, undefined);
      
      const exceededReq = await db.collection('access_requests').doc(reqId).get();
      console.log("Request 8 (Science E) Status:", exceededReq.data()?.status, "(Expected: limit_exceeded)");

      console.log("\n--- TEST 4: Free Batch Blocked ---");
      await db.collection('batch_capabilities').doc(batchId).set({ tenantId, batchType: 'free' });
      
      try {
          await service.submitAccessRequest(studentId, 'entity_6', 'class', 'Math Class F', 'missed_live', undefined, tenantId, undefined);
          console.log("Request 9 (Free Batch): Failed to block!");
      } catch (e: any) {
          console.log("Request 9 (Free Batch) Error:", e.message, "(Expected: Your batch type is not eligible...)");
      }

  } catch (error) {
      console.error("Test failed:", error);
  } finally {
      process.exit(0);
  }
}

runTests();
