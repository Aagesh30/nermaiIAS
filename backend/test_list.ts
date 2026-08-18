import { LiveSessionService } from './modules/live-sessions/service';

async function testList() {
  const sessions = await LiveSessionService.listSessions();
  const medival = sessions.filter((s: any) => s.title?.includes('MEDIVAL') || s.courseName?.includes('MEDIVAL'));
  console.log(JSON.stringify(medival, null, 2));
}

testList().then(() => process.exit(0)).catch(console.error);
