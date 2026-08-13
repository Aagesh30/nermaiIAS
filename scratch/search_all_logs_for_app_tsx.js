const fs = require('fs');
const path = require('path');

const brainDir = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain');

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
        if (file === 'overview.txt') {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.toLowerCase().includes('app.tsx')) {
            console.log(`Found App.tsx in log: ${fullPath} (Size: ${stat.size}, Modified: ${stat.mtime})`);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

console.log(`Searching brain logs for App.tsx...`);
search(brainDir);
console.log('Search finished.');
