const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Target MainApp state variables to add showProfileReviewModal
const s1 = `  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const [showConfirmDocModal, setShowConfirmDocModal] = useState(false);`;

const r1 = `  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const [showConfirmDocModal, setShowConfirmDocModal] = useState(false);
  const [showProfileReviewModal, setShowProfileReviewModal] = useState(false);`;

// 2. Target submitProfileCompletion definition to validate and show the review modal, and define executeProfileSubmission
const s2 = `  const submitProfileCompletion = async () => {
    const myStudent = getLoggedInStudent(user, students);
    // Check if student has already submitted once (count >= 1) and no re-enable permission
    const rawCount = myStudent?.profileSubmitCount;
    const count = typeof rawCount ==="number"? rawCount : (rawCount && typeof rawCount ==="object"&& typeof (rawCount as any).__increment ==="number") ? (rawCount as any).__increment : 0;
    if (count >= 1 && !myStudent?.profileEditPermission) {
      Alert.alert("Already Submitted","Your profile has already been submitted. If you need to make changes, please contact the administrator.");
      return;
    }
    if (!profileForm.name || !profileForm.initial || !profileForm.dob || !profileForm.address ||
        !profileForm.gender || !profileForm.community || !profileForm.fatherName || !profileForm.occupation ||
        !profileForm.studentOccupation || !profileForm.altPhone || !profileForm.email ||
        !profileForm.qualification || !profileForm.college || !profileForm.referralSource ||
        !(profileForm.constituency === "Others" ? profileForm.constituencyOthers : profileForm.constituency) ||
        !studentOldPassword || !studentNewPassword) {
      setShowValidationErrors(true);
      Alert.alert("Error", "All fields marked with * are required (including old/new passwords).");
      return;
    }
    if (profileForm.photoIdBase64 && !profileForm.photoIdType) {
      Alert.alert("Error","Please select and confirm what document you uploaded for Photo ID.");
      setShowDocModal(true);
      return;
    }
    // Confirmation alert before final submit
    const constituencyVal = profileForm.constituency === "Others" ? profileForm.constituencyOthers : profileForm.constituency;
    const detailsText = 
      \`Name: \${profileForm.name} \${profileForm.initial}\\n\` +
      \`DOB: \${profileForm.dob}\\n\` +
      \`Blood Group: \${profileForm.bloodGroup || "—"}\\n\` +
      \`Address: \${profileForm.address}\\n\` +
      \`Gender: \${profileForm.gender}\\n\` +
      \`Community: \${profileForm.community}\\n\` +
      \`Father's Name: \${profileForm.fatherName}\\n\` +
      \`Father's Occupation: \${profileForm.occupation}\\n\` +
      \`Your Occupation: \${profileForm.studentOccupation}\\n\` +
      \`Alt Phone: \${profileForm.altPhone}\\n\` +
      \`Email: \${profileForm.email}\\n\` +
      \`Qualification: \${profileForm.qualification}\\n\` +
      \`College: \${profileForm.college}\\n\` +
      \`Referral Source: \${profileForm.referralSource}\\n\` +
      \`Constituency: \${constituencyVal || "—"}\\n\` +
      \`Horizontal Reservation: \${profileForm.horizontalReservation || "—"}\\n\` +
      \`Photo ID: \${profileForm.photoIdType || "—"}\\n\\n\` +
      \`⚠️ WARNING: Review details properly as it cannot be changed once submitted.\`;

    Alert.alert(
      "Confirm Submission Details",
      detailsText,
      [
        { text: "Go Back & Edit", style: "cancel" },
        {
          text: "Confirm & Submit",
          style: "default",
          onPress: async () => {
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
          }
        }
      ]
    );
  };`;

