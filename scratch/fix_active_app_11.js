const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

const target = `                      <TouchableOpacity onPress={() => { changeErpSub("marks"); if (tests.length > 0) { setSelectedErpTestId(tests[0].id); loadErpTestResults(tests[0].id); } }} style={[styles.sidebarTab, erpSub === "marks" && styles.sidebarTabActive]}>
                        <Ionicons name="checkbox-outline" size={20} color={erpSub === "marks" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "marks" && styles.sidebarTabTxtActive]}>Marks</Text>
                      </TouchableOpacity>
                  {/* STUDENT-ONLY TABS */}
                  {user.role === "student" && (
                    <>`;

const replacement = `                      <TouchableOpacity onPress={() => { changeErpSub("marks"); if (tests.length > 0) { setSelectedErpTestId(tests[0].id); loadErpTestResults(tests[0].id); } }} style={[styles.sidebarTab, erpSub === "marks" && styles.sidebarTabActive]}>
                        <Ionicons name="checkbox-outline" size={20} color={erpSub === "marks" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "marks" && styles.sidebarTabTxtActive]}>Marks</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* STUDENT-ONLY TABS */}
                  {user.role === "student" && (
                    <>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(appPath, content, 'utf8');
  console.log("Applied Fix");
} else {
  console.error("Target not found");
}
