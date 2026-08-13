const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchSplitContent() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== SPLITCONTENT SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (lineCount >= 13880 && lineCount <= 19688) {
      if (line.includes('splitContent')) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchSplitContent().catch(console.error);
