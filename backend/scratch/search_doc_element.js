const fs = require('fs');
const path = require('path');

function searchDocumentElement(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        searchDocumentElement(fullPath);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('documentElement') || content.includes('classList') || content.includes("classList.add('dark')")) {
          console.log(`Found in: ${fullPath}`);
        }
      }
    }
  }
}

console.log("=== SEARCHING DOCUMENT ELEMENT ===");
searchDocumentElement('d:/unistrix/NERMAI_IAS_ACADEMY/web_portal');
