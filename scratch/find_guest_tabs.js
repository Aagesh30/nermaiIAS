const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

for (let i = 4050; i < 4410; i++) {
  const line = lines[i];
  if (line.includes('guestTab ===') || line.includes('showAdmissionForm') || line.includes('disableAutoLogin')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
}
