const fs = require('fs');
const path = require('path');

const trackerDir = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'code_tracker');

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
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('saveTestDefinition')) {
          console.log(`Found Tracker candidate: ${fullPath} (Size: ${stat.size}, Modified: ${stat.mtime})`);
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

console.log(`Searching code_tracker at ${trackerDir}...`);
search(trackerDir);
console.log('Search finished.');
