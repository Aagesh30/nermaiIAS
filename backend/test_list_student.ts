import { LiveSessionService } from './modules/live-sessions/service';

async function testListStudent() {
  const sessions = await LiveSessionService.getStudentLiveSessions('5tWBh5t0Qa-Kvg1iDNK-BA', 'default');
  const medival = sessions.filter((s: any) => s.title?.includes('MEDIVAL') || s.courseName?.includes('MEDIVAL'));
  console.log(JSON.stringify(medival, null, 2));
}

testListStudent().then(() => process.exit(0)).catch(console.error);
