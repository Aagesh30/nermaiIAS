const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');

// Find return statement of App function
const appStartIndex = content.indexOf('export default function App()');
if (appStartIndex !== -1) {
  const slice = content.substring(appStartIndex, appStartIndex + 4000);
  console.log('App function beginning:\n', slice.substring(0, 1000));
}

// Find lines containing activeTab conditional rendering
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('activeTab ===') && line.includes('&&')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
