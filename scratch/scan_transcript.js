const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\762005cf-478a-4563-aa53-2697e1899ee0\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.log('Log file does not exist at:', logPath);
  process.exit(1);
}

const fileStream = fs.createReadStream(logPath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

let steps = [];
rl.on('line', (line) => {
  try {
    const step = JSON.parse(line);
    steps.push(step);
  } catch (e) {
    // ignore
  }
});

rl.on('close', () => {
  console.log('Total steps read:', steps.length);
  // Find USER_INPUT steps
  const userSteps = steps.filter(s => s.type === 'USER_INPUT' || s.source === 'USER_EXPLICIT');
  console.log('User messages count:', userSteps.length);
  
  // Show the last 5 user messages
  const last5 = userSteps.slice(-5);
  last5.forEach((msg, idx) => {
    console.log(`--- Message ${idx + 1} ---`);
    console.log('Content preview:', String(msg.content).substring(0, 500));
  });
});
