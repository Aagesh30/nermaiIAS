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
          if (content.includes('saveTestDefinition') || content.includes('guestTab') || content.includes('activeTab === "erp"')) {
            console.log(`Found relevant log: ${fullPath} (Size: ${stat.size})`);
            // We can search if it contains a view_file response with large content
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

console.log(`Searching brain logs at ${brainDir}...`);
search(brainDir);
console.log('Search finished.');
