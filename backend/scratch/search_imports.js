const fs = require('fs');
const path = require('path');

function searchImport(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        searchImport(fullPath);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('StudentPayFeesPage') || content.includes('StudentPayFees')) {
          console.log(`Found in: ${fullPath}`);
        }
      }
    }
  }
}

console.log("=== SEARCHING IMPORTS ===");
searchImport('d:/unistrix/NERMAI_IAS_ACADEMY/web_portal');
