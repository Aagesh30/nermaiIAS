const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchStylesMaxWidth() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== STYLESHEET MAXWIDTH SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (lineCount >= 23200) {
      if (line.includes('maxWidth') || line.includes('alignSelf') || line.includes('alignItems: "center"')) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchStylesMaxWidth().catch(console.error);
