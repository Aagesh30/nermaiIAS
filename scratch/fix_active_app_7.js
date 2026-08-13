const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. question navigate map closing
const target1 = `                      <Text style={{ color: isActive || isAnswered ? "#ffffff" : "#212121", fontWeight: "bold", fontSize: 12 }}>
                        {qIdx + 1}
                      </Text>
                    </TouchableOpacity>
                  );
              </ScrollView>`;

const replacement1 = `                      <Text style={{ color: isActive || isAnswered ? "#ffffff" : "#212121", fontWeight: "bold", fontSize: 12 }}>
                        {qIdx + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>`;

// 2. question options map closing
const target2 = `                          <Text style={{ color: selected ? "#e0f2f1" : "#546e7a", fontSize: 13, marginTop: 2, fontStyle: "italic" }}>
                            {optTa}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
              </View>`;

const replacement2 = `                          <Text style={{ color: selected ? "#e0f2f1" : "#546e7a", fontSize: 13, marginTop: 2, fontStyle: "italic" }}>
                            {optTa}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>`;

// 3. review page options map closing
const target3 = `                          {isSelected && !isCorrectOption && (
                            <Ionicons name="close-circle" size={16} color="#c62828" />
                          )}
                        </View>
                      );
                  </View>`;

const replacement3 = `                          {isSelected && !isCorrectOption && (
                            <Ionicons name="close-circle" size={16} color="#c62828" />
                          )}
                        </View>
                      );
                    })}
                  </View>`;

// 4. dashboard admin/student ternary closing
const target4 = `                      <TouchableOpacity onPress={submitLmsQuiz} style={[styles.primaryBtn, { marginTop: 15 }]}>
                        <Text style={styles.primaryBtnTxt}>Submit Quiz</Text>
                      </TouchableOpacity>
                    </View>
                  )}
              {/* Notifications Center for Users */}`;

const replacement4 = `                      <TouchableOpacity onPress={submitLmsQuiz} style={[styles.primaryBtn, { marginTop: 15 }]}>
                        <Text style={styles.primaryBtnTxt}>Submit Quiz</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
              {/* Notifications Center for Users */}`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
