const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', 'fb0d3ef5-5f55-4dc9-87d0-a35a338f050d', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('Search A drive for App.tsx')) {
      console.log(`Match at line ${lineNum}:`);
      // Find the response or command status following this step
      for (let j = 1; j <= 50; j++) {
        if (lineNum + j < lines.length) {
          const l = lines[lineNum + j];
          if (l.includes('output') || l.includes('Output')) {
            console.log(l.substring(0, 2000));
          }
        }
      }
    }
  });
} else {
  console.log('Log file does not exist');
}
