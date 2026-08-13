const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. Guest ScrollView closing orphan ) }
const target1 = `              <View style={styles.card}>
                <Text style={{ fontWeight: "bold", fontSize: 13, color: "#1a237e", marginBottom: 8 }}>Already a registered student?</Text>
                <TouchableOpacity
                  onPress={async () => {
                    await guestStorage.disableAutoLogin();
                    setUser(null);
                  }}
                  style={[styles.outlineBtn]}
                >
                  <Text style={styles.outlineBtnTxt}>Go to Login Page</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        
</ScrollView>
        )}
      </SafeAreaView>`;

const replacement1 = `              <View style={styles.card}>
                <Text style={{ fontWeight: "bold", fontSize: 13, color: "#1a237e", marginBottom: 8 }}>Already a registered student?</Text>
                <TouchableOpacity
                  onPress={async () => {
                    await guestStorage.disableAutoLogin();
                    setUser(null);
                  }}
                  style={[styles.outlineBtn]}
                >
                  <Text style={styles.outlineBtnTxt}>Go to Login Page</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>`;

// 2 & 3. Quiz answers onPress and options.map closing
const target2 = `                             {quizItem.options.map((opt: string, oIdx: number) => {
                               const selected = quizAnswers[qIdx] === oIdx;
                               return (
                                 <TouchableOpacity
                                   key={oIdx}
                                   onPress={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx
                                   style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                                 >
                                   <Text style={{ color: selected ? "#ffffff" : "#212121", fontWeight: selected ? "bold" : "normal" }}>{opt}</Text>
                                 </TouchableOpacity>
                               );
                           </View>`;

const replacement2 = `                             {quizItem.options.map((opt: string, oIdx: number) => {
                               const selected = quizAnswers[qIdx] === oIdx;
                               return (
                                 <TouchableOpacity
                                   key={oIdx}
                                   onPress={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                                   style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                                 >
                                   <Text style={{ color: selected ? "#ffffff" : "#212121", fontWeight: selected ? "bold" : "normal" }}>{opt}</Text>
                                 </TouchableOpacity>
                               );
                             })}
                           </View>`;

// 4. available exams admin check closing
const target4 = `                 {(user.role === "admin" || user.role === "staff") && (
                  <>
                    <TouchableOpacity onPress={() => setTestSub("pdf-create")} style={[styles.rectTab, testSub === "pdf-create" && styles.rectTabActive]}>
                      <Text style={[styles.rectTabTxt, testSub === "pdf-create" && styles.rectTabTxtActive]}>AI Create</Text>
                    </TouchableOpacity>
                <TouchableOpacity onPress={() => setTestSub("results")} style={[styles.rectTab, testSub === "results" && styles.rectTabActive]}>`;

const replacement4 = `                 {(user.role === "admin" || user.role === "staff") && (
                  <>
                    <TouchableOpacity onPress={() => setTestSub("pdf-create")} style={[styles.rectTab, testSub === "pdf-create" && styles.rectTabActive]}>
                      <Text style={[styles.rectTabTxt, testSub === "pdf-create" && styles.rectTabTxtActive]}>AI Create</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={() => setTestSub("results")} style={[styles.rectTab, testSub === "results" && styles.rectTabActive]}>`;

// 5. Platform.OS === "web" closing in PDF creation
const target5 = `                        }}
                      />
                  {genMode === "file" ? (`;

const replacement5 = `                        }}
                      />
                    </>
                  )}
                  {genMode === "file" ? (`;

// 6 & 7. newPdfTest schedule fields onChange closing
const target6 = `                    <DateTimePickerSelect
                      label="Start Date & Time:"
                      value={newPdfTest.startTime}
                      onChange={t => setNewPdfTest({ ...newPdfTest, startTime: t
                      darkMode={darkMode}
                    />
                    <DateTimePickerSelect
                      label="End Date & Time:"
                      value={newPdfTest.endTime}
                      onChange={t => setNewPdfTest({ ...newPdfTest, endTime: t
                      darkMode={darkMode}
                    />`;

const replacement6 = `                    <DateTimePickerSelect
                      label="Start Date & Time:"
                      value={newPdfTest.startTime}
                      onChange={t => setNewPdfTest({ ...newPdfTest, startTime: t })}
                      darkMode={darkMode}
                    />
                    <DateTimePickerSelect
                      label="End Date & Time:"
                      value={newPdfTest.endTime}
                      onChange={t => setNewPdfTest({ ...newPdfTest, endTime: t })}
                      darkMode={darkMode}
                    />`;

// 8. newPdfTest targetAudience onPress closing
const target8 = `                      ].map((aud) => (
                        <TouchableOpacity
                          key={aud.value}
                          onPress={() => setNewPdfTest({ ...newPdfTest, targetAudience: aud.value
                          style={{`;

const replacement8 = `                      ].map((aud) => (
                        <TouchableOpacity
                          key={aud.value}
                          onPress={() => setNewPdfTest({ ...newPdfTest, targetAudience: aud.value })}
                          style={{`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }
if (content.includes(target5)) { content = content.replace(target5, replacement5); console.log("Applied Fix 5"); count++; } else { console.error("Target 5 not found"); }
if (content.includes(target6)) { content = content.replace(target6, replacement6); console.log("Applied Fix 6"); count++; } else { console.error("Target 6 not found"); }
if (content.includes(target8)) { content = content.replace(target8, replacement8); console.log("Applied Fix 8"); count++; } else { console.error("Target 8 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
