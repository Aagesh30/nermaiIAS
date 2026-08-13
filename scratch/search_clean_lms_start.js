const fs = require('fs');
const path = require('path');

const cleanPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');
const content = fs.readFileSync(cleanPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('activeTab ===')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
