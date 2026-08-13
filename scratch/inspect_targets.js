const fs = require('fs');
const content = fs.readFileSync('web_portal/App.tsx', 'utf8');

console.log("INDEX OF COMPARISON START:", content.indexOf('Roll No / Username: {viewing.username}'));
console.log("INDEX OF MYPROFILE START:", content.indexOf('approved-notice'));

// Let's print around the profile requests reviews
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('Roll No / Username:')) {
    console.log(`Line ${idx+1}: '${line.replace(/ /g, '.')}'`);
  }
  if (line.includes('Your profile has been approved!')) {
    console.log(`Line ${idx+1}: '${line.replace(/ /g, '.')}'`);
  }
});
