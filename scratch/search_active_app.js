const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');

if (fs.existsSync(appPath)) {
  const content = fs.readFileSync(appPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  let matches = 0;
  lines.forEach((line, idx) => {
    if ((line.includes('const ') || line.includes('function ')) && line.includes('=>') && matches < 30) {
      console.log(`${idx + 1}: ${line.trim()}`);
      matches++;
    }
  });
} else {
  console.log('File does not exist');
}
