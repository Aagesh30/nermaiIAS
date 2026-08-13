const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchMaxWidth() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== MAX WIDTH SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (lineCount >= 14000 && lineCount <= 17500) {
      if (line.includes('maxWidth') || line.includes('alignSelf') || line.includes('width:')) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchMaxWidth().catch(console.error);
