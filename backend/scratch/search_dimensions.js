const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchDimensions() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== DIMENSIONS SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('Dimensions') || line.includes('useWindowDimensions')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchDimensions().catch(console.error);
