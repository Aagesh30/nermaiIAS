const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. Roles list map closing block
const target1 = `                        <Text style={{ color: isSelected ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#e0e0e0" : "#212121"), fontWeight: "bold", fontSize: 12 }}>{r.label}</Text>
                      </TouchableOpacity>
                    );
                </View>`;

const replacement1 = `                        <Text style={{ color: isSelected ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#e0e0e0" : "#212121"), fontWeight: "bold", fontSize: 12 }}>{r.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>`;

// 2. Features list map and permissions options map closing blocks
const target2 = `                                  <Text style={{ fontSize: 12, color: isSelected ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#e0e0e0" : "#212121"), fontWeight: isSelected ? "bold" : "normal" }}>
                                    {opt.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                          </View>
                        </View>
                      );
                  </View>`;

const replacement2 = `                                  <Text style={{ fontSize: 12, color: isSelected ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#e0e0e0" : "#212121"), fontWeight: isSelected ? "bold" : "normal" }}>
                                    {opt.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>`;

// 3. targetAudience onPress parenthesis closing
const target3 = `                          key={aud.value}
                          onPress={() => setNewTest({ ...newTest, targetAudience: aud.value
                          style={{`;

const replacement3 = `                          key={aud.value}
                          onPress={() => setNewTest({ ...newTest, targetAudience: aud.value })}
                          style={{`;

// 4. newTest.startTime onChange closing
const target4 = `                      label="Scheduled Start Time (Mandatory):"
                      value={newTest.startTime}
                      onChange={t => setNewTest({ ...newTest, startTime: t
                      darkMode={darkMode}`;

const replacement4 = `                      label="Scheduled Start Time (Mandatory):"
                      value={newTest.startTime}
                      onChange={t => setNewTest({ ...newTest, startTime: t })}
                      darkMode={darkMode}`;

// 5. newTest.endTime onChange closing
const target5 = `                      label="Scheduled End Time (Mandatory):"
                      value={newTest.endTime}
                      onChange={t => setNewTest({ ...newTest, endTime: t
                      darkMode={darkMode}`;

const replacement5 = `                      label="Scheduled End Time (Mandatory):"
                      value={newTest.endTime}
                      onChange={t => setNewTest({ ...newTest, endTime: t })}
                      darkMode={darkMode}`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }
if (content.includes(target5)) { content = content.replace(target5, replacement5); console.log("Applied Fix 5"); count++; } else { console.error("Target 5 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
