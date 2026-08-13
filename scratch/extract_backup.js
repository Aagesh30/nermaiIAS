const fs = require('fs');
const path = require('path');

const logs = [
  path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', '06c9c1ee-e501-4fa5-b2a3-9151b5da0872', '.system_generated', 'logs', 'overview.txt'),
  path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', '208ce7b8-5075-4473-9d80-4bc5fdb55410', '.system_generated', 'logs', 'overview.txt')
];

let index = 1;
logs.forEach(logPath => {
  if (!fs.existsSync(logPath)) {
    console.log(`Log ${logPath} does not exist`);
    return;
  }
  console.log(`Processing log: ${logPath}`);
  const content = fs.readFileSync(logPath, 'utf8');
  
  // Find all JSON objects in log
  const lines = content.split('\n');
  lines.forEach((line, lineNum) => {
    if (!line.includes('write_to_file') || !line.includes('App.tsx')) return;
    try {
      const obj = JSON.parse(line);
      const toolCalls = obj.tool_calls;
      if (!toolCalls) return;
      toolCalls.forEach(tc => {
        if (tc.name === 'write_to_file') {
          const args = typeof tc.args === 'string' ? JSON.parse(tc.args) : tc.args;
          const target = args.TargetFile || args.targetFile;
          const code = args.CodeContent || args.codeContent;
          if (target && target.includes('App.tsx') && code) {
            const outPath = `scratch/App_extracted_${index}.tsx`;
            fs.writeFileSync(outPath, code, 'utf8');
            console.log(`Successfully extracted ${target} (Length: ${code.length}) to ${outPath} (from line ${lineNum})`);
            index++;
          }
        }
      });
    } catch (e) {
      console.log(`Failed to parse line ${lineNum}: ${e.message}`);
    }
  });
});
