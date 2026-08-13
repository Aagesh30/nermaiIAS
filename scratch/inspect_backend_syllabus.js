const fs = require('fs');
const path = require('path');

function searchSyllabus(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'temp_zip_extract') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchSyllabus(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes('syllabus')) {
        console.log('Found "syllabus" in:', fullPath);
      }
    }
  }
}

searchSyllabus(path.join(__dirname, '..', 'backend'));
