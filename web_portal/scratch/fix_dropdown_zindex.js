const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target1 = '<View style={{ flex: 1, minWidth: 150 }}>\n                                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#555", marginBottom: 4 }}>Filter Batch:</Text>';
const replacement1 = '<View style={{ flex: 1, minWidth: 150, zIndex: showBatchFilterDropdown ? 99999 : 10, position: "relative" }}>\n                                    <Text style={{ fontSize: 11, fontWeight: "bold", color: darkMode ? "#ccc" : "#555", marginBottom: 4 }}>Filter Batch:</Text>';

const target2 = 'zIndex: 1101,';
const replacement2 = 'zIndex: 99999, elevation: 20,';

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  content = content.replace(target2, replacement2);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated dropdown zIndex in App.tsx');
} else {
  console.log('Target string not found');
}
