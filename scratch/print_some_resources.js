const fs = require('fs');
const path = require('path');

const historyDir = path.join(process.env.APPDATA, 'Code', 'User', 'History');
if (fs.existsSync(historyDir)) {
  const subdirs = fs.readdirSync(historyDir);
  let count = 0;
  for (const subdir of subdirs) {
    const entriesJsonPath = path.join(historyDir, subdir, 'entries.json');
    if (fs.existsSync(entriesJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(entriesJsonPath, 'utf8'));
        console.log(`Resource: ${data.resource}`);
        count++;
        if (count >= 100) break;
      } catch (e) {
        // ignore
      }
    }
  }
} else {
  console.log('History directory does not exist');
}
