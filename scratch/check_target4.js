const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
const lines = content.split('\n');

for (let i = 5020; i < 5045; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}
