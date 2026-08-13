const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', '1eb31e64-b9bd-423c-9487-b7b2e7b9473c', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('getStudentName')) {
      console.log(`Line ${lineNum}: ${line.substring(0, 500)}`);
    }
  });
} else {
  console.log('Log file does not exist');
}
