const fs = require('fs');

// Helper to replace text in file
function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  console.log(`Patching ${filePath}, original size: ${content.length}`);

  // 1. Patch loadNotifications to filter personal fee alerts
  const notifMarker = 'const loadNotifications = async ()';
  const startNotifIdx = content.indexOf(notifMarker);
  if (startNotifIdx !== -1) {
    const getIdx = content.indexOf('res = await api.get', startNotifIdx);
    const setNotIdx = content.indexOf('setNotifications(', getIdx);
    const setNotEndIdx = content.indexOf(';', setNotIdx);
    
    if (getIdx !== -1 && setNotIdx !== -1 && setNotEndIdx !== -1) {
      const lineStartIdx = content.lastIndexOf('\n', getIdx) + 1;
      const lineEndIdx = content.indexOf('\n', getIdx);
      const lineText = content.substring(lineStartIdx, lineEndIdx);
      const indent = lineText.substring(0, lineText.search(/\S/));

      const targetText = content.substring(content.lastIndexOf('const res = await api.get', getIdx), setNotEndIdx + 1);
      
      const replacement = `const res = await api.get(\`/notification?role=\${role}&batch=\${batch}\`);
${indent}let notifs = res?.data || res || [];
${indent}if (role === "student") {
${indent}  const myStudentName = myStudent ? getStudentName(myStudent) : "";
${indent}  const myUsername = user?.username || "";
${indent}  const myName = user?.name || "";
${indent}  notifs = notifs.filter((n: any) => {
${indent}    const isFeeAlert = (n.title || "").includes("Fee Payment Alert") ||
${indent}      (n.message || "").toLowerCase().includes("pay your pending") ||
${indent}      (n.message || "").toLowerCase().includes("pending tuition fee");
${indent}    if (!isFeeAlert) return true;
${indent}    const lowerTitle = (n.title || "").toLowerCase();
${indent}    const lowerContent = (n.message || "").toLowerCase();
${indent}    const stdNameLower = myStudentName.toLowerCase().trim();
${indent}    const usrNameLower = myUsername.toLowerCase().trim();
${indent}    const nameLower = myName.toLowerCase().trim();
${indent}    return (stdNameLower && (lowerTitle.includes(stdNameLower) || lowerContent.includes(stdNameLower))) ||
${indent}           (usrNameLower && (lowerTitle.includes(usrNameLower) || lowerContent.includes(usrNameLower))) ||
${indent}           (nameLower && (lowerTitle.includes(nameLower) || lowerContent.includes(nameLower)));
${indent}  });
${indent}}
${indent}setNotifications(notifs);`;

      content = content.replace(targetText, replacement);
      console.log(`Successfully patched loadNotifications in ${filePath}`);
    } else {
      console.log(`Could not find loadNotifications layout in ${filePath}`);
    }
  } else {
    console.log(`Marker loadNotifications not found in ${filePath}`);
  }

  // 2. Replace studentConfirmPassword state with studentOldPassword
  content = content.replace('const [studentConfirmPassword, setStudentConfirmPassword] = useState("");', 'const [studentOldPassword, setStudentOldPassword] = useState("");');
  content = content.replace('const [studentConfirmPassword, setStudentConfirmPassword] = useState<string>("");', 'const [studentOldPassword, setStudentOldPassword] = useState<string>("");');
  console.log(`Successfully updated states in ${filePath}`);

  // 3. Patch Student Profile Section
  const isWeb = filePath.includes('web_portal');
  const profileSectionMarker = isWeb 
    ? '{/* STUDENT MY PROFILE SECTION */}\r\n                {erpSub ==="my-profile"&& user.role ==="student"&& ('
    : '{/* STUDENT MY PROFILE SECTION */}\n                {erpSub === "my-profile" && user.role === "student" && (';
  
  const profileSectionMarkerAlt = isWeb
    ? '{/* STUDENT MY PROFILE SECTION */}\n                {erpSub ==="my-profile"&& user.role ==="student"&& ('
    : '{/* STUDENT MY PROFILE SECTION */}\r\n                {erpSub === "my-profile" && user.role === "student" && (';

  let startProfileIdx = content.indexOf(profileSectionMarker);
  if (startProfileIdx === -1) {
    startProfileIdx = content.indexOf(profileSectionMarkerAlt);
  }

  const sectionEndMarker = isWeb
    ? '{/* ================== 4. LMS LEARNING'
    : '{erpSub === "staff"';

  if (startProfileIdx !== -1) {
    // Find the end of this ERP Sub section block.
    // The section block ends with matching parenthesis/brace.
    // On web, the sub-section ends before LMS LEARNING section: `{/* ================== 4. LMS LEARNING`
    // On mobile, the sub-section ends before `{erpSub === "staff"` (line 7489)
      
    const endProfileIdx = content.indexOf(sectionEndMarker, startProfileIdx);
    if (endProfileIdx !== -1) {
      // Find the closing parent-View block right before that
      const endViewIdx = content.lastIndexOf('</View>', endProfileIdx);
      const targetReplaceBlock = content.substring(startProfileIdx, endViewIdx + 7);
      
      const dobFormatter = isWeb ? 'formatDobForDisplay(myStudent?.dateOfBirth || myStudent?.dob || myProfileRequest.dob)' : 'myStudent?.dateOfBirth || myStudent?.dob || myProfileRequest.dob || "—"';
      
      const replacement = isWeb ? 
        `{/* STUDENT MY PROFILE SECTION */}
                {erpSub ==="my-profile"&& user.role ==="student"&& (
                  <ScrollView style={{ flex: 1, padding: 15 }} nestedScrollEnabled>
                    <View style={{ gap: 15, paddingBottom: 40 }}>
                      <Text style={styles.sectionTitle}>My Profile</Text>

                      {/* Status Banner */}
                      {myProfileRequest && (
                        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: myProfileRequest.status ==="approved"?"#4caf50": myProfileRequest.status ==="pending"?"#f57c00":"#c62828"}]}>
                          {myProfileRequest.status ==="approved"&& <Text style={{ color:"#4caf50", fontWeight:"bold"}}>Your profile has been approved! Welcome, {myProfileRequest.name}.</Text>}
                          {myProfileRequest.status ==="pending"&& <Text style={{ color:"#f57c00", fontWeight:"bold"}}>⏳ Your profile completion request is pending admin review.</Text>}
                          {myProfileRequest.status ==="rejected"&& (
                            <>
                              <Text style={{ color:"#c62828", fontWeight:"bold", marginBottom: 4 }}>Profile rejected. Please resubmit.</Text>
                              {myProfileRequest.rejectionReason && <Text style={{ color:"#757575", fontSize: 12 }}>Reason: {myProfileRequest.rejectionReason}</Text>}
                            </>
                          )}
                        </View>
                      )}

                      {/* Change Password Card */}
                      <View style={[styles.card, darkMode && styles.cardDark]}>
                        <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>🔑 Change Account Password</Text>
                        <TextInput
                          style={[styles.input, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444", color: "#e0e0e0" }]}
                          placeholder="Old Password (created by admin)"
                          secureTextEntry
                          placeholderTextColor="#999"
                          value={studentOldPassword}
                          onChangeText={setStudentOldPassword}
                        />
                        <TextInput
                          style={[styles.input, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444", color: "#e0e0e0" }]}
                          placeholder="New Password (modified by student)"
                          secureTextEntry
                          placeholderTextColor="#999"
                          value={studentNewPassword}
                          onChangeText={setStudentNewPassword}
                        />
                        <TouchableOpacity
                          onPress={async () => {
                            if (!studentOldPassword || !studentNewPassword) {
                              Alert.alert("Error", "Please fill in both old and new password fields.");
                              return;
                            }
                            const myStudent = getLoggedInStudent(user, students);
                            if (!myStudent?.id) {
                              Alert.alert("Error", "Student record not found.");
                              return;
                            }
                            try {
                              // Verify old password
                              await api.post("/auth/login", { 
                                username: user.username, 
                                password: studentOldPassword 
                              });
                            } catch (err: any) {
                              Alert.alert("Error", "Incorrect old password. Please enter the correct password created by the administrator.");
                              return;
                            }
                            try {
                              await api.put(\`/erp/student/\${myStudent.id}\`, { loginPassword: studentNewPassword });
                              Alert.alert("Success", "Password updated successfully!");
                              setStudentOldPassword("");
                              setStudentNewPassword("");
                              loadStudents();
                            } catch (err: any) {
                              Alert.alert("Error", err.message || "Failed to update password.");
                            }
                          }}
                          style={[styles.primaryBtn, { marginTop: 6 }]}
                        >
                          <Text style={styles.primaryBtnTxt}>Update Password</Text>
                        </TouchableOpacity>
                      </View>

                      {myProfileRequest && myProfileRequest.status === "approved" && (() => {
                        const myStudent = getLoggedInStudent(user, students);
                        return (
                          <View style={{ gap: 15 }}>
                            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#4caf50" }]}>
                              <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>My Profile Details</Text>
                              <View style={{ gap: 8 }}>
                                {[
                                  { label: "Full Name", value: myStudent?.name || myProfileRequest.name },
                                  { label: "Date of Birth", value: formatDobForDisplay(myStudent?.dateOfBirth || myStudent?.dob || myProfileRequest.dob) },
                                  { label: "Blood Group", value: myStudent?.bloodGroup || myProfileRequest.bloodGroup || "—" },
                                  { label: "Gender", value: myStudent?.gender || myProfileRequest.gender || "—" },
                                  { label: "Community", value: myStudent?.community || myProfileRequest.community || "—" },
                                  { label: "Father's Name", value: myStudent?.fatherName || myProfileRequest.fatherName || "—" },
                                  { label: "Father's Occupation", value: myStudent?.occupation || myProfileRequest.occupation || "—" },
                                  { label: "Alternative Contact", value: myStudent?.altPhone || myProfileRequest.altPhone || "—" },
                                  { label: "Email Address", value: myStudent?.email || myProfileRequest.email || "—" },
                                  { label: "Educational Qualification", value: myStudent?.qualification || myProfileRequest.qualification || "—" },
                                  { label: "College / Inst.", value: myStudent?.college || myProfileRequest.college || "—" },
                                  { label: "Student's Occupation", value: myStudent?.studentOccupation || myProfileRequest.studentOccupation || "—" },
                                  { label: "Special Category Quota", value: myStudent?.horizontalReservation || myProfileRequest.horizontalReservation || "None" },
                                  { label: "Constituency", value: myStudent?.constituency || myProfileRequest.constituency || "—" },
                                  { label: "Referral Source", value: myStudent?.referralSource || myProfileRequest.referralSource || "—" },
                                  { label: "Address", value: myStudent?.address || myProfileRequest.address || "—" }
                                ].map((item, idx) => (
                                  <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: darkMode ? "#333" : "#f0f0f0", paddingBottom: 6 }}>
                                    <Text style={{ flex: 1.5, fontWeight: "bold", color: darkMode ? "#bbb" : "#616161", fontSize: 12 }}>{item.label}</Text>
                                    <Text style={{ flex: 2.5, color: darkMode ? "#fff" : "#212121", fontSize: 12 }}>{item.value}</Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          </View>
                        );
                      })()}

                      {/* Profile Form */}
                      {(!myProfileRequest || myProfileRequest.status ==="rejected") && (() => {
                        const myStudent = getLoggedInStudent(user, students);
                        const rawCount = myStudent?.profileSubmitCount;
                        const count = typeof rawCount ==="number"? rawCount : (rawCount && typeof rawCount ==="object"&& typeof (rawCount as any).__increment ==="number") ? (rawCount as any).__increment : 0;
                        // Block if already submitted once AND no admin-granted re-edit permission
                        if (count >= 1 && !myStudent?.profileEditPermission) {
                          return (
                            <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor:"#f57c00"}]}>
                              <Text style={{ fontWeight:"bold", fontSize: 14, color:"#f57c00", marginBottom: 8 }}>ℹ Profile Already Submitted</Text>
                              <Text style={{ color:"#424242", fontSize: 13, marginBottom: 6 }}>Your data has been submitted for admin review.</Text>
                              <Text style={{ color:"#757575", fontSize: 12 }}>If anything needs to be changed, please contact the administrator.</Text>
                            </View>
                          );
                        }
                        return (
                          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor:"#1976d2"}]}>
                            <Text style={{ fontWeight:"bold", fontSize: 14, color:"#1976d2", marginBottom: 6 }}>Complete Your Profile</Text>
                            <Text style={{ color:"#e53935", fontSize: 11, marginBottom: 12, fontWeight:"600"}}> Once submitted, details cannot be edited without administrator permission.</Text>
                            <Text style={{ color:"#757575", fontSize: 12, marginBottom: 12 }}>Fill all fields and upload documents. Admin will review and approve your profile.</Text>
                            `
      :
        `{/* STUDENT MY PROFILE SECTION */}
                {erpSub === "my-profile" && user.role === "student" && (
                  <View style={{ gap: 15 }}>
                    <Text style={styles.sectionTitle}>My Profile</Text>

                    {/* Status Banner */}
                    {myProfileRequest && (
                      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: myProfileRequest.status === "approved" ? "#4caf50" : myProfileRequest.status === "pending" ? "#f57c00" : "#c62828" }]}>
                        {myProfileRequest.status === "approved" && <Text style={{ color: "#4caf50", fontWeight: "bold" }}>✅ Your profile has been approved! Welcome, {myProfileRequest.name}.</Text>}
                        {myProfileRequest.status === "pending" && <Text style={{ color: "#f57c00", fontWeight: "bold" }}>⏳ Your profile completion request is pending admin review.</Text>}
                        {myProfileRequest.status === "rejected" && (
                          <>
                            <Text style={{ color: "#c62828", fontWeight: "bold", marginBottom: 4 }}>❌ Profile rejected. Please resubmit.</Text>
                            {myProfileRequest.rejectionReason && <Text style={{ color: "#757575", fontSize: 12 }}>Reason: {myProfileRequest.rejectionReason}</Text>}
                          </>
                        )}
                      </View>
                    )}

                    {/* Change Password Card */}
                    <View style={[styles.card, darkMode && styles.cardDark]}>
                      <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>🔑 Change Account Password</Text>
                      <TextInput
                        style={[styles.input, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444", color: "#e0e0e0" }]}
                        placeholder="Old Password (created by admin)"
                        secureTextEntry
                        placeholderTextColor="#999"
                        value={studentOldPassword}
                        onChangeText={setStudentOldPassword}
                      />
                      <TextInput
                        style={[styles.input, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444", color: "#e0e0e0" }]}
                        placeholder="New Password (modified by student)"
                        secureTextEntry
                        placeholderTextColor="#999"
                        value={studentNewPassword}
                        onChangeText={setStudentNewPassword}
                      />
                      <TouchableOpacity
                        onPress={async () => {
                          if (!studentOldPassword || !studentNewPassword) {
                            Alert.alert("Error", "Please fill in both old and new password fields.");
                            return;
                          }
                          const myStudent = getLoggedInStudent(user, students);
                          if (!myStudent?.id) {
                            Alert.alert("Error", "Student record not found.");
                            return;
                          }
                          try {
                            // Verify old password
                            await api.post("/auth/login", { 
                              username: user.username, 
                              password: studentOldPassword 
                            });
                          } catch (err: any) {
                            Alert.alert("Error", "Incorrect old password. Please enter the correct password created by the administrator.");
                            return;
                          }
                          try {
                            await api.put(\`/erp/student/\${myStudent.id}\`, { loginPassword: studentNewPassword });
                            Alert.alert("Success", "Password updated successfully!");
                            setStudentOldPassword("");
                            setStudentNewPassword("");
                            loadStudents();
                          } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed to update password.");
                          }
                        }}
                        style={[styles.primaryBtn, { marginTop: 6 }]}
                      >
                        <Text style={styles.primaryBtnTxt}>Update Password</Text>
                      </TouchableOpacity>
                    </View>

                    {myProfileRequest && myProfileRequest.status === "approved" && (() => {
                      const myStudent = getLoggedInStudent(user, students);
                      return (
                        <View style={{ gap: 15 }}>
                          <View style={[styles.card, darkMode && styles.cardDark, { borderLeftWidth: 4, borderLeftColor: "#4caf50" }]}>
                            <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>My Profile Details</Text>
                            <View style={{ gap: 8 }}>
                              {[
                                { label: "Full Name", value: myStudent?.name || myProfileRequest.name },
                                { label: "Date of Birth", value: myStudent?.dateOfBirth || myStudent?.dob || myProfileRequest.dob || "—" },
                                { label: "Blood Group", value: myStudent?.bloodGroup || myProfileRequest.bloodGroup || "—" },
                                { label: "Address", value: myStudent?.address || myProfileRequest.address || "—" }
                              ].map((item, idx) => (
                                <View key={idx} style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: darkMode ? "#333" : "#f0f0f0", paddingBottom: 6 }}>
                                  <Text style={{ flex: 1.5, fontWeight: "bold", color: darkMode ? "#bbb" : "#616161", fontSize: 12 }}>{item.label}</Text>
                                  <Text style={{ flex: 2.5, color: darkMode ? "#fff" : "#212121", fontSize: 12 }}>{item.value}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        </View>
                      );
                    })()}

                    {/* Profile Form */}
                    {(!myProfileRequest || myProfileRequest.status === "rejected") && (() => {
                      const myStudent = getLoggedInStudent(user, students);
                      const rawCount = myStudent?.profileSubmitCount;
                      const count = typeof rawCount === "number" ? rawCount : (rawCount && typeof rawCount === "object" && typeof (rawCount as any).__increment === "number") ? (rawCount as any).__increment : 0;
                      if (count >= 3) {
                        return (
                          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#c62828" }]}>
                            <Text style={{ fontWeight: "bold", fontSize: 14, color: "#c62828", marginBottom: 12 }}>⚠️ Profile Completion Blocked</Text>
                            <Text style={{ color: "#c62828", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>You have reached the maximum limit of 3 profile submission attempts.</Text>
                            <Text style={{ color: "#757575", fontSize: 12 }}>Please contact the administrator directly to complete your profile registration details.</Text>
                          </View>
                        );
                      }
                      return (
                        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#1976d2" }]}>
                          <Text style={{ fontWeight: "bold", fontSize: 14, color: "#1976d2", marginBottom: 6 }}>📋 Complete Your Profile</Text>
                          <Text style={{ color: "#e53935", fontSize: 11, marginBottom: 12, fontWeight: "600" }}>⚠️ Note: You have used {count} of 3 submission attempts.</Text>
                          <Text style={{ color: "#757575", fontSize: 12, marginBottom: 12 }}>Fill all fields and upload documents. Admin will review and approve your profile.</Text>
                          `;

      // For web, let's extract the start of form
      let targetTextCutIdx = content.indexOf(isWeb 
        ? '<View style={[styles.card, { borderLeftWidth: 4, borderLeftColor:"#1976d2"}]}>\r\n                          <Text style={{ fontWeight:"bold", fontSize: 14, color:"#1976d2", marginBottom: 6 }}>Complete Your Profile</Text>'
        : '<View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#1976d2" }]}>\n                          <Text style={{ fontWeight: "bold", fontSize: 14, color: "#1976d2", marginBottom: 6 }}>📋 Complete Your Profile</Text>', startProfileIdx);
        
      if (targetTextCutIdx === -1) {
        targetTextCutIdx = content.indexOf(isWeb 
          ? '<View style={[styles.card, { borderLeftWidth: 4, borderLeftColor:"#1976d2"}]}>\n                          <Text style={{ fontWeight:"bold", fontSize: 14, color:"#1976d2", marginBottom: 6 }}>Complete Your Profile</Text>'
          : '<View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#1976d2" }]}>\r\n                          <Text style={{ fontWeight: "bold", fontSize: 14, color: "#1976d2", marginBottom: 6 }}>📋 Complete Your Profile</Text>', startProfileIdx);
      }

      if (targetTextCutIdx !== -1) {
        const descEndWord = 'approve your profile.</Text>';
        const descEndWordIdx = content.indexOf(descEndWord, targetTextCutIdx);
        if (descEndWordIdx !== -1) {
          const targetToReplace = content.substring(startProfileIdx, descEndWordIdx + descEndWord.length);
          content = content.replace(targetToReplace, replacement);
          console.log(`Successfully replaced profile panel layout in ${filePath}`);
        } else {
          console.log(`Could not find descEndWord in ${filePath}`);
        }
      } else {
        console.log(`Could not find targetTextCutIdx in ${filePath}`);
      }

      // Cleanup leftover duplicate Change Password cards/details blocks that were previously at the bottom
      const afterFormIdx = content.indexOf('})()}', startProfileIdx);
      if (afterFormIdx !== -1) {
        const erpSubEndIdx = content.indexOf(sectionEndMarker, afterFormIdx);
        if (erpSubEndIdx !== -1) {
          const outerCloseViewIdx = content.lastIndexOf('</View>', erpSubEndIdx);
          const leftoverText = content.substring(afterFormIdx + 5, outerCloseViewIdx);
          content = content.replace(leftoverText, '\n                  ');
          console.log(`Cleaned up duplicates in ${filePath}`);
        }
      }
    } else {
      console.log(`Could not find endProfileIdx for sectionEndMarker in ${filePath}`);
    }
  } else {
    console.log(`Could not find startProfileIdx for profileSectionMarker in ${filePath}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

patchFile('web_portal/App.tsx');
patchFile('App.tsx');