const r2 = `  const submitProfileCompletion = async () => {
    const myStudent = getLoggedInStudent(user, students);
    // Check if student has already submitted once (count >= 1) and no re-enable permission
    const rawCount = myStudent?.profileSubmitCount;
    const count = typeof rawCount ==="number"? rawCount : (rawCount && typeof rawCount ==="object"&& typeof (rawCount as any).__increment ==="number") ? (rawCount as any).__increment : 0;
    if (count >= 1 && !myStudent?.profileEditPermission) {
      Alert.alert("Already Submitted","Your profile has already been submitted. If you need to make changes, please contact the administrator.");
      return;
    }
    if (!profileForm.name || !profileForm.initial || !profileForm.dob || !profileForm.address ||
        !profileForm.gender || !profileForm.community || !profileForm.fatherName || !profileForm.occupation ||
        !profileForm.studentOccupation || !profileForm.altPhone || !profileForm.email ||
        !profileForm.qualification || !profileForm.college || !profileForm.referralSource ||
        !(profileForm.constituency === "Others" ? profileForm.constituencyOthers : profileForm.constituency) ||
        !studentOldPassword || !studentNewPassword) {
      setShowValidationErrors(true);
      Alert.alert("Error", "All fields marked with * are required (including old/new passwords).");
      return;
    }
    if (profileForm.photoIdBase64 && !profileForm.photoIdType) {
      Alert.alert("Error","Please select and confirm what document you uploaded for Photo ID.");
      setShowDocModal(true);
      return;
    }
    // Validation successful -> open custom review modal instead of native confirm
    setShowProfileReviewModal(true);
  };

  const executeProfileSubmission = async () => {
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

// 3. Target modals section in main return layout to append the custom Profile Review modal
const s3 = `      {/* Custom Document Confirmation Modal */}
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
      )}`;

const r3 = `      {/* Custom Document Confirmation Modal */}
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

      {/* Custom Profile Review Confirmation Modal */}
      {showProfileReviewModal && (
        <Modal visible={true} transparent animationType="slide" onRequestClose={() => setShowProfileReviewModal(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <View style={{
              width: "90%",
              maxWidth: 500,
              maxHeight: "85%",
              backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
              borderRadius: 16,
              padding: 22,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 10,
              borderWidth: 1,
              borderColor: darkMode ? "#333" : "#e0e0e0"
            }}>
              {/* Header */}
              <Text style={{ fontSize: 17, fontWeight: "bold", color: darkMode ? "#fff" : "#1565c0", marginBottom: 12 }}>
                Review Your Profile Responses
              </Text>

              {/* Warning Banner */}
              <View style={{
                backgroundColor: darkMode ? "#3e2723" : "#fff3e0",
                borderLeftWidth: 4,
                borderLeftColor: "#e65100",
                padding: 10,
                borderRadius: 6,
                marginBottom: 16,
                flexDirection: "row",
                gap: 8,
                alignItems: "center"
              }}>
                <Ionicons name="warning" size={18} color="#e65100" />
                <Text style={{ color: "#e65100", fontSize: 11, fontWeight: "bold", flex: 1 }}>
                  Review your response carefully. It cannot be modified once submitted.
                </Text>
              </View>

              {/* Scrollable Form Details Review */}
              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, marginBottom: 16 }}>
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 11, color: "#9e9e9e", fontWeight: "bold" }}>PERSONAL DETAILS</Text>
                  
                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Full Name:</Text> {profileForm.name} {profileForm.initial}
                  </Text>
                  
                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Date of Birth:</Text> {profileForm.dob}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Gender:</Text> {profileForm.gender}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Blood Group:</Text> {profileForm.bloodGroup || "—"}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Community:</Text> {profileForm.community}
                  </Text>

                  <View style={{ height: 1, backgroundColor: darkMode ? "#333" : "#eee", marginVertical: 4 }} />

                  <Text style={{ fontSize: 11, color: "#9e9e9e", fontWeight: "bold" }}>FAMILY & CONTACT</Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Father's Name:</Text> {profileForm.fatherName}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Father's Occupation:</Text> {profileForm.occupation}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Your Occupation:</Text> {profileForm.studentOccupation}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Alternate Mobile:</Text> {profileForm.altPhone}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Email Address:</Text> {profileForm.email}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Address:</Text> {profileForm.address}
                  </Text>

                  <View style={{ height: 1, backgroundColor: darkMode ? "#333" : "#eee", marginVertical: 4 }} />

                  <Text style={{ fontSize: 11, color: "#9e9e9e", fontWeight: "bold" }}>ACADEMICS & PREFERENCES</Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Qualification:</Text> {profileForm.qualification}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>College / Institution:</Text> {profileForm.college}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Referral Source:</Text> {profileForm.referralSource}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Constituency:</Text> {profileForm.constituency === "Others" ? profileForm.constituencyOthers : profileForm.constituency}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Horizontal Reservation:</Text> {profileForm.horizontalReservation || "None"}
                  </Text>

                  <View style={{ height: 1, backgroundColor: darkMode ? "#333" : "#eee", marginVertical: 4 }} />

                  <Text style={{ fontSize: 11, color: "#9e9e9e", fontWeight: "bold" }}>ATTACHMENTS</Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Passport Photo:</Text> {profileForm.passportPhotoBase64 ? "Uploaded" : "—"}
                  </Text>

                  <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#444" }}>
                    <Text style={{ fontWeight: "bold" }}>Photo ID Document:</Text> {profileForm.photoIdType || "—"} ({profileForm.photoIdBase64 ? "Uploaded" : "Pending"})
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
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

performReplace(s1, r1, "State variables review modal");
performReplace(s2, r2, "submitProfileCompletion update");
performReplace(s3, r3, "Review Modal placement");

fs.writeFileSync(filePath, content, 'utf8');
console.log("PROFILE REVIEW DIALOG FIXED SUCCESSFULLY!");
