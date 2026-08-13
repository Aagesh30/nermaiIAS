const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(process.env.APPDATA, 'Code', 'User', 'History'),
  path.join(process.env.APPDATA, 'Cursor', 'User', 'History'),
  path.join(process.env.APPDATA, 'Trae', 'User', 'History')
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) return;
  console.log(`Checking history directory: ${d}`);
  const subdirs = fs.readdirSync(d);
  for (const subdir of subdirs) {
    const subdirPath = path.join(d, subdir);
    if (fs.statSync(subdirPath).isDirectory()) {
      const entriesJsonPath = path.join(subdirPath, 'entries.json');
      if (fs.existsSync(entriesJsonPath)) {
        try {
          const entriesData = JSON.parse(fs.readFileSync(entriesJsonPath, 'utf8'));
          const resource = entriesData.resource || '';
          if (resource.toLowerCase().includes('app.tsx')) {
            console.log(`Found entries match in ${subdirPath}:`);
            console.log(`- Resource: ${resource}`);
            console.log(`- Entries:`, entriesData.entries);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
});
