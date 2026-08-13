const fs = require('fs');
const path = require('path');

const brainDir = path.join(process.env.USERPROFILE, '.gemini', 'antigravity', 'brain');

function search(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        search(fullPath);
      } else {
        if (file === 'overview.txt') {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Find write_to_file occurrences
          const regex = /"name"\s*:\s*"write_to_file"\s*,\s*"args"\s*:\s*\{([\s\S]*?)\}/g;
          let match;
          while ((match = regex.exec(content)) !== null) {
            const argsStr = '{' + match[1] + '}';
            try {
              const args = JSON.parse(argsStr);
              const targetFile = args.TargetFile || args.targetFile;
              if (targetFile && (targetFile.includes('App.tsx') || targetFile.includes('App.jsx'))) {
                console.log(`Found write_to_file for ${targetFile} in log: ${fullPath}`);
                console.log(`- CodeContent length: ${args.CodeContent ? args.CodeContent.length : 0}`);
              }
            } catch (e) {
              // try simple string match
              if (argsStr.includes('App.tsx') && argsStr.includes('CodeContent')) {
                console.log(`Found potential raw write_to_file in log: ${fullPath}`);
              }
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

console.log(`Searching brain logs for file writes...`);
search(brainDir);
console.log('Search finished.');
