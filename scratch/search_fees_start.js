const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('erpSub === "fees"')) {
    console.log(`${idx + 1}: ${line.trim()}`);
    for (let i = idx; i < idx + 10; i++) {
      console.log(`  ${i + 1}: ${lines[i]}`);
    }
  }
});
