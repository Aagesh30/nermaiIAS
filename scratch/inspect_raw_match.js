const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', '208ce7b8-5075-4473-9d80-4bc5fdb55410', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('write_to_file') && line.includes('App.tsx')) {
      console.log(`--- Match at line ${lineNum} ---`);
      console.log(line.substring(0, 1000) + '... (truncated)');
    }
  });
} else {
  console.log('Log file does not exist');
}
