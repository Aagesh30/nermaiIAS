const fs = require('fs');
const path = require('path');

const conversationIds = [
  '1eb31e64-b9bd-423c-9487-b7b2e7b9473c',
  '89fcccdf-47b0-4450-96b2-f51d3134dcb7',
  '76d8160c-b61a-4073-b225-0ae7dfe03744'
];

const extractedCalls = [];

conversationIds.forEach((id, convIdx) => {
  const logPath = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain', id, '.system_generated', 'logs', 'overview.txt');
  if (fs.existsSync(logPath)) {
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, lineNum) => {
      if (!line.trim()) return;
      try {
        const obj = JSON.parse(line);
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            if ((tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') && 
                (tc.args.TargetFile && tc.args.TargetFile.includes('App.tsx'))) {
              extractedCalls.push({
                conversationId: id,
                conversationOrder: convIdx,
                stepIndex: obj.step_index,
                toolName: tc.name,
                args: tc.args
              });
            }
          });
        }
      } catch (e) {
        // ignore JSON parse errors
      }
    });
  }
});

// Sort by conversation order, then by stepIndex
extractedCalls.sort((a, b) => {
  if (a.conversationOrder !== b.conversationOrder) {
    return a.conversationOrder - b.conversationOrder;
  }
  return a.stepIndex - b.stepIndex;
});

fs.writeFileSync(
  path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'extracted_tool_calls.json'),
  JSON.stringify(extractedCalls, null, 2),
  'utf8'
);

console.log(`Successfully extracted ${extractedCalls.length} tool calls to scratch/extracted_tool_calls.json`);
