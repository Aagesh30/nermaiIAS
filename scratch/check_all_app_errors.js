const fs = require('fs');
const content = fs.readFileSync('scratch/tsc_proj_output.txt', 'utf8');
const lines = content.split('\n');
const appErrors = lines.filter(l => l.startsWith('App.tsx('));
console.log(`Total errors in App.tsx: ${appErrors.length}`);
appErrors.forEach(l => console.log(l));
