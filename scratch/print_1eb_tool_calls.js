const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', '1eb31e64-b9bd-423c-9487-b7b2e7b9473c', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    if (!line.trim()) return;
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        obj.tool_calls.forEach(tc => {
          console.log(`Step ${obj.step_index}: Tool=${tc.name}, TargetFile=${tc.args.TargetFile || tc.args.CommandLine || tc.args.AbsolutePath}`);
        });
      }
    } catch (e) {
      // ignore
    }
  });
} else {
  console.log('Log file does not exist');
}
