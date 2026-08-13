const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

let openViews = 0;
let openScrolls = 0;

for (let i = 6090; i < 8896; i++) {
  const line = lines[i];
  if (line.includes('<ScrollView')) openScrolls++;
  if (line.includes('</ScrollView>')) openScrolls--;
  if (line.includes('<View')) openViews++;
  if (line.includes('</View>')) openViews--;
}

console.log(`At end of ERP section: Open Views = ${openViews}, Open ScrollViews = ${openScrolls}`);
