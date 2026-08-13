const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/backend/modules/students/service.ts';

async function searchServiceAck() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== SERVICE ACK SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (line.includes('acknowledgement') || line.includes('Acknowledgement')) {
      console.log(`Line ${lineCount}: ${line.trim()}`);
    }
  }
}

searchServiceAck().catch(console.error);
