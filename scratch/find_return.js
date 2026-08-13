const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8').split('\n');

let foundReturn = -1;
for (let i = 4000; i < content.length; i++) {
  if (content[i].includes('return (') && content[i].trim().startsWith('return')) {
    foundReturn = i;
    break;
  }
}

if (foundReturn !== -1) {
  console.log(`Found return at line ${foundReturn + 1}`);
  console.log(content.slice(foundReturn, foundReturn + 200).join('\n'));
} else {
  // Let's search from index 0
  for (let i = 0; i < content.length; i++) {
    if (content[i].includes('return (') && (content[i].includes('export default') || content[i].includes('App(') || i > 4000)) {
      console.log(`Potential return at line ${i + 1}: ${content[i]}`);
    }
  }
}
