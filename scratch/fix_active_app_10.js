const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1 & 2. ERP Sidebar admin tabs closing and student tabs opening
const target1 = `                      <TouchableOpacity onPress={() => changeErpSub("marks")} style={[styles.sidebarTab, erpSub === "marks" && styles.sidebarTabActive]}>
                        <Ionicons name="checkbox-outline" size={20} color={erpSub === "marks" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "marks" && styles.sidebarTabTxtActive]}>Marks</Text>
                      </TouchableOpacity>
                      {/* STUDENT-ONLY TABS */}
                      {user.role === "student" && (
                      <TouchableOpacity onPress={() => { changeErpSub("my-profile"); const myStudent = getLoggedInStudent(user, students); if (myStudent) loadMyProfileRequest(myStudent.id); }} style={[styles.sidebarTab, erpSub === "my-profile" && styles.sidebarTabActive]}>`;

const replacement1 = `                      <TouchableOpacity onPress={() => changeErpSub("marks")} style={[styles.sidebarTab, erpSub === "marks" && styles.sidebarTabActive]}>
                        <Ionicons name="checkbox-outline" size={20} color={erpSub === "marks" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "marks" && styles.sidebarTabTxtActive]}>Marks</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* STUDENT-ONLY TABS */}
                  {user.role === "student" && (
                    <>
                      <TouchableOpacity onPress={() => { changeErpSub("my-profile"); const myStudent = getLoggedInStudent(user, students); if (myStudent) loadMyProfileRequest(myStudent.id); }} style={[styles.sidebarTab, erpSub === "my-profile" && styles.sidebarTabActive]}>`;

// 3. ERP Sidebar student tabs closing
const target3 = `                      <TouchableOpacity onPress={() => changeErpSub("id-card")} style={[styles.sidebarTab, erpSub === "id-card" && styles.sidebarTabActive]}>
                        <Ionicons name="card-outline" size={20} color={erpSub === "id-card" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "id-card" && styles.sidebarTabTxtActive]}>My ID & Hall Ticket</Text>
                      </TouchableOpacity>
                </ScrollView>`;

const replacement3 = `                      <TouchableOpacity onPress={() => changeErpSub("id-card")} style={[styles.sidebarTab, erpSub === "id-card" && styles.sidebarTabActive]}>
                        <Ionicons name="card-outline" size={20} color={erpSub === "id-card" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "id-card" && styles.sidebarTabTxtActive]}>My ID & Hall Ticket</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>`;

// 4. Editing student batch selection
const target4 = `                                  {batches.map(b => (
                                    <TouchableOpacity
                                      key={b.id}
                                      onPress={() => setEditingStudent({ ...editingStudent, batch: b.batchName, course: b.course
                                      style={{ flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: editingStudent.batch === b.batchName ? "#e3f2fd" : "transparent", borderBottomWidth: 1, borderColor: "#f0f0f0" }}
                                    >`;

const replacement4 = `                                  {batches.map(b => (
                                    <TouchableOpacity
                                      key={b.id}
                                      onPress={() => setEditingStudent({ ...editingStudent, batch: b.batchName, course: b.course })}
                                      style={{ flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: editingStudent.batch === b.batchName ? "#e3f2fd" : "transparent", borderBottomWidth: 1, borderColor: "#f0f0f0" }}
                                    >`;

// 5. Editing student enrollment type
const target5 = `                              {["offline", "online"].map(t => (
                                <TouchableOpacity
                                  key={t}
                                  onPress={() => setEditingStudent({ ...editingStudent, type: t
                                  style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: editingStudent.type === t ? "#0288d1" : "#e0e0e0", backgroundColor: editingStudent.type === t ? "#e3f2fd" : "#f9f9f9", alignItems: "center" }}
                                >`;

