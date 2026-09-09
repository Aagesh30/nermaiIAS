const fs = require('fs');
const content = fs.readFileSync('web_portal/App.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('guestTab ===') || line.includes('Apply for Course') || line.includes('Apply for a Course') || line.includes('selectedCourseForm')) {
    console.log('Line ' + (idx + 1) + ': ' + line.trim().slice(0, 120));
  }
});
