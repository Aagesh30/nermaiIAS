const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('activeTab ===') && !line.includes('style=') && !line.includes('name=') && !line.includes('color=') && !line.includes('bottomTab')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
