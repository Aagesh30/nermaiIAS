const fs = require('fs');
const path = require('path');

const cleanAppPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'scratch', 'App_clean.tsx');

if (fs.existsSync(cleanAppPath)) {
  const buf = fs.readFileSync(cleanAppPath);
  console.log(`Byte length: ${buf.length}`);
  console.log('First 20 bytes:', Array.from(buf.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '));
  // Check if UTF-16 BOM exists
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    console.log('Detected UTF-16 LE BOM');
  } else if (buf[0] === 0xfe && buf[1] === 0xff) {
    console.log('Detected UTF-16 BE BOM');
  } else {
    console.log('No UTF-16 BOM detected');
  }
} else {
  console.log('File does not exist');
}
