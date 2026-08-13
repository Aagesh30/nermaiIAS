const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8').split('\n');

const lineNumbers = [666, 750, 891, 919, 2838, 3856, 3990, 4614, 4769];
lineNumbers.forEach(ln => {
  console.log(`\n--- Line ${ln} ---`);
  const start = Math.max(0, ln - 5);
  const end = Math.min(content.length, ln + 15);
  for (let i = start; i < end; i++) {
    console.log(`${i+1}: ${content[i]}`);
  }
});
