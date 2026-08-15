const fs = require('fs');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = 'if (user.role && ["developer", "super_admin", "admin"].includes(user.role)) {';
const replacement = 'if (user.role && ["developer", "super_admin"].includes(user.role)) {';

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log('Successfully replaced target');
} else {
  console.log('Warning: target not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Write complete');
