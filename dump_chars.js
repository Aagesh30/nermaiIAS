const fs = require('fs');

const filePath = 'd:\\unistrix\\NERMAI_IAS_ACADEMY\\web_portal\\App.tsx';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split(/\r?\n/);

console.log('--- Lines 16175 to 16183 ---');
for (let i = 16174; i <= 16182; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}

console.log('--- Lines 19795 to 19803 ---');
for (let i = 19794; i <= 19802; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}
