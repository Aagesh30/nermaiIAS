const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(process.env.APPDATA, 'Code', 'User', 'History'),
  path.join(process.env.APPDATA, 'Cursor', 'User', 'History'),
  path.join(process.env.APPDATA, 'Trae', 'User', 'History')
];

function search(dir) {
  if (!fs.existsSync(dir)) return;
  const subdirs = fs.readdirSync(dir);
  for (const subdir of subdirs) {
    const subdirPath = path.join(dir, subdir);
    if (fs.statSync(subdirPath).isDirectory()) {
      const files = fs.readdirSync(subdirPath);
      for (const file of files) {
        if (file === 'entries.json') continue;
        const filePath = path.join(subdirPath, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.size > 200000) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.includes('activeTab === "erp"') || content.includes('activeTab === \'erp\'')) {
              console.log(`Found match in history: ${filePath} (Size: ${stat.size}, Modified: ${stat.mtime})`);
              // Let's print the entries.json details if it exists
              const entriesPath = path.join(subdirPath, 'entries.json');
              if (fs.existsSync(entriesPath)) {
                console.log(`- Entries details: ${fs.readFileSync(entriesPath, 'utf8')}`);
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
}

dirs.forEach(d => {
  console.log(`Searching history in ${d}...`);
  search(d);
});
console.log('Search finished.');
