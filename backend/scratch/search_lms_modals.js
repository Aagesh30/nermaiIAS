const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchLmsModals() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== LMS MODALS SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('renderLmsModals') || line.includes('function renderLmsModals')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchLmsModals().catch(console.error);
