const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchFile() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== SEARCH RESULTS ===");
  for await (const line of rl) {
    lineCount++;
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('const [user') || lowerLine.includes('userrole') || lowerLine.includes('role ===') || lowerLine.includes('role === "teacher"') || lowerLine.includes('isadmin')) {
      if (lineCount > 10000 && lineCount < 20000) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchFile().catch(console.error);
