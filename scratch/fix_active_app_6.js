const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// Target 2: Quiz option mapping
const target2 = `                            {quizItem.options.map((opt: string, oIdx: number) => {
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

const replacement2 = `                            {quizItem.options.map((opt: string, oIdx: number) => {
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

// Target 4: Admin check closing
const target4 = `                {(user.role === "admin" || user.role === "staff") && (
                  <>
                    <TouchableOpacity onPress={() => setTestSub("pdf-create")} style={[styles.rectTab, testSub === "pdf-create" && styles.rectTabActive]}>
                      <Text style={[styles.rectTabTxt, testSub === "pdf-create" && styles.rectTabTxtActive]}>AI Create</Text>
                    </TouchableOpacity>
                <TouchableOpacity onPress={() => setTestSub("results")} style={[styles.rectTab, testSub === "results" && styles.rectTabActive]}>`;

const replacement4 = `                {(user.role === "admin" || user.role === "staff") && (
                  <>
                    <TouchableOpacity onPress={() => setTestSub("pdf-create")} style={[styles.rectTab, testSub === "pdf-create" && styles.rectTabActive]}>
                      <Text style={[styles.rectTabTxt, testSub === "pdf-create" && styles.rectTabTxtActive]}>AI Create</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={() => setTestSub("results")} style={[styles.rectTab, testSub === "results" && styles.rectTabActive]}>`;

let count = 0;
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
