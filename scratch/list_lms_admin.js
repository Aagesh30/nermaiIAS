const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, '..', 'web_portal', 'lms', 'admin');
if (fs.existsSync(adminPath)) {
  console.log(fs.readdirSync(adminPath));
} else {
  console.log('LMS admin directory not found.');
}
