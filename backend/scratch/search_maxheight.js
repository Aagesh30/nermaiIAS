const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchMaxHeight() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== MAXHEIGHT SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('maxheight')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchMaxHeight().catch(console.error);
