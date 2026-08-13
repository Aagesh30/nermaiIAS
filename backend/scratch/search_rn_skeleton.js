const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchRNDashboardSkeleton() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== RNDASHBOARD SKELETON SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('RNDashboardSkeleton') || line.includes('function RNDashboardSkeleton') || line.includes('const RNDashboardSkeleton')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchRNDashboardSkeleton().catch(console.error);
