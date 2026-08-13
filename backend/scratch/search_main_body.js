const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchMainBody() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== MAINBODY SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.trim().startsWith('mainBody:')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchMainBody().catch(console.error);
