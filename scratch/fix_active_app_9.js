const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

const target5 = `                                    {isCorrect(opt) && <Ionicons name="checkmark-circle" size={14} color="#2e7d32" style={{ marginLeft: 4 }} />}
                                  </View>
                                );
                            </View>`;

const replacement5 = `                                    {isCorrect(opt) && <Ionicons name="checkmark-circle" size={14} color="#2e7d32" style={{ marginLeft: 4 }} />}
                                  </View>
                                );
                              })}
                            </View>`;

if (content.includes(target5)) {
  content = content.replace(target5, replacement5);
  fs.writeFileSync(appPath, content, 'utf8');
  console.log("Applied Target 5 Fix");
} else {
  console.error("Target 5 not found");
}
