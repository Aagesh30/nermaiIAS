const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Target start of modal content
const s1 = `                          {/* Floating Container Modal for Photo ID Selection */}
                          {showDocModal && !!profileForm.photoIdBase64 && (
                            <Modal visible={true} transparent animationType="fade"onRequestClose={() => setShowDocModal(false)}>
                              <TouchableOpacity
                                activeOpacity={1}
                                style={{
                                  flex: 1,
                                  backgroundColor:"rgba(0, 0, 0, 0.7)",
                                  justifyContent:"center",
                                  alignItems:"center",
                                  padding: 20
                                }}
                              >
                                <TouchableOpacity
                                  activeOpacity={1}
                                  onPress={(e: any) => e?.stopPropagation && e.stopPropagation()}
                                  style={{
                                    width:"100%",
                                    maxWidth: 440,
                                    backgroundColor: darkMode ?"#1e1e1e":"#ffffff",
                                    borderRadius: 16,
                                    padding: 20,
                                    shadowColor:"#000",
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.35,
                                    shadowRadius: 16,
                                    elevation: 12,
                                    borderWidth: 1.5,
                                    borderColor: darkMode ?"#333":"#bbdefb"
                                  }}
                                >`;

const r1 = `                          {/* Floating Container Modal for Photo ID Selection */}
                          {showDocModal && !!profileForm.photoIdBase64 && (
                            <Modal visible={true} transparent animationType="fade"onRequestClose={() => setShowDocModal(false)}>
                              <View
                                style={{
                                  flex: 1,
                                  backgroundColor:"rgba(0, 0, 0, 0.7)",
                                  justifyContent:"center",
                                  alignItems:"center",
                                  padding: 20
                                }}
                              >
                                <View
                                  style={{
                                    width:"100%",
                                    maxWidth: 440,
                                    backgroundColor: darkMode ?"#1e1e1e":"#ffffff",
                                    borderRadius: 16,
                                    padding: 20,
                                    shadowColor:"#000",
                                    shadowOffset: { width: 0, height: 8 },
                                    shadowOpacity: 0.35,
                                    shadowRadius: 16,
                                    elevation: 12,
                                    borderWidth: 1.5,
                                    borderColor: darkMode ?"#333":"#bbdefb"
                                  }}
                                >`;

// 2. Target closing tags of modal content
const s2 = `                                  )}
                                </TouchableOpacity>
                              </TouchableOpacity>
                            </Modal>`;

const r2 = `                                  )}
                                </View>
                              </View>
                            </Modal>`;

function performReplace(searchStr, replaceStr, name) {
  const normSearchStr = searchStr.replace(/\r\n/g, '\n');
  const normReplaceStr = replaceStr.replace(/\r\n/g, '\n');
  if (content.indexOf(normSearchStr) === -1) {
    console.error(`ERROR: Search string not found for: ${name}`);
    process.exit(1);
  }
  content = content.replace(normSearchStr, normReplaceStr);
  console.log(`SUCCESS: Replaced ${name}`);
}

performReplace(s1, r1, "Modal Opening Wrapper");
performReplace(s2, r2, "Modal Closing Wrapper");

fs.writeFileSync(filePath, content, 'utf8');
console.log("MODAL FIX APPLIED SUCCESSFULLY!");
