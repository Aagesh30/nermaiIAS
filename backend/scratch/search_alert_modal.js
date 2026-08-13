const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchAlertModal() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== ALERT MODAL SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('feeAlertModalStudent')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchAlertModal().catch(console.error);
