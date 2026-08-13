const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. newPdfTest title onChangeText closing
const target1 = `                  <TextInput
                    style={[styles.input, darkMode && styles.inputDark]}
                    placeholder="e.g. UPSC Prelims Mock 2026"
                    placeholderTextColor="#999"
                    value={newPdfTest.title}
                    onChangeText={v => setNewPdfTest({ ...newPdfTest, title: v
                  />`;

const replacement1 = `                  <TextInput
                    style={[styles.input, darkMode && styles.inputDark]}
                    placeholder="e.g. UPSC Prelims Mock 2026"
                    placeholderTextColor="#999"
                    value={newPdfTest.title}
                    onChangeText={v => setNewPdfTest({ ...newPdfTest, title: v })}
                  />`;

// 2 & 3. editingQData questionEn/questionTa onChangeText closing
const target2 = `                        <Text style={[styles.label, darkMode && styles.labelDark]}>English Question Text:</Text>
                        <TextInput
                          style={[styles.input, darkMode && styles.inputDark, { height: 60 }]}
                          multiline
                          value={editingQData.questionEn}
                          onChangeText={text => setEditingQData({ ...editingQData, questionEn: text
                        />

                        <Text style={[styles.label, darkMode && styles.labelDark]}>Tamil Question Text:</Text>
                        <TextInput
                          style={[styles.input, darkMode && styles.inputDark, { height: 60 }]}
                          multiline
                          value={editingQData.questionTa}
                          onChangeText={text => setEditingQData({ ...editingQData, questionTa: text
                        />`;

const replacement2 = `                        <Text style={[styles.label, darkMode && styles.labelDark]}>English Question Text:</Text>
                        <TextInput
                          style={[styles.input, darkMode && styles.inputDark, { height: 60 }]}
                          multiline
                          value={editingQData.questionEn}
                          onChangeText={text => setEditingQData({ ...editingQData, questionEn: text })}
                        />

                        <Text style={[styles.label, darkMode && styles.labelDark]}>Tamil Question Text:</Text>
                        <TextInput
                          style={[styles.input, darkMode && styles.inputDark, { height: 60 }]}
                          multiline
                          value={editingQData.questionTa}
                          onChangeText={text => setEditingQData({ ...editingQData, questionTa: text })}
                        />`;

// 4. editingQData correctAnswer onPress closing
const target4 = `                        <Text style={[styles.label, darkMode && styles.labelDark]}>Correct Answer:</Text>
                        <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
                          {["A", "B", "C", "D"].map(opt => (
                            <TouchableOpacity
                              key={opt}
                              onPress={() => setEditingQData({ ...editingQData, correctAnswer: opt
                              style={[
                                styles.roleBtn,
                                editingQData.correctAnswer === opt && { backgroundColor: "#2e7d32", borderColor: "#2e7d32" }
                              ]}
                            >`;

const replacement4 = `                        <Text style={[styles.label, darkMode && styles.labelDark]}>Correct Answer:</Text>
                        <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
                          {["A", "B", "C", "D"].map(opt => (
                            <TouchableOpacity
                              key={opt}
                              onPress={() => setEditingQData({ ...editingQData, correctAnswer: opt })}
                              style={[
                                styles.roleBtn,
                                editingQData.correctAnswer === opt && { backgroundColor: "#2e7d32", borderColor: "#2e7d32" }
                              ]}
                            >`;

// 5. extractedQuestions options map closing
const target5 = `                                    {hasTa && <Text style={{ fontSize: 10, color: darkMode ? "#aaa" : "#666", fontStyle: "italic" }}>{optionData.ta}</Text>}
                                  </View>
                                  {isCorrect(opt) && <Ionicons name="checkmark-circle" size={14} color="#2e7d32" style={{ marginLeft: 4 }} />}
                                </View>
                              );
                            </View>`;

const replacement5 = `                                    {hasTa && <Text style={{ fontSize: 10, color: darkMode ? "#aaa" : "#666", fontStyle: "italic" }}>{optionData.ta}</Text>}
                                  </View>
                                  {isCorrect(opt) && <Ionicons name="checkmark-circle" size={14} color="#2e7d32" style={{ marginLeft: 4 }} />}
                                </View>
                              );
                            })}
                          </View>`;

// 6. extractedQuestions list map closing
const target6 = `                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>
                        );
                    </ScrollView>`;

const replacement6 = `                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }
if (content.includes(target5)) { content = content.replace(target5, replacement5); console.log("Applied Fix 5"); count++; } else { console.error("Target 5 not found"); }
if (content.includes(target6)) { content = content.replace(target6, replacement6); console.log("Applied Fix 6"); count++; } else { console.error("Target 6 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
