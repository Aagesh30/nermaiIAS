const fs = require('fs');
const path = require('path');

const tscOutputPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'tsc_output_utf8.txt');

if (fs.existsSync(tscOutputPath)) {
  const content = fs.readFileSync(tscOutputPath, 'utf8');
  const lines = content.split('\n');
  
  console.log(`Total tsc error lines: ${lines.length}`);
  
  const appErrors = [];
  lines.forEach(line => {
    if (line.includes('App.tsx') && line.includes('error TS')) {
      appErrors.push(line.trim());
    }
  });
  
  console.log(`Errors in App.tsx: ${appErrors.length}`);
  console.log('\n--- First 30 Errors in App.tsx ---');
  appErrors.slice(0, 30).forEach(e => console.log(e));
} else {
  console.log('tsc_output_utf8.txt does not exist');
}
