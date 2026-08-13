const fs = require('fs');
const path = require('path');

const cleanPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');
const content = fs.readFileSync(cleanPath, 'utf8');
const lines = content.split('\n');

for (let i = 7969; i < 7990; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
