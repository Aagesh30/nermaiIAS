const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');
const lines = content.split('\n');

console.log("--- LMS Map 1 ---");
for (let i = 9084; i < 9095; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}

console.log("--- LMS Map 2 ---");
for (let i = 9120; i < 9130; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}

console.log("--- LMS Map 3 ---");
for (let i = 9150; i < 9160; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}
