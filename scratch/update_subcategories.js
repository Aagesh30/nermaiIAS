const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'web_portal', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to \n
content = content.replace(/\r\n/g, '\n');

// Revert feature category to LMS and add subCategory
const featureMappings = [
  { key: "lms_sacs_access", label: "LMS — Access Control (SACS)", icon: "shield-checkmark-outline", category: "LMS", subCategory: "ACCESS CONTROL" },
  { key: "lms_live_classes", label: "LMS — Live & Scheduled Classes", icon: "videocam-outline", category: "LMS", subCategory: "LEARNING" },
  { key: "lms_daily_content", label: "LMS — Daily IAS Study Content", icon: "calendar-outline", category: "LMS", subCategory: "LEARNING" },
  { key: "lms_quiz_posting", label: "LMS — Publish Daily Quiz Question", icon: "help-circle-outline", category: "LMS", subCategory: "LEARNING" },
  { key: "lms_recorded_videos", label: "LMS — Recorded Video Library", icon: "play-circle-outline", category: "LMS", subCategory: "LEARNING" },
  { key: "lms_resources", label: "LMS — resources", icon: "folder-open-outline", category: "LMS", subCategory: "MATERIALS" },
  { key: "lms_courses", label: "LMS — Courses", icon: "school-outline", category: "LMS", subCategory: "LMS MANAGEMENT" },
  { key: "lms_subjects", label: "LMS — Subjects", icon: "library-outline", category: "LMS", subCategory: "LMS MANAGEMENT" },
  { key: "lms_topics", label: "LMS — Topics", icon: "list-outline", category: "LMS", subCategory: "LMS MANAGEMENT" },
  { key: "lms_subtopics", label: "LMS — Subtopics", icon: "git-commit-outline", category: "LMS", subCategory: "LMS MANAGEMENT" },
  { key: "lms_classes", label: "LMS — Classes", icon: "play-outline", category: "LMS", subCategory: "LMS MANAGEMENT" },
  { key: "lms_teachers", label: "LMS — Teachers", icon: "people-outline", category: "LMS", subCategory: "LMS MANAGEMENT" },
  { key: "lms_syllabus", label: "LMS — Syllabus Tracker", icon: "checkbox-outline", category: "LMS", subCategory: "LMS MANAGEMENT" },
  { key: "lms_resource_mgmt", label: "LMS — Resource Management", icon: "documents-outline", category: "LMS", subCategory: "MATERIALS" },
  { key: "lms_video_library", label: "LMS — Video Library", icon: "film-outline", category: "LMS", subCategory: "LEARNING" },
  { key: "lms_live_sessions", label: "LMS — Live Sessions", icon: "videocam-outline", category: "LMS", subCategory: "LEARNING" },
  { key: "lms_provider_mgmt", label: "LMS — Provider Credential Management", icon: "cloud-outline", category: "LMS", subCategory: "LMS MANAGEMENT" },
  { key: "lms_zoom_accounts", label: "LMS — Zoom SDK Accounts", icon: "videocam-outline", category: "LMS", subCategory: "LMS MANAGEMENT" },
  { key: "lms_chatbot_cms", label: "LMS — Knowledge Studio & Assistant CMS", icon: "chatbubbles-outline", category: "LMS", subCategory: "AI STUDIO" }
];

for (const f of featureMappings) {
  const regex = new RegExp(`\\{\\s*key:\\s*"${f.key}"\\s*,\\s*label:\\s*"[^"]+"\\s*,\\s*icon:\\s*"[^"]+"\\s*,\\s*category:\\s*"[^"]+"\\s*\\}`, 'g');
  content = content.replace(regex, `{ key: "${f.key}", label: "${f.label}", icon: "${f.icon}", category: "${f.category}", subCategory: "${f.subCategory}" }`);
}
console.log('Finished updating feature categories in array.');

// Revert dropdown list if needed
const targetDropdown = '["All", "ERP", "ACCESS CONTROL", "LEARNING", "MATERIALS", "LMS MANAGEMENT", "AI STUDIO", "CRM", "Test Portal", "System"]';
const replacementDropdown = '["All", "ERP", "LMS", "CRM", "Test Portal", "System"]';
content = content.split(targetDropdown).join(replacementDropdown);

// Replace Map 1 Start
const map1StartTarget = `                                    {ALL_SYSTEM_FEATURES.filter(f => selectedPermissionCategory === "All" || f.category === selectedPermissionCategory).map(f => {
                                      const rawVal = currentRolePermissions[f.key];
                                      const activeVal = rawVal === "none" ? "none" : rawVal === "view" || rawVal === "CRU only" || rawVal === "CR only" || rawVal === "U only" ? "view" : rawVal === "edit_direct" || rawVal === "CRUD" ? "edit_direct" : "edit_on_approval";
                                      return (
                                        <View key={f.key} style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#eeeeee" }}>`;

