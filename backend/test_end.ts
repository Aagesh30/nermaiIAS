import { LiveSessionService } from './modules/live-sessions/service';

async function testEnd() {
  try {
    const res = await LiveSessionService.endSession('xbXbEkd461AF3QjwXu8C');
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}

testEnd().then(() => process.exit(0)).catch(console.error);
