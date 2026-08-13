const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchDarkMode() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== DARKMODE SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('const [darkMode') || line.includes('toggleDarkMode') || line.includes('document.documentElement')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchDarkMode().catch(console.error);
