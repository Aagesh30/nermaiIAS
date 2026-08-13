const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const excelPath = path.join(__dirname, '..', 'Nermai_Faculty_Tracker (2).xlsx');

if (!fs.existsSync(excelPath)) {
  console.error('File not found at:', excelPath);
  process.exit(1);
}

console.log('Found Excel file of size:', fs.statSync(excelPath).size, 'bytes');

// Try to load 'xlsx' library
let XLSX;
try {
  // Try standard require (which looks up node_modules)
  XLSX = require('xlsx');
} catch (e) {
  // Try parent node_modules specifically
  try {
    XLSX = require(path.join(__dirname, '..', 'node_modules', 'xlsx'));
  } catch (err) {
    console.log('xlsx not found in parent, installing...');
    execSync('npm install xlsx', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
    XLSX = require('xlsx');
  }
}

const workbook = XLSX.readFile(excelPath);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  console.log(`\nSheet: ${sheetName} (Rows: ${data.length})`);
  if (data.length > 0) {
    console.log('First 5 rows:');
    console.log(JSON.stringify(data.slice(0, 5), null, 2));
  }
});
