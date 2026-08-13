const fs = require('fs');
const path = require('path');

const cleanPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');
const content = fs.readFileSync(cleanPath, 'utf8');
const lines = content.split('\n');

for (let i = 3610; i < 3945; i++) {
  const line = lines[i];
  if (line.includes('guestTab ===') || line.includes('showAdmissionForm') || line.includes('disableAutoLogin')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
}
