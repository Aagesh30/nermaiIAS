const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchLmsSplitContent() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== LMS SPLITCONTENT SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (lineCount >= 19688 && lineCount <= 21479) {
      if (line.includes('splitContent')) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchLmsSplitContent().catch(console.error);
