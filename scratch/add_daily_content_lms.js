const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');

// 1. Add Daily Content tab in LMS menu
const targetMenu = `                <TouchableOpacity onPress={() => changeLmsSub("quiz")} style={[styles.sidebarTab, (lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") && styles.sidebarTabActive, (lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="help-circle-outline" size={22} color={(lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, (lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Quiz</Text>
                </TouchableOpacity>`;

const replacementMenu = `                <TouchableOpacity onPress={() => changeLmsSub("quiz")} style={[styles.sidebarTab, (lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") && styles.sidebarTabActive, (lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="help-circle-outline" size={22} color={(lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, (lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Quiz</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeLmsSub("daily-content")} style={[styles.sidebarTab, lmsSub === "daily-content" && styles.sidebarTabActive, lmsSub === "daily-content" && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="calendar-outline" size={22} color={lmsSub === "daily-content" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, lmsSub === "daily-content" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Daily Content</Text>
                </TouchableOpacity>`;

// 2. Add Daily Content section view
const targetSection = `              {/* Recorded Classes (Coming Soon) */}
              {lmsSub === "recorded" && (
                <View style={[styles.card, darkMode && styles.cardDark, { alignItems: "center", paddingVertical: 50 }]}>
                  <Ionicons name="play-circle-outline" size={52} color={darkMode ? "#444" : "#e0e0e0"} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: darkMode ? "#555" : "#9e9e9e", marginTop: 16 }}>Recorded Classes</Text>
                  <Text style={{ fontSize: 13, color: darkMode ? "#444" : "#bdbdbd", marginTop: 8, textAlign: "center" }}>Watch past class recordings at your own pace.</Text>
                  <View style={{ marginTop: 20, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: darkMode ? "#1e1e1e" : "#f5f5f5" }}>
                    <Text style={{ fontSize: 11, color: darkMode ? "#555" : "#bdbdbd", fontWeight: "700", letterSpacing: 1 }}>COMING SOON</Text>
                  </View>
                </View>
              )}`;

const replacementSection = `              {/* Recorded Classes (Coming Soon) */}
              {lmsSub === "recorded" && (
                <View style={[styles.card, darkMode && styles.cardDark, { alignItems: "center", paddingVertical: 50 }]}>
                  <Ionicons name="play-circle-outline" size={52} color={darkMode ? "#444" : "#e0e0e0"} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: darkMode ? "#555" : "#9e9e9e", marginTop: 16 }}>Recorded Classes</Text>
                  <Text style={{ fontSize: 13, color: darkMode ? "#444" : "#bdbdbd", marginTop: 8, textAlign: "center" }}>Watch past class recordings at your own pace.</Text>
                  <View style={{ marginTop: 20, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: darkMode ? "#1e1e1e" : "#f5f5f5" }}>
                    <Text style={{ fontSize: 11, color: darkMode ? "#555" : "#bdbdbd", fontWeight: "700", letterSpacing: 1 }}>COMING SOON</Text>
                  </View>
                </View>
              )}

              {/* Daily Content Section (Blank) */}
              {lmsSub === "daily-content" && (
                <View style={[styles.card, darkMode && styles.cardDark, { alignItems: "center", paddingVertical: 50 }]}>
                  <Ionicons name="calendar-outline" size={52} color={darkMode ? "#444" : "#e0e0e0"} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: darkMode ? "#555" : "#9e9e9e", marginTop: 16 }}>Daily Content</Text>
                  <Text style={{ fontSize: 13, color: darkMode ? "#444" : "#bdbdbd", marginTop: 8, textAlign: "center" }}>Daily study materials and updates will appear here.</Text>
                </View>
              )}`;

let count = 0;
if (content.includes(targetMenu)) {
  content = content.replace(targetMenu, replacementMenu);
  console.log("Applied LMS Daily Content menu tab");
  count++;
} else {
  console.error("targetMenu not found");
}

if (content.includes(targetSection)) {
  content = content.replace(targetSection, replacementSection);
  console.log("Applied LMS Daily Content section block");
  count++;
} else {
  console.error("targetSection not found");
}

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Updated ${count} places in App.tsx`);
}
