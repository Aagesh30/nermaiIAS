const fs = require('fs');
const path = require('path');

const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', '76d8160c-b61a-4073-b225-0ae7dfe03744', '.system_generated', 'logs', 'overview.txt');

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    if (line.includes('App.tsx')) {
      try {
        const obj = JSON.parse(line);
        console.log(`Step ${obj.step_index} (${obj.source} - ${obj.type}):`);
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            console.log(`  Tool: ${tc.name}`);
            const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
            console.log(`  Target: ${args.TargetFile || args.targetFile}`);
            console.log(`  Instruction: ${args.Instruction || args.instruction}`);
          });
        }
      } catch (e) {
        console.log(`Line ${lineNum} match but failed to parse: ${line.substring(0, 200)}...`);
      }
    }
  });
} else {
  console.log('Log file does not exist');
}
