const fs = require('fs');
const path = require('path');

const dirs = [
  path.join(process.env.APPDATA, 'Code', 'User', 'History'),
  path.join(process.env.APPDATA, 'Cursor', 'User', 'History'),
  path.join(process.env.APPDATA, 'Trae', 'User', 'History')
];

dirs.forEach(d => {
  if (fs.existsSync(d)) {
    const files = fs.readdirSync(d);
    console.log(`Directory ${d} exists and has ${files.length} children`);
    if (files.length > 0) {
      console.log(`Sample child: ${files[0]}`);
    }
  } else {
    console.log(`Directory ${d} does not exist`);
  }
});
