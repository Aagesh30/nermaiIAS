const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');

// Find all matches of imports
const regex = /import\s+[\s\S]*?\s+from\s+['"]react-native['"]/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log('Match found:\n', match[0]);
}
