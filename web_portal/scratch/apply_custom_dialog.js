const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Target MainApp state variables
const s1 = `  const [erpSub, setErpSub] = useState("students");
  const [lmsSub, setLmsSub] = useState("quiz");
  const [crmSub, setCrmSub] = useState("leads");
  const [darkMode, setDarkMode] = useState(false);`;

const r1 = `  const [erpSub, setErpSub] = useState("students");
  const [lmsSub, setLmsSub] = useState("quiz");
  const [crmSub, setCrmSub] = useState("leads");
  const [darkMode, setDarkMode] = useState(false);
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const [showConfirmDocModal, setShowConfirmDocModal] = useState(false);`;

// 2. Target selectPhotoIdType definition
const s2 = `  const selectPhotoIdType = (docType: string) => {
    if (Platform.OS === "web") {
      const confirmSelection = window.confirm(\`Confirm to select '\${docType}' as your uploaded Photo ID?\`);
      if (confirmSelection) {
        setProfileForm(prev => ({ ...prev, photoIdType: docType, photoIdConfirmed: true }));
      }
    } else {
      Alert.alert(
        "Confirm Document Selection",
        \`Confirm to select '\${docType}' as your uploaded Photo ID?\`,
        [
          { text:"Cancel", style:"cancel"},
          {
            text:"Confirm",
            style:"default",
            onPress: () => {
              setProfileForm(prev => ({ ...prev, photoIdType: docType, photoIdConfirmed: true }));
            }
          }
        ]
      );
    }
  };`;

const r2 = `  const selectPhotoIdType = (docType: string) => {
    setPendingDocType(docType);
    setShowConfirmDocModal(true);
  };`;

// 3. Target modals section in main return layout
const s3 = `              <TouchableOpacity
                onPress={submitStudentFeedback}
                style={[styles.primaryBtn, { width:"100%", marginTop: 15 }]}
              >
                <Text style={styles.primaryBtnTxt}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Campaign Detail Overlay Modal */}`;

const r3 = `              <TouchableOpacity
                onPress={submitStudentFeedback}
                style={[styles.primaryBtn, { width:"100%", marginTop: 15 }]}
              >
                <Text style={styles.primaryBtnTxt}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Custom Document Confirmation Modal */}
      {showConfirmDocModal && pendingDocType && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShowConfirmDocModal(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 20, zIndex: 10000 }}>
            <View style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
              borderRadius: 14,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 8,
              borderWidth: 1,
              borderColor: darkMode ? "#333" : "#e0e0e0"
            }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: darkMode ? "#fff" : "#212121", marginBottom: 10 }}>
                Confirm Selection
              </Text>
              <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#666", marginBottom: 20, lineHeight: 18 }}>
                Confirm to select <Text style={{ fontWeight: "bold", color: "#c62828" }}>{pendingDocType}</Text> as your uploaded Photo ID?
              </Text>
              <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
                <TouchableOpacity
                  onPress={() => setShowConfirmDocModal(false)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: darkMode ? "#444" : "#ccc",
                    alignItems: "center"
                  }}
                >
                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555", fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setProfileForm(prev => ({ ...prev, photoIdType: pendingDocType, photoIdConfirmed: true }));
                    setShowConfirmDocModal(false);
                  }}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 16,
                    borderRadius: 6,
                    backgroundColor: "#c62828",
                    alignItems: "center"
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#ffffff", fontWeight: "bold" }}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Campaign Detail Overlay Modal */}`;

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

performReplace(s1, r1, "State declarations");
performReplace(s2, r2, "selectPhotoIdType override");
performReplace(s3, r3, "Custom confirmation modal render");

fs.writeFileSync(filePath, content, 'utf8');
console.log("CUSTOM DIALOG FIX SUCCESSFUL!");
