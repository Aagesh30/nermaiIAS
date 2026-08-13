const fs = require('fs');
const path = require('path');

function searchTeacherGuestFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        searchTeacherGuestFiles(fullPath);
      }
    } else {
      const lower = file.toLowerCase();
      if (lower.includes('teacher') || lower.includes('guest')) {
        console.log(`Found file: ${fullPath}`);
      }
    }
  }
}

console.log("=== SEARCHING TEACHER/GUEST FILES ===");
searchTeacherGuestFiles('d:/unistrix/NERMAI_IAS_ACADEMY/web_portal');
