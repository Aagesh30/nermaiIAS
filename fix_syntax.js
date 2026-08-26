const fs = require('fs');

const filePath = 'd:\\unistrix\\NERMAI_IAS_ACADEMY\\web_portal\\App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Target 1 exact spaces:
// 39 spaces before }
// 38 spaces before )}
// 36 spaces before </View>
const target1 = '                                       }\n                                      )}\n                                    </View>';
const replacement1 = '                                      )}\n                                    </View>';

// Target 2 exact spaces:
// 37 spaces before )}
// 36 spaces before )}
// 34 spaces before </View>
const target2 = '                                     )}\n                                    )}\n                                  </View>';
const replacement2 = '                                     )}\n                                  </View>';

if (content.includes(target1)) {
  console.log('Found target 1!');
  content = content.replace(target1, replacement1);
} else {
  const target1_crlf = target1.replace(/\n/g, '\r\n');
  const replacement1_crlf = replacement1.replace(/\n/g, '\r\n');
  if (content.includes(target1_crlf)) {
    console.log('Found target 1 CRLF!');
    content = content.replace(target1_crlf, replacement1_crlf);
  } else {
    console.log('Target 1 NOT found!');
  }
}

if (content.includes(target2)) {
  console.log('Found target 2!');
  content = content.replace(target2, replacement2);
} else {
  const target2_crlf = target2.replace(/\n/g, '\r\n');
  const replacement2_crlf = replacement2.replace(/\n/g, '\r\n');
  if (content.includes(target2_crlf)) {
    console.log('Found target 2 CRLF!');
    content = content.replace(target2_crlf, replacement2_crlf);
  } else {
    console.log('Target 2 NOT found!');
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
