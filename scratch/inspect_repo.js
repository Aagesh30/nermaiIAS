const fs = require('fs');
const path = require('path');

const coursesPath = path.join(__dirname, '..', 'backend', 'modules', 'courses');

function inspectFile(filename) {
  const filePath = path.join(coursesPath, filename);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`\n=== File: ${filename} ===`);
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('db.') || line.includes('collection') || line.includes('getFirestore') || line.includes('firestore') || line.includes('Subject') || line.includes('Topic') || line.includes('Subtopic')) {
      if (line.trim().length > 0) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    }
  });
}

inspectFile('repository.ts');
inspectFile('service.ts');
inspectFile('controller.ts');
