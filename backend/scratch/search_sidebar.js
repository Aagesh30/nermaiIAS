const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchSidebar() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== SIDEBAR/NAVIGATION SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('sidebar') || lowerLine.includes('drawer') || lowerLine.includes('navigation') || lowerLine.includes('menu')) {
      if (lineCount > 10000 && lineCount < 22100) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchSidebar().catch(console.error);
