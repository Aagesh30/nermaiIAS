const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. Subject metrics map closing
const target1 = `                                  <Text style={{ color: "#757575", fontSize: 11, textAlign: "right" }}>
                                    Average Score: {info.avg}% | {info.recommendation}
                                  </Text>
                                </View>
                              );
                          </View>`;

const replacement1 = `                                  <Text style={{ color: "#757575", fontSize: 11, textAlign: "right" }}>
                                    Average Score: {info.avg}% | {info.recommendation}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>`;

// 2. Courses map closing
const target2 = `                                    <View style={{ height: 6, backgroundColor: "#eeeeee", borderRadius: 3, overflow: "hidden" }}>
                                      <View style={{ width: \`\${pct}%\`, height: "100%", backgroundColor: "#c62828" }} />
                                    </View>
                                  </View>
                                );
                            </View>`;

const replacement2 = `                                    <View style={{ height: 6, backgroundColor: "#eeeeee", borderRadius: 3, overflow: "hidden" }}>
                                      <View style={{ width: \`\${pct}%\`, height: "100%", backgroundColor: "#c62828" }} />
                                    </View>
                                  </View>
                                );
                              })}
                            </View>`;

// 3. Tests map closing
const target3 = `                                <Text style={[styles.rectTabTxt, selected && styles.rectTabTxtActive]}>{t.title}</Text>
                              </TouchableOpacity>
                            );
                        </ScrollView>`;

const replacement3 = `                                <Text style={[styles.rectTabTxt, selected && styles.rectTabTxtActive]}>{t.title}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>`;

// 4. Display results map closing
const target4 = `                                  <Text style={{ color: isPass ? "#2e7d32" : "#c62828", fontWeight: "bold", fontSize: 12 }}>
                                    {isPass ? "PASS" : "FAIL"}
                                  </Text>
                                </View>
                              );
                          </View>`;

const replacement4 = `                                  <Text style={{ color: isPass ? "#2e7d32" : "#c62828", fontWeight: "bold", fontSize: 12 }}>
                                    {isPass ? "PASS" : "FAIL"}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
