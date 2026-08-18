import { LiveSessionService } from './modules/live-sessions/service';
import { db } from './infrastructure/firebase';

async function testPolicy() {
  try {
    const user = { userId: 'super_admin_root', role: 'super_admin' };
    const res = await LiveSessionService.endSessionWithConversion('xbXbEkd461AF3QjwXu8C', user, false);
    console.log("Success:", res);
  } catch (e: any) {
    console.error("Policy Error:", e.message);
  }
}

testPolicy().then(() => process.exit(0)).catch(console.error);
