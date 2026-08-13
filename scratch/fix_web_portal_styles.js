const fs = require('fs');
const path = require('path');

const filePath = 'a:/NERMAI_IAS_ACADEMY/web_portal/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace paddingHorizontal with paddingLeft and paddingRight for select components
// e.g. paddingHorizontal: 4, -> paddingLeft: 4, paddingRight: 4,
content = content.replace(
  /paddingHorizontal:\s*4\s*,\s*\n\s*backgroundColor:/g,
  'paddingLeft: 4, paddingRight: 4,\n                                  backgroundColor:'
);

content = content.replace(
  /paddingHorizontal:\s*4\s*,\s*\r\n\s*backgroundColor:/g,
  'paddingLeft: 4, paddingRight: 4,\r\n                                  backgroundColor:'
);

// Let's replace the border property on View style blocks (lines 6550 and 6719)
content = content.replace(
  /border:\s*"1px\s+solid\s*"\s*\+\s*\(darkMode\s*\?\s*"#444"\s*:\s*"#eee"\)/g,
  'borderWidth: 1, borderStyle: "solid", borderColor: darkMode ? "#444" : "#eee"'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully fixed styling bugs in web_portal/App.tsx!");
