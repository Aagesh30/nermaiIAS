const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchFeeUpdates() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== FEE UPDATE SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('feesPaid') || line.includes('feeInstallments') || line.includes('/erp/student')) {
      if (lineCount > 20000 && lineCount < 23200) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchFeeUpdates().catch(console.error);
