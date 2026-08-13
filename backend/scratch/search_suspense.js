const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchSuspense() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== APP.TSX SUSPENSE SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('Suspense') || line.includes('React.lazy') || line.includes('fallback=')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchSuspense().catch(console.error);
