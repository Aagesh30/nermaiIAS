const fs = require('fs');
const path = require('path');

const activePath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(activePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('activeTab === "lms"')) {
    console.log(`LMS TAB AT LINE ${idx + 1}`);
    for (let i = idx - 15; i <= idx + 10; i++) {
      if (lines[i] !== undefined) {
        console.log(`${i + 1}: ${lines[i]}`);
      }
    }
  }
});
