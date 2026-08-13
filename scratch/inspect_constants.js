const fs = require('fs');
const path = require('path');

const constPath = path.join(__dirname, '..', 'backend', 'modules', 'courses', 'constants.ts');
if (fs.existsSync(constPath)) {
  console.log(fs.readFileSync(constPath, 'utf8'));
}
