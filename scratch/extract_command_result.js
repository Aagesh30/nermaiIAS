const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', 'fb0d3ef5-5f55-4dc9-87d0-a35a338f050d', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('838ba861-6949-49fe-8fad-10e864428d95')) {
      try {
        const obj = JSON.parse(line);
        if (obj.output) {
          console.log(`Found output at line ${lineNum}:`);
          console.log(obj.output);
        }
      } catch (e) {
        // ignore
      }
    }
  });
} else {
  console.log('Log file does not exist');
}
