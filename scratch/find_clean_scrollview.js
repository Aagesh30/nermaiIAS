const fs = require('fs');
const path = require('path');

const cleanPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');
const content = fs.readFileSync(cleanPath, 'utf8');
const lines = content.split('\n');

// Print lines around 6020-6028 with indentations and what they close
for (let i = 6015; i < 6030; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
