const fs = require('fs');
const path = require('path');

const tscOutputPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'tsc_output_utf8.txt');

if (fs.existsSync(tscOutputPath)) {
  const content = fs.readFileSync(tscOutputPath, 'utf8');
  const lines = content.split('\n');
  
  const otherErrors = [];
  lines.forEach(line => {
    if (line.includes('App.tsx') && line.includes('error TS')) {
      const match = line.match(/App\.tsx\((\d+),\d+\):/);
      if (match) {
        const lineNum = parseInt(match[1], 10);
        if (lineNum < 534 || lineNum > 880) {
          otherErrors.push(line.trim());
        }
      }
    }
  });
  
  console.log(`Errors outside renderHallTicket: ${otherErrors.length}`);
  console.log('\n--- First 30 Errors outside renderHallTicket ---');
  otherErrors.slice(0, 30).forEach(e => console.log(e));
} else {
  console.log('tsc_output_utf8.txt does not exist');
}
