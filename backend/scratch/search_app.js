const fs = require('fs');
const readline = require('readline');
const path = require('path');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchFile() {
  const fileStream = fs.createReadStream(filePath);

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  console.log("=== SEARCH RESULTS ===");
  for await (const line of rl) {
    lineCount++;
    const lowerLine = line.toLowerCase();
    // Search for teacher role check, bottom tabs, or where navigation tabs are rendered
    if (lowerLine.includes('teacher') || lowerLine.includes('erp') || lowerLine.includes('lms') || lowerLine.includes('test portal') || lowerLine.includes('tab')) {
      if (lineCount > 15000 && lineCount < 23900) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchFile().catch(console.error);
