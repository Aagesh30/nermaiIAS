const fs = require('fs');
const path = require('path');

const trackerDir = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'code_tracker', 'active');

let count = 0;
function search(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        search(fullPath);
      } else {
        count++;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('saveTestDefinition')) {
          console.log(`Found candidate: ${fullPath} (Size: ${stat.size}, Modified: ${stat.mtime})`);
          if (!content.includes('CUSTOM LOADING ANIMATIONS')) {
            console.log(`-> CLEAN backup found!`);
          } else {
            console.log(`-> Modified version.`);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

console.log(`Searching active tracker at ${trackerDir}...`);
search(trackerDir);
console.log(`Search finished. Scanned ${count} files.`);
