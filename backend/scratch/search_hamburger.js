const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchHamburger() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== HAMBURGER SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('showhamburger') || lowerLine.includes('drawer')) {
      if (lineCount > 10000 && lineCount < 23700) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchHamburger().catch(console.error);
