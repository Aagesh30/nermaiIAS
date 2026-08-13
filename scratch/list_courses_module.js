const fs = require('fs');
const path = require('path');

const coursesPath = path.join(__dirname, '..', 'backend', 'modules', 'courses');
if (fs.existsSync(coursesPath)) {
  console.log('Courses Module Files:');
  console.log(fs.readdirSync(coursesPath));
} else {
  console.log('Courses module folder not found.');
}
