const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

const target = `                                    <Text style={{
                                      fontSize: 11,
                                      color: isSelected ? "#c62828" : "#555",
                                      fontWeight: isSelected ? "bold" : "normal"
                                    }}>
                                      {status.toUpperCase()}
                                    </Text>
                                  </TouchableOpacity>
                                );
                            </View>`;

const replacement = `                                    <Text style={{
                                      fontSize: 11,
                                      color: isSelected ? "#c62828" : "#555",
                                      fontWeight: isSelected ? "bold" : "normal"
                                    }}>
                                      {status.toUpperCase()}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(appPath, content, 'utf8');
  console.log("Applied Fix 7");
} else {
  console.error("Target 7 not found");
}
