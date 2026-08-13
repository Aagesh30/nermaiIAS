const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', 'fb0d3ef5-5f55-4dc9-87d0-a35a338f050d', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('git checkout') || line.includes('restore') || line.includes('discard')) {
      console.log(`Line ${lineNum}: ${line.substring(0, 500)}`);
      // Print the next 5 lines
      for (let j = 1; j <= 5; j++) {
        if (lineNum + j < lines.length) {
          console.log(`  +${j}: ${lines[lineNum + j].substring(0, 500)}`);
        }
      }
    }
  });
} else {
  console.log('Log file does not exist');
}
