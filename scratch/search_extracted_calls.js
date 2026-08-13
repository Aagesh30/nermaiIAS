const fs = require('fs');
const path = require('path');

const toolCallsPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'extracted_tool_calls.json');

if (fs.existsSync(toolCallsPath)) {
  const toolCalls = JSON.parse(fs.readFileSync(toolCallsPath, 'utf8'));
  toolCalls.forEach((call, index) => {
    const raw = JSON.stringify(call);
    if (raw.includes('getStudentName')) {
      console.log(`Call #${index + 1}: Conv ${call.conversationId} Step ${call.stepIndex} (${call.toolName})`);
      console.log(`TargetContent includes getStudentName: ${JSON.stringify(call.args.TargetContent).includes('getStudentName')}`);
      console.log(`ReplacementContent includes getStudentName: ${JSON.stringify(call.args.ReplacementContent).includes('getStudentName')}`);
      console.log('---');
    }
  });
} else {
  console.log('extracted_tool_calls.json does not exist');
}
