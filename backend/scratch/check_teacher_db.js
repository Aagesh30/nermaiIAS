const fs = require('fs');
const content = fs.readFileSync('d:/unistrix/NERMAI_IAS_ACADEMY/web_portal/lms/staff/TeacherDashboard.tsx', 'utf8');
const targetClasses = ['text-textPrimary', 'text-textSecondary', 'bg-surface', 'bg-background', 'bg-surfaceHighlight', 'border-border'];
const found = [];
for (const cls of targetClasses) {
  if (content.includes(cls)) {
    found.push(cls);
  }
}
console.log("TeacherDashboard.tsx has:", found);
