const XLSX = require('xlsx');
const path = require('path');
const workbook = XLSX.readFile(path.join(__dirname, '..', 'Nermai_Faculty_Tracker (2).xlsx'));
console.log('Sheet Names:', workbook.SheetNames);
