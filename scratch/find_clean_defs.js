const fs = require('fs');
const path = require('path');

const cleanPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');
if (!fs.existsSync(cleanPath)) {
  console.log("App_clean.tsx does not exist");
  process.exit(0);
}
const content = fs.readFileSync(cleanPath, 'utf8');

['DEFAULT_HOST_IP', 'API_TIMEOUT_MS', 'guestStorage', 'DateTimePickerSelect'].forEach(name => {
  console.log(`=== ${name} ===`);
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes(name) && (line.includes('const ') || line.includes('let ') || line.includes('var ') || line.includes('function ') || line.includes('import '))) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
});
