const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function extractSuspenseBlocks() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  let inSuspense = false;
  let suspenseStartLine = 0;
  let linesBuffer = [];

  console.log("=== DETAILED SUSPENSE RENDER BLOCKS ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('<Suspense') || line.includes('<React.Suspense')) {
      inSuspense = true;
      suspenseStartLine = lineCount;
      linesBuffer = [line.trim()];
    } else if (inSuspense) {
      linesBuffer.push(line.trim());
      if (line.includes('</Suspense>') || line.includes('</React.Suspense>')) {
        inSuspense = false;
        console.log(`Lines ${suspenseStartLine}-${lineCount}:`);
        console.log(linesBuffer.slice(0, 10).join('\n'));
        if (linesBuffer.length > 10) {
          console.log(`... (${linesBuffer.length - 10} more lines)`);
          console.log(linesBuffer.slice(-2).join('\n'));
        }
        console.log("-----------------------------------------");
      }
    }
  }
}

extractSuspenseBlocks().catch(console.error);
