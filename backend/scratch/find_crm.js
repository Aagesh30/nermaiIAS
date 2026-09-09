const fs = require('fs');
const content = fs.readFileSync('web_portal/App.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('crmSub ===') || line.includes('changeCrmSub(')) {
    console.log('Line ' + (idx + 1) + ': ' + line.trim().slice(0, 120));
  }
});
