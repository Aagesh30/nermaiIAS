const fs = require('fs');
const path = require('path');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replacement 1: List View Card
const target1 = 'Roll: {s.rollNumber || "N/A"} | Batch: {s.batch || "N/A"}';
const replacement1 = 'Roll: {s.rollNumber || s.loginUsername || "N/A"} | Batch: {s.batch || "N/A"}';

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log('Successfully replaced Target 1');
} else {
  console.log('Warning: Target 1 not found');
}

// Replacement 2: Details Modal
const target2 = 'Roll Number:</Text> {s.rollNumber || "N/A"}';
const replacement2 = 'Roll Number:</Text> {s.rollNumber || s.loginUsername || "N/A"}';

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log('Successfully replaced Target 2');
} else {
  console.log('Warning: Target 2 not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Write complete');
