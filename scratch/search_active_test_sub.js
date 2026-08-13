const fs = require('fs');
const path = require('path');

const activePath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(activePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('testSub ===')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
