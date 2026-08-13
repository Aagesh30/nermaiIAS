const fs = require('fs');
const path = require('path');

const modulesPath = path.join(__dirname, '..', 'backend', 'modules');
if (fs.existsSync(modulesPath)) {
  console.log('Backend Modules:');
  console.log(fs.readdirSync(modulesPath));
} else {
  console.log('Backend modules folder not found.');
}

const lmsModulesPath = path.join(__dirname, '..', 'backend', 'modules', 'lms');
if (fs.existsSync(lmsModulesPath)) {
  console.log('LMS Modules:');
  console.log(fs.readdirSync(lmsModulesPath));
}
