const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', 'fb0d3ef5-5f55-4dc9-87d0-a35a338f050d', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  console.log(`Log size: ${content.length}`);
  // Print first 50 lines and last 50 lines
  const lines = content.split('\n');
  console.log('--- First 50 lines ---');
  console.log(lines.slice(0, 50).join('\n'));
  console.log('--- Last 50 lines ---');
  console.log(lines.slice(-50).join('\n'));
} else {
  console.log('Log file does not exist');
}
