const fs = require('fs');
const path = require('path');

function findSyllabusFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.expo' || file === 'temp_zip_extract') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findSyllabusFiles(fullPath);
    } else if (file.toLowerCase().includes('syllabus')) {
      console.log('Found syllabus file:', fullPath);
    }
  }
}

findSyllabusFiles(path.join(__dirname, '..'));
