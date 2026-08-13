const fs = require('fs');
const path = require('path');

const brainDir = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file === 'overview.txt') {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('getStudentName')) {
        console.log(`Found getStudentName in log: ${fullPath}`);
      }
    }
  });
}

if (fs.existsSync(brainDir)) {
  searchDir(brainDir);
} else {
  console.log('Brain directory does not exist');
}
