const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
const lines = content.split('\n');

for (let i = 7785; i < 7810; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}
