const fs = require('fs');
const content = fs.readFileSync('web_portal/App.tsx', 'utf8');
const lines = content.split('\n');
console.log(`web_portal/App.tsx has ${lines.length} lines, size = ${content.length} characters`);
console.log('First 30 lines:');
console.log(lines.slice(0, 30).join('\n'));
