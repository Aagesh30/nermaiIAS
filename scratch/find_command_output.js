const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', 'fb0d3ef5-5f55-4dc9-87d0-a35a338f050d', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('Final_year_project') && line.includes('App.tsx')) {
      console.log(`Found match at line ${lineNum}:`);
      console.log(line.substring(0, 2000));
    }
  });
} else {
  console.log('Log file does not exist');
}
