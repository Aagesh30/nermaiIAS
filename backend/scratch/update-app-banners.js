const fs = require('fs');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replacement 1: First incomplete profile banner condition (CRLF and LF versions)
const target1 = '                    {user.role === "student" && (() => {\r\n                      const myStudent = getLoggedInStudent(user, students);\r\n                      const rawCount =';
const target1_lf = '                    {user.role === "student" && (() => {\n                      const myStudent = getLoggedInStudent(user, students);\n                      const rawCount =';

const replacement1 = '                    {user.role === "student" && (() => {\r\n                      const myStudent = getLoggedInStudent(user, students);\r\n                      if (myStudent && (myStudent.profileComplete === true || myStudent.profileComplete === "true")) return null;\r\n                      const rawCount =';
const replacement1_lf = '                    {user.role === "student" && (() => {\n                      const myStudent = getLoggedInStudent(user, students);\n                      if (myStudent && (myStudent.profileComplete === true || myStudent.profileComplete === "true")) return null;\n                      const rawCount =';

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log('Successfully replaced Target 1 (CRLF)');
} else if (content.includes(target1_lf)) {
  content = content.replace(target1_lf, replacement1_lf);
  console.log('Successfully replaced Target 1 (LF)');
} else {
  console.log('Warning: Target 1 not found');
}

// Replacement 2: Second incomplete profile banner condition (CRLF and LF versions)
const target2 = '                    {/* INCOMPLETE PROFILE WARNING BANNER FOR STUDENT */}\r\n                    {(() => {\r\n                      if (user.role !== "student") return null;\r\n                      const myStudent = getLoggedInStudent(user, students);';
const target2_lf = '                    {/* INCOMPLETE PROFILE WARNING BANNER FOR STUDENT */}\n                    {(() => {\n                      if (user.role !== "student") return null;\n                      const myStudent = getLoggedInStudent(user, students);';

const replacement2 = '                    {/* INCOMPLETE PROFILE WARNING BANNER FOR STUDENT */}\r\n                    {(() => {\r\n                      if (user.role !== "student") return null;\r\n                      const myStudent = getLoggedInStudent(user, students);\r\n                      if (myStudent && (myStudent.profileComplete === true || myStudent.profileComplete === "true")) return null;';
const replacement2_lf = '                    {/* INCOMPLETE PROFILE WARNING BANNER FOR STUDENT */}\n                    {(() => {\n                      if (user.role !== "student") return null;\n                      const myStudent = getLoggedInStudent(user, students);\n                      if (myStudent && (myStudent.profileComplete === true || myStudent.profileComplete === "true")) return null;';

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
console.log('App.tsx profile incomplete banner fixes successfully written');
