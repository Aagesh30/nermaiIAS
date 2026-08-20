const fs = require('fs');
const path = require('path');

const webPortalPath = path.join(__dirname, '../../web_portal/App.tsx');
const friendPath = path.join(__dirname, '../../friend/App.tsx.txt');

console.log('Reading files...');
const webPortalContent = fs.readFileSync(webPortalPath, 'utf8');
const friendContent = fs.readFileSync(friendPath, 'utf8');

// 1. Extract guest portal block from friendContent
console.log('Extracting guest portal from friend code...');
const friendStartPattern = '  if (user?.role === "guest" && !activeAttempt && !reviewMode && !studyModalVisible) {';
const friendEndPattern = '  // Render main screen';

const startIdx = friendContent.indexOf(friendStartPattern);
if (startIdx === -1) {
    console.error('Could not find start pattern in friend file!');
    process.exit(1);
}

const endIdx = friendContent.indexOf(friendEndPattern, startIdx);
if (endIdx === -1) {
    console.error('Could not find end pattern in friend file!');
    process.exit(1);
}

// Find the last closing brace of the guest portal block before "// Render main screen"
let blockContent = friendContent.substring(startIdx, endIdx);
const lastClosingBraceIdx = blockContent.lastIndexOf('}');
if (lastClosingBraceIdx === -1) {
    console.error('Could not find closing brace in friend block!');
    process.exit(1);
}
blockContent = blockContent.substring(0, lastClosingBraceIdx + 1);

// Replace condition in the friend block to support non-logged-in users too (!user)
const correctedStartLine = '  if ((!user || user?.role === "guest") && !activeAttempt && !reviewMode && !studyModalVisible) {';
blockContent = correctedStartLine + blockContent.substring(friendStartPattern.length);

console.log('Friend block extracted successfully. Size:', blockContent.length);

// 2. Find target guest portal block in webPortalContent
console.log('Finding guest portal block in current web_portal/App.tsx...');
const webPortalStartPattern = '  if ((!user || user?.role === "guest") && !activeAttempt && !reviewMode && !studyModalVisible) {';
const webPortalEndPattern = '  // Render main screen';

const webStartIdx = webPortalContent.indexOf(webPortalStartPattern);
if (webStartIdx === -1) {
    console.error('Could not find start pattern in current App.tsx!');
    process.exit(1);
}

const webEndIdx = webPortalContent.indexOf(webPortalEndPattern, webStartIdx);
if (webEndIdx === -1) {
    console.error('Could not find end pattern in current App.tsx!');
    process.exit(1);
}

// Find the last closing brace of the guest portal block in web_portal/App.tsx
let webBlock = webPortalContent.substring(webStartIdx, webEndIdx);
const webLastClosingBraceIdx = webBlock.lastIndexOf('}');
if (webLastClosingBraceIdx === -1) {
    console.error('Could not find closing brace in current App.tsx block!');
    process.exit(1);
}
const webBlockLength = webLastClosingBraceIdx + 1;

console.log('Replacing guest portal block...');
let updatedContent = webPortalContent.substring(0, webStartIdx) + blockContent + webPortalContent.substring(webStartIdx + webBlockLength);

// 3. Add activeCampaignBanner modal markup to student side main layout (right before the end of the MainApp SafeAreaView)
console.log('Adding Campaign Popup to student main screen...');
const modalTargetPattern = `            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}`;

const activeCampaignBannerModalMarkup = `      {/* Campaign Closable Advertisement Banner Modal */}
      {activeCampaignBanner && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={handleCloseCampaignBanner}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <View style={[styles.card, darkMode && styles.cardDark, { width: "90%", maxWidth: 440, borderRadius: 20, overflow: "hidden", elevation: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, borderTopWidth: 5, borderTopColor: "#c62828" }]}>
              {/* Close 'X' Button on top-right */}
              <TouchableOpacity
                onPress={handleCloseCampaignBanner}
                style={{ position: "absolute", top: 12, right: 12, zIndex: 10, backgroundColor: "rgba(0,0,0,0.5)", width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>

              {/* Poster Image */}
              {activeCampaignBanner.posterUrl ? (
                <View style={{ width: "100%", height: 240, backgroundColor: "#000" }}>
                  <Image source={{ uri: activeCampaignBanner.posterUrl }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                </View>
              ) : null}

              {/* Text Content */}
              <View style={{ padding: 20, gap: 8 }}>
                <Text style={{ fontSize: 18, fontWeight: "900", color: darkMode ? "#ffffff" : "#1a237e" }}>
                  {activeCampaignBanner.title}
                </Text>
                {activeCampaignBanner.description ? (
                  <Text style={{ fontSize: 13, color: darkMode ? "#b0bec5" : "#616161", lineHeight: 18 }}>
                    {activeCampaignBanner.description}
                  </Text>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10, borderTopWidth: 1, borderColor: darkMode ? "#333" : "#f0f0f0" }}>
                <TouchableOpacity
                  onPress={handleCloseCampaignBanner}
                  style={[styles.outlineBtn, { flex: 1, marginVertical: 0, justifyContent: "center", borderColor: "#c62828" }]}
                >
                  <Text style={[styles.outlineBtnTxt, { color: "#c62828" }]}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    handleCloseCampaignBanner();
                    if (user?.role === "guest" || !user) {
                      setShowAdmissionForm(true);
                    } else {
                      Alert.alert("Enquiry Recorded", "Thank you for your interest! Our team has logged your response.");
                    }
                  }}
                  style={[styles.primaryBtn, { flex: 1.5, backgroundColor: "#c62828", marginVertical: 0 }]}
                >
                  <Text style={styles.primaryBtnTxt}>Register / Enquire Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}`;

const replacementMarkup = `            </View>
          </View>
        </Modal>
      )}

${activeCampaignBannerModalMarkup}
    </SafeAreaView>
  );
}`;

const modalIdx = updatedContent.indexOf(modalTargetPattern);
if (modalIdx === -1) {
    console.error('Could not find modal target pattern in current App.tsx!');
    process.exit(1);
}

updatedContent = updatedContent.substring(0, modalIdx) + replacementMarkup + updatedContent.substring(modalIdx + modalTargetPattern.length);

console.log('Writing back to web_portal/App.tsx...');
fs.writeFileSync(webPortalPath, updatedContent, 'utf8');
console.log('Merge complete successfully!');
