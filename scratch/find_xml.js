const fs = require('fs');
const path = require('path');

function findXmlFiles(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.expo' || file === 'temp_zip_extract') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findXmlFiles(fullPath);
    } else if (file.endsWith('.xml')) {
      console.log('Found XML file:', fullPath);
    }
  }
}

findXmlFiles(path.join(__dirname, '..'));
