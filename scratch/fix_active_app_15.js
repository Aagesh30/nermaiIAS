const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. My Profile Rejected Status Banner closing
const target1 = `                        {myProfileRequest.status === "rejected" && (
                          <>
                            <Text style={{ color: "#c62828", fontWeight: "bold", marginBottom: 4 }}>❌ Profile rejected. Please resubmit.</Text>
                            {myProfileRequest.rejectionReason && <Text style={{ color: "#757575", fontSize: 12 }}>Reason: {myProfileRequest.rejectionReason}</Text>}
                      </View>`;

const replacement1 = `                        {myProfileRequest.status === "rejected" && (
                          <>
                            <Text style={{ color: "#c62828", fontWeight: "bold", marginBottom: 4 }}>❌ Profile rejected. Please resubmit.</Text>
                            {myProfileRequest.rejectionReason && <Text style={{ color: "#757575", fontSize: 12 }}>Reason: {myProfileRequest.rejectionReason}</Text>}
                          </>
                        )}
                      </View>`;

// 2. Edit staff role choice Touchable & Map closing
const target2 = `                                  <TouchableOpacity
                                    key={r.key}
                                    onPress={() => setEditingStaff({ ...editingStaff, role: r.key
                                    style={{
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 20,
                                      borderWidth: 2,
                                      borderColor: isSelected ? "#0288d1" : "#e0e0e0",
                                      backgroundColor: isSelected ? "#e1f5fe" : "#f9f9f9"
                                    }}
                                  >
                                    <Text style={{ color: isSelected ? "#0288d1" : "#757575", fontWeight: isSelected ? "bold" : "normal", fontSize: 12 }}>{r.label}</Text>
                                  </TouchableOpacity>
                                );
                            </View>`;

const replacement2 = `                                  <TouchableOpacity
                                    key={r.key}
                                    onPress={() => setEditingStaff({ ...editingStaff, role: r.key })}
                                    style={{
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 20,
                                      borderWidth: 2,
                                      borderColor: isSelected ? "#0288d1" : "#e0e0e0",
                                      backgroundColor: isSelected ? "#e1f5fe" : "#f9f9f9"
                                    }}
                                  >
                                    <Text style={{ color: isSelected ? "#0288d1" : "#757575", fontWeight: isSelected ? "bold" : "normal", fontSize: 12 }}>{r.label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>`;

// 3. New staff role choice Touchable & Map closing
const target3 = `                                  <TouchableOpacity
                                    key={r.key}
                                    onPress={() => setNewStaff({ ...newStaff, role: r.key
                                    style={{
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 20,
                                      borderWidth: 2,
                                      borderColor: isSelected ? "#c62828" : "#e0e0e0",
                                      backgroundColor: isSelected ? "#ffebee" : "#f9f9f9"
                                    }}
                                  >
                                    <Text style={{ color: isSelected ? "#c62828" : "#757575", fontWeight: isSelected ? "bold" : "normal", fontSize: 12 }}>{r.label}</Text>
                                  </TouchableOpacity>
                                );
                            </View>`;

const replacement3 = `                                  <TouchableOpacity
                                    key={r.key}
                                    onPress={() => setNewStaff({ ...newStaff, role: r.key })}
                                    style={{
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 20,
                                      borderWidth: 2,
                                      borderColor: isSelected ? "#c62828" : "#e0e0e0",
                                      backgroundColor: isSelected ? "#ffebee" : "#f9f9f9"
                                    }}
                                  >
                                    <Text style={{ color: isSelected ? "#c62828" : "#757575", fontWeight: isSelected ? "bold" : "normal", fontSize: 12 }}>{r.label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>`;

// 4. Staff form closing structure
const target4 = `                            <TouchableOpacity onPress={createStaffRecord} style={styles.primaryBtn}>
                              <Text style={styles.primaryBtnTxt}>Add Admin Record</Text>
                            </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.card}>`;

const replacement4 = `                            <TouchableOpacity onPress={createStaffRecord} style={styles.primaryBtn}>
                              <Text style={styles.primaryBtnTxt}>Add Admin Record</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}

                    <View style={styles.card}>`;

// 5. Roles map closing in Permissions tab
const target5 = `                              <Text style={{ color: isSelected ? "#c62828" : "#616161", fontWeight: "bold", fontSize: 12 }}>{r.label}</Text>
                            </TouchableOpacity>
                          );
                      </View>`;

const replacement5 = `                              <Text style={{ color: isSelected ? "#c62828" : "#616161", fontWeight: "bold", fontSize: 12 }}>{r.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>`;

// 6. Permission options and features maps closing
const target6 = `                                          <Text style={{ fontSize: 11, color: isSelected ? "#b71c1c" : "#616161", fontWeight: isSelected ? "bold" : "normal" }}>
                                            {opt.label}
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                  </View>
                                </View>
                              );
                          </View>`;

const replacement6 = `                                          <Text style={{ fontSize: 11, color: isSelected ? "#b71c1c" : "#616161", fontWeight: isSelected ? "bold" : "normal" }}>
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

// 7. Fee status filter map closing
const target7 = `                                      <Text style={{
                                        fontSize: 11,
                                        color: isSelected ? "#c62828" : "#555",
                                        fontWeight: isSelected ? "bold" : "normal"
                                      }}>
                                        {status.toUpperCase()}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                              </View>`;

const replacement7 = `                                      <Text style={{
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

// 8 & 9. Update fees onPress and sortedStudentsForFees map closing
const target8 = `                                        <TouchableOpacity
                                          onPress={() => setFeeEditStudent({ ...s
                                          style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#0288d1", borderRadius: 4 }}
                                        >
                                          <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "bold" }}>Update Fees</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  );
                            </ScrollView>`;

const replacement8 = `                                        <TouchableOpacity
                                          onPress={() => setFeeEditStudent({ ...s })}
                                          style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#0288d1", borderRadius: 4 }}
                                        >
                                          <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "bold" }}>Update Fees</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  );
                                })}
                            </ScrollView>`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }
if (content.includes(target5)) { content = content.replace(target5, replacement5); console.log("Applied Fix 5"); count++; } else { console.error("Target 5 not found"); }
if (content.includes(target6)) { content = content.replace(target6, replacement6); console.log("Applied Fix 6"); count++; } else { console.error("Target 6 not found"); }
if (content.includes(target7)) { content = content.replace(target7, replacement7); console.log("Applied Fix 7"); count++; } else { console.error("Target 7 not found"); }
if (content.includes(target8)) { content = content.replace(target8, replacement8); console.log("Applied Fix 8"); count++; } else { console.error("Target 8 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
