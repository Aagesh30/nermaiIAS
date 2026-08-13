const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

const target = `                            <Text style={[styles.sidebarTabTxt, erpSub === "approvals" && styles.sidebarTabTxtActive]}>
                              Delete Approvals
                              {pendingApprovals.length > 0 && (
                                <Text style={{ color: "#c62828", fontWeight: "bold" }}> ({pendingApprovals.length})</Text>
                              )}
                            </Text>
                          </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeErpSub("id-card")} style={[styles.sidebarTab, erpSub === "id-card" && styles.sidebarTabActive]}>`;

const replacement = `                            <Text style={[styles.sidebarTabTxt, erpSub === "approvals" && styles.sidebarTabTxtActive]}>
                              Delete Approvals
                              {pendingApprovals.length > 0 && (
                                <Text style={{ color: "#c62828", fontWeight: "bold" }}> ({pendingApprovals.length})</Text>
                              )}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={() => changeErpSub("id-card")} style={[styles.sidebarTab, erpSub === "id-card" && styles.sidebarTabActive]}>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(appPath, content, 'utf8');
  console.log("Applied Fix");
} else {
  console.error("Target not found");
}
