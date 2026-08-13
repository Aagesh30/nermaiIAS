const fs = require('fs');
const path = require('path');

const targetClasses = ['text-textPrimary', 'text-textSecondary', 'bg-surface', 'bg-background', 'bg-surfaceHighlight', 'border-border'];
const issues = {};

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        scanDir(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const found = [];
      for (const cls of targetClasses) {
        if (content.includes(cls)) {
          found.push(cls);
        }
      }
      if (found.length > 0) {
        issues[fullPath.replace(/\\/g, '/')] = found;
      }
    }
  }
}

console.log("=== SCANNING FOR THEME CONTRAST ISSUES ===");
scanDir('d:/unistrix/NERMAI_IAS_ACADEMY/web_portal/lms');
console.log(JSON.stringify(issues, null, 2));
