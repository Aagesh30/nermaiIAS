const fs = require('fs');
const content = fs.readFileSync('web_portal/App.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Roll Number:')) {
    console.log(`Line ${idx+1}: '${line.replace(/ /g, '.')}'`);
  }
});
