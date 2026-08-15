const fs = require('fs');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replacement 1: loadStudents endpoint update (using regex or single line checks)
const target1 = 'const res = await api.get("/erp/student");\r\n      setStudents(res?.data || res || []);';
const target1_lf = 'const res = await api.get("/erp/student");\n      setStudents(res?.data || res || []);';

const replacement1 = 'const endpoint = user?.role === "student" ? "/erp/student/profile/me" : "/erp/student";\r\n      const res = await api.get(endpoint);\r\n      setStudents(res?.data || res || []);';
const replacement1_lf = 'const endpoint = user?.role === "student" ? "/erp/student/profile/me" : "/erp/student";\n      const res = await api.get(endpoint);\n      setStudents(res?.data || res || []);';

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log('Successfully replaced Target 1 (CRLF)');
} else if (content.includes(target1_lf)) {
  content = content.replace(target1_lf, replacement1_lf);
  console.log('Successfully replaced Target 1 (LF)');
} else {
  console.log('Warning: Target 1 not found');
}

// Replacement 2: loadStudents call location update
const target2 = 'if (user.role && ["super_admin", "admin", "staff"].includes(user.role)) {\r\n        loadStudents();';
const target2_lf = 'if (user.role && ["super_admin", "admin", "staff"].includes(user.role)) {\n        loadStudents();';

const replacement2 = 'loadStudents();\r\n      if (user.role && ["super_admin", "admin", "staff"].includes(user.role)) {';
const replacement2_lf = 'loadStudents();\n      if (user.role && ["super_admin", "admin", "staff"].includes(user.role)) {';

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log('Successfully replaced Target 2 (CRLF)');
} else if (content.includes(target2_lf)) {
  content = content.replace(target2_lf, replacement2_lf);
  console.log('Successfully replaced Target 2 (LF)');
} else {
  console.log('Warning: Target 2 not found');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('App.tsx updates successfully written');
