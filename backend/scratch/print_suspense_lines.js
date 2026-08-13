const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function printSuspenseLines() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== APP.TSX LARGE SUSPENSE BLOCK ===");
  for await (const line of rl) {
    lineCount++;
    if (lineCount >= 21380 && lineCount <= 21475) {
      console.log(`${lineCount}: ${line}`);
    }
  }
}

printSuspenseLines().catch(console.error);
