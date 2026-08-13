const fs = require('fs');
const path = require('path');

const expoPkgPath = path.join(__dirname, '..', 'web_portal', 'node_modules', 'expo', 'package.json');
if (fs.existsSync(expoPkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(expoPkgPath, 'utf8'));
  console.log('Expo package.json "bin":', pkg.bin);
} else {
  console.log('Expo package.json not found!');
}
