const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(process.env.APPDATA, 'Code', 'User', 'History'),
  path.join(process.env.APPDATA, 'Cursor', 'User', 'History'),
  path.join(process.env.APPDATA, 'Trae', 'User', 'History')
];

let candidates = [];
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
        if (stat.size > 250000 && stat.size < 700000) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes('react-native') && content.includes('activeTab')) {
            candidates.push({
              path: fullPath,
              size: stat.size,
              mtime: stat.mtime,
              clean: !content.includes('CUSTOM LOADING ANIMATIONS')
            });
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

dirs.forEach(d => {
  console.log(`Searching in ${d}...`);
  search(d);
});

console.log(`Found ${candidates.length} candidates.`);
candidates.sort((a, b) => b.mtime - a.mtime);

candidates.forEach((c, i) => {
  const dest = `scratch/candidate_${i}_size_${c.size}_clean_${c.clean}.tsx`;
  fs.copyFileSync(c.path, dest);
  console.log(`Copied candidate ${i}: ${c.path} (Size: ${c.size}, Modified: ${c.mtime}, Clean: ${c.clean}) -> ${dest}`);
});
