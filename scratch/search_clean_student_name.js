const fs = require('fs');
const path = require('path');

const cleanAppPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');

if (fs.existsSync(cleanAppPath)) {
  const content = fs.readFileSync(cleanAppPath, 'utf8');
  const index = content.indexOf('getStudentName');
  console.log(`Index of 'getStudentName': ${index}`);
  if (index !== -1) {
    console.log('Surrounding:', content.substring(index - 100, index + 100));
  }
} else {
  console.log('File does not exist');
}
