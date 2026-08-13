const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, '..', 'backend', 'modules', 'courses', 'repository.ts');
if (fs.existsSync(repoPath)) {
  const content = fs.readFileSync(repoPath, 'utf8');
  const lines = content.split('\n');
  let currentClass = '';
  lines.forEach((line, idx) => {
    if (line.includes('class ') && line.includes('Repository')) {
      currentClass = line.trim();
      console.log(`\n${currentClass}`);
    }
    if (line.includes('async ') && (line.includes('find') || line.includes('create') || line.includes('update') || line.includes('delete'))) {
      console.log(`  Line ${idx + 1}: ${line.trim()}`);
    }
  });
}
