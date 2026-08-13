const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Target MainApp state variables
const s1 = `  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const [showConfirmDocModal, setShowConfirmDocModal] = useState(false);
  const [showProfileReviewModal, setShowProfileReviewModal] = useState(false);`;

const r1 = `  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const [showConfirmDocModal, setShowConfirmDocModal] = useState(false);
  const [showProfileReviewModal, setShowProfileReviewModal] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [showProfileSuccessModal, setShowProfileSuccessModal] = useState(false);`;

// 2. Target executeProfileSubmission function
const s2 = `  const executeProfileSubmission = async () => {
    const myStudent = getLoggedInStudent(user, students);
    if (!myStudent) return;
    try {
      await api.post("/auth/login", { username: user.username, password: studentOldPassword });
    } catch (err: any) {
      Alert.alert("Error", "Incorrect old password. Please enter the correct password created by the administrator.");
      return;
    }
    try {
      await api.put(\`/erp/student/\${myStudent.id}\`, { loginPassword: studentNewPassword });
    } catch (err: any) {
      Alert.alert("Error", "Failed to update password: " + err.message);
      return;
    }
    try {
      const compressedPassport = await compressImageBase64(profileForm.passportPhotoBase64);
      const compressedPhotoId = await compressImageBase64(profileForm.photoIdBase64);
      await api.post("/erp/profile-request", {
        studentId: myStudent?.id || user.studentId || user.userId,
        username: user.username,
        ...profileForm,
        constituency: profileForm.constituency === "Others" ? profileForm.constituencyOthers : profileForm.constituency,
        passportPhotoBase64: compressedPassport || profileForm.passportPhotoBase64 || "test",
        photoIdBase64: compressedPhotoId || profileForm.photoIdBase64 || "test"
      }, undefined, 60000);
      // Disable edit permission and mark as submitted after student submission
      if (myStudent?.id) {
        await api.put(\`/erp/student/\${myStudent.id}\`, { profileEditPermission: false, isProfileSubmitted: true });
      }
      Alert.alert("Submitted Successfully", "Your profile has been submitted successfully for admin review.");
      setProfileForm({ name: "", initial: "", dob: "", bloodGroup: "", address: "", gender: "", community: "", fatherName: "", occupation: "", studentOccupation: "", altPhone: "", email: "", qualification: "", college: "", referralSource: "", passportPhotoBase64: "", photoIdBase64: "", photoIdType: "", photoIdConfirmed: false, horizontalReservation: "", constituency: "", constituencyOthers: "" });
      setStudentOldPassword("");
      setStudentNewPassword("");
      setShowValidationErrors(false);
      setShowProfileModal(false);
      loadMyProfileRequest(myStudent?.id || user.studentId || user.userId);
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message ||"Failed to submit profile.");
    }
  };`;

const r2 = `  const executeProfileSubmission = async () => {
    const myStudent = getLoggedInStudent(user, students);
    if (!myStudent) return;
    setIsSubmittingProfile(true);
    try {
      await api.post("/auth/login", { username: user.username, password: studentOldPassword });
    } catch (err: any) {
      setIsSubmittingProfile(false);
      Alert.alert("Error", "Incorrect old password. Please enter the correct password created by the administrator.");
      return;
    }
    try {
      await api.put(\`/erp/student/\${myStudent.id}\`, { loginPassword: studentNewPassword });
    } catch (err: any) {
      setIsSubmittingProfile(false);
      Alert.alert("Error", "Failed to update password: " + err.message);
      return;
    }
    try {
      const compressedPassport = await compressImageBase64(profileForm.passportPhotoBase64);
      const compressedPhotoId = await compressImageBase64(profileForm.photoIdBase64);
      await api.post("/erp/profile-request", {
        studentId: myStudent?.id || user.studentId || user.userId,
        username: user.username,
        ...profileForm,
        constituency: profileForm.constituency === "Others" ? profileForm.constituencyOthers : profileForm.constituency,
        passportPhotoBase64: compressedPassport || profileForm.passportPhotoBase64 || "test",
        photoIdBase64: compressedPhotoId || profileForm.photoIdBase64 || "test"
      }, undefined, 60000);
      // Disable edit permission and mark as submitted after student submission
      if (myStudent?.id) {
        await api.put(\`/erp/student/\${myStudent.id}\`, { profileEditPermission: false, isProfileSubmitted: true });
      }
      setIsSubmittingProfile(false);
      setShowProfileReviewModal(false);
      setProfileForm({ name: "", initial: "", dob: "", bloodGroup: "", address: "", gender: "", community: "", fatherName: "", occupation: "", studentOccupation: "", altPhone: "", email: "", qualification: "", college: "", referralSource: "", passportPhotoBase64: "", photoIdBase64: "", photoIdType: "", photoIdConfirmed: false, horizontalReservation: "", constituency: "", constituencyOthers: "" });
      setStudentOldPassword("");
      setStudentNewPassword("");
      setShowValidationErrors(false);
      setShowProfileModal(false);
      setShowProfileSuccessModal(true);
      loadMyProfileRequest(myStudent?.id || user.studentId || user.userId);
      loadStudents();
    } catch (e: any) {
      setIsSubmittingProfile(false);
      Alert.alert("Error", e.message ||"Failed to submit profile.");
    }
  };`;

