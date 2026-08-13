const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(process.env.APPDATA, 'Code', 'User', 'History'),
  path.join(process.env.APPDATA, 'Cursor', 'User', 'History'),
  path.join(process.env.APPDATA, 'Trae', 'User', 'History')
];

function searchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        searchDir(fullPath);
      } else {
        // App.tsx is around 619KB (600,000 - 640,000 bytes)
        if (stat.size > 550000 && stat.size < 650000) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('NERMAI') && content.includes('activeTab') && content.includes('database')) {
            console.log(`Found candidate: ${fullPath} (Size: ${stat.size})`);
            if (!content.includes('CUSTOM LOADING ANIMATIONS')) {
              console.log(`-> This candidate is CLEAN! Copying to App.tsx...`);
              fs.writeFileSync('App.tsx', content, 'utf8');
              console.log('Successfully restored App.tsx!');
              process.exit(0);
            } else {
              console.log(`-> Contains CUSTOM LOADING ANIMATIONS (modified version).`);
            }
          }
        }
      }
    } catch (e) {
      // ignore errors
    }
  }
}

dirs.forEach(d => {
  console.log(`Searching in ${d}...`);
  searchDir(d);
});
console.log('Search finished.');