const map1StartReplacement = `                                    {(() => {
                                      let lastSubCategory = "";
                                      return ALL_SYSTEM_FEATURES.filter(f => selectedPermissionCategory === "All" || f.category === selectedPermissionCategory).map(f => {
                                        const rawVal = currentRolePermissions[f.key];
                                        const activeVal = rawVal === "none" ? "none" : rawVal === "view" || rawVal === "CRU only" || rawVal === "CR only" || rawVal === "U only" ? "view" : rawVal === "edit_direct" || rawVal === "CRUD" ? "edit_direct" : "edit_on_approval";
                                        const showHeader = f.category === "LMS" && f.subCategory && f.subCategory !== lastSubCategory;
                                        if (showHeader) {
                                          lastSubCategory = f.subCategory;
                                        }
                                        return (
                                          <View key={f.key}>
                                            {showHeader && (
                                              <View style={{ backgroundColor: "#ffebee", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginTop: 10, marginBottom: 10 }}>
                                                <Text style={{ fontSize: 11, fontWeight: "bold", color: "#c62828" }}>{f.subCategory}</Text>
                                              </View>
                                            )}
                                            <View style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#eeeeee" }}>`;

if (content.includes(map1StartTarget)) {
  content = content.replace(map1StartTarget, map1StartReplacement);
  console.log('Successfully replaced map 1 start');
} else {
  console.log('map 1 start not found');
}

// Replace Map 2 Start
const map2StartTarget = `                              {ALL_SYSTEM_FEATURES.filter(f => selectedPermissionCategory === "All" || f.category === selectedPermissionCategory).map(f => {
                                const rawVal = currentRolePermissions[f.key];
                                const activeVal = rawVal === "none" ? "none" : rawVal === "view" || rawVal === "CRU only" || rawVal === "CR only" || rawVal === "U only" ? "view" : rawVal === "edit_direct" || rawVal === "CRUD" ? "edit_direct" : "edit_on_approval";
                                return (
                                  <View key={f.key} style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#eeeeee" }}>`;

const map2StartReplacement = `                              {(() => {
                                let lastSubCategory = "";
                                return ALL_SYSTEM_FEATURES.filter(f => selectedPermissionCategory === "All" || f.category === selectedPermissionCategory).map(f => {
                                  const rawVal = currentRolePermissions[f.key];
                                  const activeVal = rawVal === "none" ? "none" : rawVal === "view" || rawVal === "CRU only" || rawVal === "CR only" || rawVal === "U only" ? "view" : rawVal === "edit_direct" || rawVal === "CRUD" ? "edit_direct" : "edit_on_approval";
                                  const showHeader = f.category === "LMS" && f.subCategory && f.subCategory !== lastSubCategory;
                                  if (showHeader) {
                                    lastSubCategory = f.subCategory;
                                  }
                                  return (
                                    <View key={f.key}>
                                      {showHeader && (
                                        <View style={{ backgroundColor: "#ffebee", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginTop: 10, marginBottom: 10 }}>
                                          <Text style={{ fontSize: 11, fontWeight: "bold", color: "#c62828" }}>{f.subCategory}</Text>
                                        </View>
                                      )}
                                      <View style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#eeeeee" }}>`;

if (content.includes(map2StartTarget)) {
  content = content.replace(map2StartTarget, map2StartReplacement);
  console.log('Successfully replaced map 2 start');
} else {
  console.log('map 2 start not found');
}

// Replace Map 1 End
const map1EndTarget = `                                          </View>
                                        </View>
                                      );
                                    })}
                                  </View>
                                </ScrollView>
                              </View>
                            </View>`;

const map1EndReplacement = `                                          </View>
                                        </View>
                                      </View>
                                    );
                                  });
                                })()}
                                  </View>
                                </ScrollView>
                              </View>
                            </View>`;

if (content.includes(map1EndTarget)) {
  content = content.replace(map1EndTarget, map1EndReplacement);
  console.log('Successfully replaced map 1 end');
} else {
  console.log('map 1 end not found');
}

// Replace Map 2 End
const map2EndTarget = `                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          </ScrollView>
                        </View>`;

const map2EndReplacement = `                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  </View>
                                </View>
                              );
                            });
                          })()}
                            </View>
                          </ScrollView>
                        </View>`;

if (content.includes(map2EndTarget)) {
  content = content.replace(map2EndTarget, map2EndReplacement);
  console.log('Successfully replaced map 2 end');
} else {
  console.log('map 2 end not found');
}

// Restore to CRLF since it is a Windows codebase
content = content.replace(/\n/g, '\r\n');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Script finish');