// 3. Target Review Modal buttons
const s3 = `              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
                <TouchableOpacity
                  onPress={() => setShowProfileReviewModal(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: darkMode ? "#444" : "#ccc",
                    alignItems: "center"
                  }}
                >
                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555", fontWeight: "bold" }}>Go Back & Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    setShowProfileReviewModal(false);
                    await executeProfileSubmission();
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: "#c62828",
                    alignItems: "center"
                  }}
                >
                  <Text style={{ fontSize: 13, color: "#ffffff", fontWeight: "bold" }}>Confirm & Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}`;

const r3 = `              {/* Action Buttons */}
              <View style={{ flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
                <TouchableOpacity
                  disabled={isSubmittingProfile}
                  onPress={() => setShowProfileReviewModal(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: darkMode ? "#444" : "#ccc",
                    alignItems: "center",
                    opacity: isSubmittingProfile ? 0.5 : 1
                  }}
                >
                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555", fontWeight: "bold" }}>Go Back & Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isSubmittingProfile}
                  onPress={async () => {
                    await executeProfileSubmission();
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 8,
                    backgroundColor: "#c62828",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: isSubmittingProfile ? 0.6 : 1
                  }}
                >
                  {isSubmittingProfile ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={{ fontSize: 13, color: "#ffffff", fontWeight: "bold" }}>Confirm & Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Custom Profile Submission Success Modal */}
      {showProfileSuccessModal && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={() => setShowProfileSuccessModal(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "center", alignItems: "center", padding: 20, zIndex: 11000 }}>
            <View style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
              borderRadius: 16,
              padding: 24,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
              elevation: 8,
              borderWidth: 1,
              borderColor: darkMode ? "#333" : "#e0e0e0"
            }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: darkMode ? "#1b3e20" : "#e8f5e9", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
                <Ionicons name="checkmark-circle" size={40} color="#2e7d32" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: darkMode ? "#fff" : "#2e7d32", marginBottom: 8, textAlign: "center" }}>
                Submitted Successfully
              </Text>
              <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#666", textAlign: "center", marginBottom: 20, lineHeight: 18 }}>
                Your profile request has been submitted successfully for admin review.
              </Text>
              <TouchableOpacity
                onPress={() => setShowProfileSuccessModal(false)}
                style={{
                  width: "100%",
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: "#2e7d32",
                  alignItems: "center"
                }}
              >
                <Text style={{ fontSize: 13, color: "#ffffff", fontWeight: "bold" }}>Got It</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}`;

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

performReplace(s1, r1, "State variables loading");
performReplace(s2, r2, "executeProfileSubmission loading states");
performReplace(s3, r3, "Review Modal buttons activity spinner");

fs.writeFileSync(filePath, content, 'utf8');
console.log("PROFILE SUBMIT LOADING INJECTED SUCCESSFULLY!");
