const fs = require('fs');
const path = require('path');

const historyDir = path.join(process.env.APPDATA, 'Code', 'User', 'History');

if (fs.existsSync(historyDir)) {
  const subdirs = fs.readdirSync(historyDir);
  console.log(`Subdirs count: ${subdirs.length}`);
  let fileCount = 0;
  for (const subdir of subdirs) {
    const subdirPath = path.join(historyDir, subdir);
    if (fs.statSync(subdirPath).isDirectory()) {
      const files = fs.readdirSync(subdirPath);
      for (const file of files) {
        const filePath = path.join(subdirPath, file);
        const stat = fs.statSync(filePath);
        fileCount++;
        if (fileCount <= 20) {
          console.log(`File: ${filePath} (Size: ${stat.size})`);
          if (file.endsWith('.json')) {
            console.log(`JSON content: ${fs.readFileSync(filePath, 'utf8').substring(0, 100)}`);
          } else {
            console.log(`Raw preview: ${fs.readFileSync(filePath, 'utf8').substring(0, 100)}`);
          }
        }
      }
    }
  }
} else {
  console.log('History directory does not exist');
}
