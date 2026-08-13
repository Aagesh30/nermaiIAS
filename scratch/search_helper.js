const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'web_portal', 'App.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const isAdmin') || lines[i].includes('let isAdmin')) {
    console.log(`${i + 1}: ${lines[i].trim()}`);
  }
}
