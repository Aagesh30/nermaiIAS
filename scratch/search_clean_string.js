const fs = require('fs');
const path = require('path');

const cleanAppPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');

if (fs.existsSync(cleanAppPath)) {
  const content = fs.readFileSync(cleanAppPath, 'utf8');
  console.log(`Content length: ${content.length}`);
  
  const searchStr = 'students';
  const index = content.indexOf(searchStr);
  console.log(`Index of '${searchStr}': ${index}`);
  
  if (index !== -1) {
    console.log('Surrounding text:', content.substring(index - 50, index + 50));
  }
} else {
  console.log('File does not exist');
}
