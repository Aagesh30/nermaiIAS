const fs = require('fs');
const path = require('path');

const historyDir = path.join(process.env.APPDATA, 'Trae', 'User', 'History');
if (fs.existsSync(historyDir)) {
  const subdirs = fs.readdirSync(historyDir);
  subdirs.forEach(subdir => {
    const entriesJsonPath = path.join(historyDir, subdir, 'entries.json');
    if (fs.existsSync(entriesJsonPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(entriesJsonPath, 'utf8'));
        console.log(`Trae Resource: ${data.resource}`);
      } catch (e) {
        // ignore
      }
    }
  });
} else {
  console.log('Trae history directory does not exist');
}
