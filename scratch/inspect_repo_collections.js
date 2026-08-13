const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, '..', 'backend', 'modules', 'courses', 'repository.ts');
if (fs.existsSync(repoPath)) {
  const content = fs.readFileSync(repoPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('collection(') || line.includes('class ') || line.includes('extends ')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
}
