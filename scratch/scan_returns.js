const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8').split('\n');

// We want to find the main return statement of the App function
// Export default function App() starts at line 231.
// Let's scan from line 231 to the end of the file.
let braceCount = 0;
let inApp = false;
let returnStatementLines = [];

for (let i = 0; i < content.length; i++) {
  const line = content[i];
  if (line.includes('export default function App()')) {
    inApp = true;
  }
  
  if (inApp) {
    if (line.includes('return (') && line.trim().startsWith('return')) {
      console.log(`Return statement found at line ${i + 1}: ${line}`);
    }
  }
}
