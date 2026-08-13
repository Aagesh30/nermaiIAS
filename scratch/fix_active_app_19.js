const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

const target = `                                </ScrollView>
                          </View>
                        )}`;

const replacement = `                                </ScrollView>
                              </>
                            )}
                          </View>
                        )}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(appPath, content, 'utf8');
  console.log("Applied Fix 2");
} else {
  console.error("Target 2 not found");
}
