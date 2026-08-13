const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. Notice Title input
const target1 = `                          value={editingNoticeId ? editingNotice.title : newNotice.title}
                          onChangeText={t => editingNoticeId ? setEditingNotice({ ...editingNotice, title: t }) : setNewNotice({ ...newNotice, title: t
                        />`;

const replacement1 = `                          value={editingNoticeId ? editingNotice.title : newNotice.title}
                          onChangeText={t => editingNoticeId ? setEditingNotice({ ...editingNotice, title: t }) : setNewNotice({ ...newNotice, title: t })}
                        />`;

// 2. Notice Content input
const target2 = `                          value={editingNoticeId ? editingNotice.content : newNotice.content}
                          onChangeText={c => editingNoticeId ? setEditingNotice({ ...editingNotice, content: c }) : setNewNotice({ ...newNotice, content: c
                        />`;

const replacement2 = `                          value={editingNoticeId ? editingNotice.content : newNotice.content}
                          onChangeText={c => editingNoticeId ? setEditingNotice({ ...editingNotice, content: c }) : setNewNotice({ ...newNotice, content: c })}
                        />`;

// 3. Notice Priority Touchable
const target3 = `                                onPress={() => editingNoticeId ? setEditingNotice({ ...editingNotice, priority: p }) : setNewNotice({ ...newNotice, priority: p
                                style={[styles.roleBtn, isSelected && styles.roleBtnActive]}`;

const replacement3 = `                                onPress={() => editingNoticeId ? setEditingNotice({ ...editingNotice, priority: p }) : setNewNotice({ ...newNotice, priority: p })}
                                style={[styles.roleBtn, isSelected && styles.roleBtnActive]}`;

// 4. Notice Priority map closing
const target4 = `                                <Text style={[styles.roleBtnTxt, isSelected && styles.roleBtnTxtActive]}>{p.toUpperCase()}</Text>
                              </TouchableOpacity>
                            );
                        </View>`;

const replacement4 = `                                <Text style={[styles.roleBtnTxt, isSelected && styles.roleBtnTxtActive]}>{p.toUpperCase()}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>`;

// 5. Target Dashboard map closing
const target5 = `                                        {grp.label}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                              </ScrollView>`;

const replacement5 = `                                        {grp.label}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>`;

// 6. Target Batch map closing
const target6 = `                                          {b.batchName}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                </ScrollView>`;

const replacement6 = `                                          {b.batchName}
                                        </Text>
                                      </TouchableOpacity>
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

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
