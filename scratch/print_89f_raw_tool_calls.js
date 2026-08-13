const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', '89fcccdf-47b0-4450-96b2-f51d3134dcb7', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line) => {
    if (line.includes('"step_index":1300') || line.includes('"step_index":1333') || line.includes('"step_index":1376')) {
      console.log(line.substring(0, 3000));
    }
  });
} else {
  console.log('Log file does not exist');
}
