const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

for (let i = 5956; i < 6066; i++) {
  const line = lines[i];
  if (line.includes('ScrollView') || line.includes('map(') || line.includes('=>') || line.includes('{') || line.includes('}')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
}
