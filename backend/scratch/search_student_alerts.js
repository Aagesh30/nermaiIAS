const fs = require('fs');
const readline = require('readline');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';

async function searchStudentDashboardAlerts() {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineCount = 0;
  console.log("=== STUDENT DASHBOARD ALERTS SEARCH ===");
  for await (const line of rl) {
    lineCount++;
    if (lineCount >= 11450 && lineCount <= 11800) {
      if (line.includes('notification') || line.includes('Notification') || line.includes('alert') || line.includes('Alert') || line.includes('fee') || line.includes('Fee')) {
        console.log(`Line ${lineCount}: ${line.trim()}`);
      }
    }
  }
}

searchStudentDashboardAlerts().catch(console.error);
