const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchWebSpecific() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== WEB PLATFORM SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes("Platform.OS === 'web'") || line.includes('Platform.OS === "web"')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchWebSpecific().catch(console.error);
