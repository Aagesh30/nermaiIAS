const fs = require('fs');
const lines = fs.readFileSync('d:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx', 'utf8').split('\n');

lines.forEach((line, index) => {
  if (line.includes('Attendance') || line.includes('attendance')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
