const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchFees() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== FEES PAGE SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('erpSub === "fees"') || line.includes("erpSub === 'fees'")) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchFees().catch(console.error);
