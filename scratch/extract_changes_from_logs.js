const fs = require('fs');
const path = require('path');

const conversationIds = [
  '1eb31e64-b9bd-423c-9487-b7b2e7b9473c',
  '89fcccdf-47b0-4450-96b2-f51d3134dcb7',
  '76d8160c-b61a-4073-b225-0ae7dfe03744'
];

conversationIds.forEach(id => {
  const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', id, '.system_generated', 'logs', 'overview.txt');
  if (fs.existsSync(logPath)) {
    console.log(`=== Changes in Conversation ${id} ===`);
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, lineNum) => {
      if (line.includes('App.tsx') && (line.includes('replace_file_content') || line.includes('multi_replace_file_content') || line.includes('write_to_file'))) {
        try {
          const obj = JSON.parse(line);
          if (obj.tool_calls) {
            obj.tool_calls.forEach(tc => {
              if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
                console.log(`Line ${lineNum} Tool Call: ${tc.name}`);
                console.log(JSON.stringify(tc.args, null, 2));
              } else if (tc.name === 'write_to_file' && tc.args.TargetFile && tc.args.TargetFile.endsWith('App.tsx')) {
                console.log(`Line ${lineNum} Tool Call: write_to_file`);
                console.log(`Size: ${tc.args.CodeContent.length}`);
              }
            });
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    });
  } else {
    console.log(`Log file for ${id} does not exist`);
  }
});
