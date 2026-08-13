const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// Editing student form
const target1 = `                                {editingStudent.course !== "" && editingStudent.course !== undefined && (
                                  <View style={{ backgroundColor: "#e8f5e9", padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                    <Text style={{ color: "#2e7d32", fontSize: 12 }}>✅ Course auto-selected: <Text style={{ fontWeight: "bold" }}>{editingStudent.course}</Text></Text>
                                  </View>
                                )}
                            {/* Enrollment Type */}
                            <Text style={{ fontWeight: "bold", color: "#0288d1", marginBottom: 6, marginTop: 6, fontSize: 13 }}>🎓 Enrollment Type</Text>`;

const replacement1 = `                                {editingStudent.course !== "" && editingStudent.course !== undefined && (
                                  <View style={{ backgroundColor: "#e8f5e9", padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                    <Text style={{ color: "#2e7d32", fontSize: 12 }}>✅ Course auto-selected: <Text style={{ fontWeight: "bold" }}>{editingStudent.course}</Text></Text>
                                  </View>
                                )}
                              </>
                            )}
                            {/* Enrollment Type */}
                            <Text style={{ fontWeight: "bold", color: "#0288d1", marginBottom: 6, marginTop: 6, fontSize: 13 }}>🎓 Enrollment Type</Text>`;

// New student form
const target2 = `                                {newStudent.course !== "" && (
                                  <View style={{ backgroundColor: "#e8f5e9", padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                    <Text style={{ color: "#2e7d32", fontSize: 12 }}>✅ Course auto-selected: <Text style={{ fontWeight: "bold" }}>{newStudent.course}</Text></Text>
                                  </View>
                                )}
                            {/* Enrollment Type */}
                            <Text style={{ fontWeight: "bold", color: "#c62828", marginBottom: 6, marginTop: 6, fontSize: 13 }}>🎓 Enrollment Type</Text>`;

const replacement2 = `                                {newStudent.course !== "" && (
                                  <View style={{ backgroundColor: "#e8f5e9", padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                    <Text style={{ color: "#2e7d32", fontSize: 12 }}>✅ Course auto-selected: <Text style={{ fontWeight: "bold" }}>{newStudent.course}</Text></Text>
                                  </View>
                                )}
                              </>
                            )}
                            {/* Enrollment Type */}
                            <Text style={{ fontWeight: "bold", color: "#c62828", marginBottom: 6, marginTop: 6, fontSize: 13 }}>🎓 Enrollment Type</Text>`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