const replacement5 = `                              {["offline", "online"].map(t => (
                                <TouchableOpacity
                                  key={t}
                                  onPress={() => setEditingStudent({ ...editingStudent, type: t })}
                                  style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: editingStudent.type === t ? "#0288d1" : "#e0e0e0", backgroundColor: editingStudent.type === t ? "#e3f2fd" : "#f9f9f9", alignItems: "center" }}
                                >`;

// 6. New student batch selection
const target6 = `                                  {batches.map(b => (
                                    <TouchableOpacity
                                      key={b.id}
                                      onPress={() => setNewStudent({ ...newStudent, batch: b.batchName, course: b.course
                                      style={{ flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: newStudent.batch === b.batchName ? "#e3f2fd" : "transparent", borderBottomWidth: 1, borderColor: "#f0f0f0" }}
                                    >`;

const replacement6 = `                                  {batches.map(b => (
                                    <TouchableOpacity
                                      key={b.id}
                                      onPress={() => setNewStudent({ ...newStudent, batch: b.batchName, course: b.course })}
                                      style={{ flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: newStudent.batch === b.batchName ? "#e3f2fd" : "transparent", borderBottomWidth: 1, borderColor: "#f0f0f0" }}
                                    >`;

// 7. New student enrollment type
const target7 = `                              {["offline", "online"].map(t => (
                                <TouchableOpacity
                                  key={t}
                                  onPress={() => setNewStudent({ ...newStudent, type: t
                                  style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: newStudent.type === t ? "#c62828" : "#e0e0e0", backgroundColor: newStudent.type === t ? "#ffebee" : "#f9f9f9", alignItems: "center" }}
                                >`;

const replacement7 = `                              {["offline", "online"].map(t => (
                                <TouchableOpacity
                                  key={t}
                                  onPress={() => setNewStudent({ ...newStudent, type: t })}
                                  style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: newStudent.type === t ? "#c62828" : "#e0e0e0", backgroundColor: newStudent.type === t ? "#ffebee" : "#f9f9f9", alignItems: "center" }}
                                >`;

// 8. Student creation form closing
const target8 = `                            <TouchableOpacity onPress={createStudentRecord} style={[styles.primaryBtn, { marginTop: 10 }]}>
                              <Text style={styles.primaryBtnTxt}>✅ Create Student Account</Text>
                            </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.card}>`;

const replacement8 = `                            <TouchableOpacity onPress={createStudentRecord} style={[styles.primaryBtn, { marginTop: 10 }]}>
                              <Text style={styles.primaryBtnTxt}>✅ Create Student Account</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}

                    <View style={styles.card}>`;

// 9. Filter directory type map closing
const target9 = `                                    <Text style={{ fontSize: 11, color: isSelected ? "#c62828" : "#555", fontWeight: isSelected ? "bold" : "normal" }}>
                                      {t.toUpperCase()}
                                    </Text>
                                  </TouchableOpacity>
                                );
                            </View>`;

const replacement9 = `                                    <Text style={{ fontSize: 11, color: isSelected ? "#c62828" : "#555", fontWeight: isSelected ? "bold" : "normal" }}>
                                      {t.toUpperCase()}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1/2"); count++; } else { console.error("Target 1/2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }
if (content.includes(target5)) { content = content.replace(target5, replacement5); console.log("Applied Fix 5"); count++; } else { console.error("Target 5 not found"); }
if (content.includes(target6)) { content = content.replace(target6, replacement6); console.log("Applied Fix 6"); count++; } else { console.error("Target 6 not found"); }
if (content.includes(target7)) { content = content.replace(target7, replacement7); console.log("Applied Fix 7"); count++; } else { console.error("Target 7 not found"); }
if (content.includes(target8)) { content = content.replace(target8, replacement8); console.log("Applied Fix 8"); count++; } else { console.error("Target 8 not found"); }
if (content.includes(target9)) { content = content.replace(target9, replacement9); console.log("Applied Fix 9"); count++; } else { console.error("Target 9 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
