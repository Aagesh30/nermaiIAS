const fs = require('fs');

console.log("Normalizing and patching codebase...");

const mobilePath = 'App.tsx';
const webPath = 'web_portal/App.tsx';

function patchFile(filePath, replacements) {
  console.log(`\n=================== Patching ${filePath} ===================`);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\r\n/g, '\n');

  for (const r of replacements) {
    if (content.indexOf(r.target) === -1) {
      console.error(`ERROR: Target string not found for: "${r.description}"`);
      process.exit(1);
    }
    content = content.split(r.target).join(r.replacement);
    console.log(`- Patched: "${r.description}"`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

// ─────────────────────────────────────────────────────────────────────────────
// A. PATCH MOBILE APP.TSX
// ─────────────────────────────────────────────────────────────────────────────
const mobileReplacements = [
  {
    description: "Add password change state variables",
    target: `  const [password, setPassword] = useState("");`,
    replacement: `  const [password, setPassword] = useState("");
  const [studentOldPassword, setStudentOldPassword] = useState("");
  const [studentNewPassword, setStudentNewPassword] = useState("");`
  },
  {
    description: "Filter announcements for fee clashing",
    target: `  const loadAnnouncements = async () => {
    try {
      const role = user?.role || "guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch || "";
      const res = await api.get(\`/announcement?role=\${role}&batch=\${batch}\`);
      const notices = res || [];
      setAnnouncements(notices);`,
    replacement: `  const loadAnnouncements = async () => {
    try {
      const role = user?.role || "guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch || "";
      const res = await api.get(\`/announcement?role=\${role}&batch=\${batch}\`);
      let notices = res || [];
      if (role === "student") {
        const myStudentName = myStudent ? getStudentName(myStudent) : "";
        const myUsername = user?.username || "";
        const myName = user?.name || "";
        notices = notices.filter((ann: any) => {
          const isFeeAlert = (ann.title || "").includes("Fee Payment Alert") ||
            (ann.content || "").toLowerCase().includes("pay your pending") ||
            (ann.content || "").toLowerCase().includes("pending tuition fee");
          if (!isFeeAlert) return true;
          const lowerTitle = (ann.title || "").toLowerCase();
          const lowerContent = (ann.content || "").toLowerCase();
          const stdNameLower = myStudentName.toLowerCase().trim();
          const usrNameLower = myUsername.toLowerCase().trim();
          const nameLower = myName.toLowerCase().trim();
          return (stdNameLower && (lowerTitle.includes(stdNameLower) || lowerContent.includes(stdNameLower))) ||
                 (usrNameLower && (lowerTitle.includes(usrNameLower) || lowerContent.includes(usrNameLower))) ||
                 (nameLower && (lowerTitle.includes(nameLower) || lowerContent.includes(nameLower)));
        });
      }
      setAnnouncements(notices);`
  },
  {
    description: "Filter notifications for fee clashing",
    target: `  const loadNotifications = async () => {
    try {
      const role = user?.role || "guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch || "";
      const res = await api.get(\`/notification?role=\${role}&batch=\${batch}\`);
      setNotifications(res?.data || res || []);`,
    replacement: `  const loadNotifications = async () => {
    try {
      const role = user?.role || "guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch || "";
      const res = await api.get(\`/notification?role=\${role}&batch=\${batch}\`);
      let notifs = res?.data || res || [];
      if (role === "student") {
        const myStudentName = myStudent ? getStudentName(myStudent) : "";
        const myUsername = user?.username || "";
        const myName = user?.name || "";
        notifs = notifs.filter((n: any) => {
          const isFeeAlert = (n.title || "").includes("Fee Payment Alert") ||
            (n.message || "").toLowerCase().includes("pay your pending") ||
            (n.message || "").toLowerCase().includes("pending tuition fee");
          if (!isFeeAlert) return true;
          const lowerTitle = (n.title || "").toLowerCase();
          const lowerContent = (n.message || "").toLowerCase();
          const stdNameLower = myStudentName.toLowerCase().trim();
          const usrNameLower = myUsername.toLowerCase().trim();
          const nameLower = myName.toLowerCase().trim();
          return (stdNameLower && (lowerTitle.includes(stdNameLower) || lowerContent.includes(stdNameLower))) ||
                 (usrNameLower && (lowerTitle.includes(usrNameLower) || lowerContent.includes(usrNameLower))) ||
                 (nameLower && (lowerTitle.includes(nameLower) || lowerContent.includes(nameLower)));
        });
      }
      setNotifications(notifs);`
  },
  {
    description: "Insert dashboard status warning banner",
    target: `                <>
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Welcome to Nermai IAS Academy</Text>`,
    replacement: `                <>
                  {user.role === "student" && (() => {
                    const hasPending = myProfileRequest && myProfileRequest.status === "pending";
                    const hasRejected = myProfileRequest && myProfileRequest.status === "rejected";
                    const hasNoRequest = !myProfileRequest;
                    if (hasNoRequest) {
                      return (
                        <TouchableOpacity onPress={() => { changeErpSub("my-profile"); setActiveTab("erp"); }} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#c62828", backgroundColor: darkMode ? "#3e1c1c" : "#ffebee" }]}>
                          <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 13 }}>⚠️ ACTION REQUIRED: INCOMPLETE PROFILE</Text>
                          <Text style={{ color: darkMode ? "#e0e0e0" : "#424242", fontSize: 12, marginTop: 4 }}>Your student profile is incomplete. Please go to the "My Profile" tab to complete your details and upload required documents.</Text>
                        </TouchableOpacity>
                      );
                    } else if (hasRejected) {
                      return (
                        <TouchableOpacity onPress={() => { changeErpSub("my-profile"); setActiveTab("erp"); }} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#c62828", backgroundColor: darkMode ? "#3e1c1c" : "#ffebee" }]}>
                          <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 13 }}>❌ ACTION REQUIRED: PROFILE REQUEST REJECTED</Text>
                          <Text style={{ color: darkMode ? "#e0e0e0" : "#424242", fontSize: 12, marginTop: 4 }}>Your profile submission was rejected. Reason: {myProfileRequest.rejectionReason || "Please check submitted documents."}. Click here to resubmit.</Text>
                        </TouchableOpacity>
                      );
                    } else if (hasPending) {
                      return (
                        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#f57c00", backgroundColor: darkMode ? "#3e2723" : "#fff3e0" }]}>
                          <Text style={{ color: "#f57c00", fontWeight: "bold", fontSize: 13 }}>⏳ PROFILE VERIFICATION PENDING</Text>
                          <Text style={{ color: darkMode ? "#e0e0e0" : "#424242", fontSize: 12, marginTop: 4 }}>Your profile completion request has been submitted and is currently pending administrator verification.</Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Welcome to Nermai IAS Academy</Text>`
  },
  {
    description: "Mobile: inject profile details display above Status Banner",
    target: `                    <Text style={styles.sectionTitle}>My Profile</Text>

                    {/* Status Banner */}`,
    replacement: `                    <Text style={styles.sectionTitle}>My Profile</Text>

                    {myProfileRequest && myProfileRequest.status === "approved" && !getLoggedInStudent(user, students)?.profileEditPermission && (() => {
                      const myStudent = getLoggedInStudent(user, students);
                      return (
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
                      );
                    })()}

                    {/* Status Banner */}`
  },
  {
    description: "Mobile: enable profile form if admin grants re-edit permission",
    target: `{(!myProfileRequest || myProfileRequest.status === "rejected") && (() => {`,
    replacement: `{(!myProfileRequest || myProfileRequest.status === "rejected" || getLoggedInStudent(user, students)?.profileEditPermission) && (() => {`
  },
  {
    description: "Mobile: inject password fields at top of Complete Profile form",
    target: `<TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#999" value={profileForm.name} onChangeText={v => setProfileForm({ ...profileForm, name: v })} />`,
    replacement: `<Text style={{ color: "#757575", fontSize: 12, marginBottom: 4, fontWeight: "bold" }}>🔑 Change Account Password *</Text>
                           <TextInput style={[styles.input, { marginBottom: 12 }]} placeholder="Old Password (created by admin) *" secureTextEntry placeholderTextColor="#999" value={studentOldPassword} onChangeText={setStudentOldPassword} />
                           <TextInput style={[styles.input, { marginBottom: 12 }]} placeholder="New Password (modified by student) *" secureTextEntry placeholderTextColor="#999" value={studentNewPassword} onChangeText={setStudentNewPassword} />

                           <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#999" value={profileForm.name} onChangeText={v => setProfileForm({ ...profileForm, name: v })} />`
  },
  {
    description: "Mobile: submitProfileCompletion with password verification",
    target: `  const submitProfileCompletion = async () => {
    const myStudent = getLoggedInStudent(user, students);
    const rawCount = myStudent?.profileSubmitCount;
    const count = typeof rawCount === "number" ? rawCount : (rawCount && typeof rawCount === "object" && typeof (rawCount as any).__increment === "number") ? (rawCount as any).__increment : 0;
    if (count >= 3) {
      Alert.alert("Limit Reached", "You have reached the maximum limit of 3 profile submission attempts. Please contact the administrator directly.");
      return;
    }
    if (!profileForm.name || !profileForm.dob || !profileForm.address) {
      Alert.alert("Error", "Name, Date of Birth and Address are required.");
      return;
    }
    try {
      await api.post("/erp/profile-request", {
        studentId: myStudent?.id || user.studentId || user.userId,
        username: user.username,
        ...profileForm,
        passportPhotoBase64: profileForm.passportPhotoBase64 || "test",
        photoIdBase64: profileForm.photoIdBase64 || "test"
      });
      Alert.alert("Success", "Profile completion request submitted! Admin will review and approve soon.");
      setShowProfileModal(false);
      loadMyProfileRequest(myStudent?.id || user.studentId || user.userId);
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit profile.");
    }
  };`,
    replacement: `  const submitProfileCompletion = async () => {
    const myStudent = getLoggedInStudent(user, students);
    const rawCount = myStudent?.profileSubmitCount;
    const count = typeof rawCount === "number" ? rawCount : (rawCount && typeof rawCount === "object" && typeof (rawCount as any).__increment === "number") ? (rawCount as any).__increment : 0;
    if (count >= 3) {
      Alert.alert("Limit Reached", "You have reached the maximum limit of 3 profile submission attempts. Please contact the administrator directly.");
      return;
    }
    if (!profileForm.name || !profileForm.dob || !profileForm.address || !studentOldPassword || !studentNewPassword) {
      Alert.alert("Error", "All fields marked with * are required. Please also enter old/new passwords to secure your account.");
      return;
    }
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
      await api.post("/erp/profile-request", {
        studentId: myStudent?.id || user.studentId || user.userId,
        username: user.username,
        ...profileForm,
        passportPhotoBase64: profileForm.passportPhotoBase64 || "test",
        photoIdBase64: profileForm.photoIdBase64 || "test"
      });
      Alert.alert("Success", "Profile completion request submitted! Admin will review and approve soon.");
      setShowProfileModal(false);
      setStudentOldPassword("");
      setStudentNewPassword("");
      loadMyProfileRequest(myStudent?.id || user.studentId || user.userId);
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit profile.");
    }
  };`
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// B. PATCH WEB PORTAL APP.TSX
// ─────────────────────────────────────────────────────────────────────────────
const webReplacements = [
  {
    description: "SACS sub-tabs ternary layout bugfix",
    target: `                          )}
                        </View>
                      ) : (
                        // PERMANENT GRANTS`,
    replacement: `                          )}
                        </View>
                      ) : sacsSub === "permanent" ? (
                        // PERMANENT GRANTS`
  },
  {
    description: "Add password, validation, and test-portal state variables",
    target: `  const [password, setPassword] = useState("");`,
    replacement: `  const [password, setPassword] = useState("");
  const [studentOldPassword, setStudentOldPassword] = useState("");
  const [studentNewPassword, setStudentNewPassword] = useState("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [resultsSubjectFilter, setResultsSubjectFilter] = useState("");
  const [resultsTopicFilter, setResultsTopicFilter] = useState("");
  const [knownSubjects, setKnownSubjects] = useState<string[]>([]);
  const [knownTopics, setKnownTopics] = useState<Record<string, string[]>>({});
  const [showManualSubjectDropdown, setShowManualSubjectDropdown] = useState(false);
  const [showManualTopicDropdown, setShowManualTopicDropdown] = useState(false);
  const [showPdfSubjectDropdown, setShowPdfSubjectDropdown] = useState(false);
  const [showPdfTopicDropdown, setShowPdfTopicDropdown] = useState(false);`
  },
  {
    description: "Add testType/subject/topic to newPdfTest state",
    target: `return { title:"", startTime: startStr, endTime: endStr, marksPerQ:"", negMarks:"", unattendedMarks:"", totalMarks:"", targetAudience:"", targetBatch:"", requireFeedback: false };`,
    replacement: `return { title:"", startTime: startStr, endTime: endStr, marksPerQ:"", negMarks:"", unattendedMarks:"", totalMarks:"", targetAudience:"", targetBatch:"", requireFeedback: false, testType:"mock", subject:"", topic:"" };`
  },
  {
    description: "Add testType/subject/topic to newTest state",
    target: `return { title:"", description:"", duration:"", passingMarks:"", startTime: startStr, endTime: endStr, selectedQIds: [] as string[], targetAudience:"", targetBatch:"", requireFeedback: false };`,
    replacement: `return { title:"", description:"", duration:"", passingMarks:"", startTime: startStr, endTime: endStr, selectedQIds: [] as string[], targetAudience:"", targetBatch:"", requireFeedback: false, testType:"mock", subject:"", topic:"" };`
  },
  {
    description: "Filter announcements for fee clashing",
    target: `  const loadAnnouncements = async () => {
    try {
      const role = user?.role ||"guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch ||"";
      const res = await api.get(\`/announcement?role=\${role}&batch=\${batch}\`);
      const notices = res || [];
      setAnnouncements(notices);`,
    replacement: `  const loadAnnouncements = async () => {
    try {
      const role = user?.role || "guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch || "";
      const res = await api.get(\`/announcement?role=\${role}&batch=\${batch}\`);
      let notices = res || [];
      if (role === "student") {
        const myStudentName = myStudent ? getStudentName(myStudent) : "";
        const myUsername = user?.username || "";
        const myName = user?.name || "";
        notices = notices.filter((ann: any) => {
          const isFeeAlert = (ann.title || "").includes("Fee Payment Alert") ||
            (ann.content || "").toLowerCase().includes("pay your pending") ||
            (ann.content || "").toLowerCase().includes("pending tuition fee");
          if (!isFeeAlert) return true;
          const lowerTitle = (ann.title || "").toLowerCase();
          const lowerContent = (ann.content || "").toLowerCase();
          const stdNameLower = myStudentName.toLowerCase().trim();
          const usrNameLower = myUsername.toLowerCase().trim();
          const nameLower = myName.toLowerCase().trim();
          return (stdNameLower && (lowerTitle.includes(stdNameLower) || lowerContent.includes(stdNameLower))) ||
                 (usrNameLower && (lowerTitle.includes(usrNameLower) || lowerContent.includes(usrNameLower))) ||
                 (nameLower && (lowerTitle.includes(nameLower) || lowerContent.includes(nameLower)));
        });
      }
      setAnnouncements(notices);`
  },
  {
    description: "Filter notifications for fee clashing",
    target: `  const loadNotifications = async () => {
    try {
      const role = user?.role ||"guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch ||"";
      const res = await api.get(\`/notification?role=\${role}&batch=\${batch}\`);
      setNotifications(res?.data || res || []);`,
    replacement: `  const loadNotifications = async () => {
    try {
      const role = user?.role || "guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch || "";
      const res = await api.get(\`/notification?role=\${role}&batch=\${batch}\`);
      let notifs = res?.data || res || [];
      if (role === "student") {
        const myStudentName = myStudent ? getStudentName(myStudent) : "";
        const myUsername = user?.username || "";
        const myName = user?.name || "";
        notifs = notifs.filter((n: any) => {
          const isFeeAlert = (n.title || "").includes("Fee Payment Alert") ||
            (n.message || "").toLowerCase().includes("pay your pending") ||
            (n.message || "").toLowerCase().includes("pending tuition fee");
          if (!isFeeAlert) return true;
          const lowerTitle = (n.title || "").toLowerCase();
          const lowerContent = (n.message || "").toLowerCase();
          const stdNameLower = myStudentName.toLowerCase().trim();
          const usrNameLower = myUsername.toLowerCase().trim();
          const nameLower = myName.toLowerCase().trim();
          return (stdNameLower && (lowerTitle.includes(stdNameLower) || lowerContent.includes(stdNameLower))) ||
                 (usrNameLower && (lowerTitle.includes(usrNameLower) || lowerContent.includes(usrNameLower))) ||
                 (nameLower && (lowerTitle.includes(nameLower) || lowerContent.includes(nameLower)));
        });
      }
      setNotifications(notifs);`
  },
  {
    description: "Initialize new profileForm state fields",
    target: `  const [profileForm, setProfileForm] = useState({ name:"", dob:"", bloodGroup:"", address:"", gender:"", community:"", fatherName:"", occupation:"", altPhone:"", email:"", qualification:"", college:"", referralSource:"", passportPhotoBase64:"", photoIdBase64:"", photoIdType:"", photoIdConfirmed: false });`,
    replacement: `  const [profileForm, setProfileForm] = useState({ name:"", initial:"", dob:"", bloodGroup:"", address:"", gender:"", community:"", fatherName:"", occupation:"", studentOccupation:"", altPhone:"", email:"", qualification:"", college:"", referralSource:"", passportPhotoBase64:"", photoIdBase64:"", photoIdType:"", photoIdConfirmed: false, horizontalReservation:"", constituency:"", constituencyOthers:"" });`
  },
  {
    description: "Add password + field validation to submitProfileCompletion",
    target: `    if (!profileForm.name || !profileForm.dob || !profileForm.address) {
      Alert.alert("Error","Name, Date of Birth and Address are required.");
      return;
    }`,
    replacement: `    if (!profileForm.name || !profileForm.initial || !profileForm.dob || !profileForm.address ||
        !profileForm.gender || !profileForm.community || !profileForm.fatherName || !profileForm.occupation ||
        !profileForm.studentOccupation || !profileForm.altPhone || !profileForm.email ||
        !profileForm.qualification || !profileForm.college || !profileForm.referralSource ||
        !(profileForm.constituency === "Others" ? profileForm.constituencyOthers : profileForm.constituency) ||
        !studentOldPassword || !studentNewPassword) {
      setShowValidationErrors(true);
      Alert.alert("Error", "All fields marked with * are required (including old/new passwords).");
      return;
    }`
  },
  {
    description: "Incorporate constituency override in profile post request",
    target: `                ...profileForm,`,
    replacement: `                ...profileForm,
                constituency: profileForm.constituency === "Others" ? profileForm.constituencyOthers : profileForm.constituency,`
  },
  {
    description: "Expand profileForm reset after submission",
    target: `              setProfileForm({ name:"", dob:"", bloodGroup:"", address:"", gender:"", community:"", fatherName:"", occupation:"", altPhone:"", email:"", qualification:"", college:"", referralSource:"", passportPhotoBase64:"", photoIdBase64:"", photoIdType:"", photoIdConfirmed: false });`,
    replacement: `              setProfileForm({ name:"", initial:"", dob:"", bloodGroup:"", address:"", gender:"", community:"", fatherName:"", occupation:"", studentOccupation:"", altPhone:"", email:"", qualification:"", college:"", referralSource:"", passportPhotoBase64:"", photoIdBase64:"", photoIdType:"", photoIdConfirmed: false, horizontalReservation:"", constituency:"", constituencyOthers:"" });
              setStudentOldPassword("");
              setStudentNewPassword("");
              setShowValidationErrors(false);`
  },
  {
    description: "Add testType/subject/topic to createTestFromExtraction payload",
    target: `        targetAudience: newPdfTest.targetAudience ||"all",
        targetBatch: newPdfTest.targetAudience ==="batch"? newPdfTest.targetBatch ||"":"",
        requireFeedback: newPdfTest.requireFeedback
      });
      Alert.alert("Success","Test created from extracted questions!");`,
    replacement: `        targetAudience: newPdfTest.targetAudience ||"all",
        targetBatch: newPdfTest.targetAudience ==="batch"? newPdfTest.targetBatch ||"":"",
        requireFeedback: newPdfTest.requireFeedback,
        testType: newPdfTest.testType || "mock",
        subject: newPdfTest.subject || "",
        topic: newPdfTest.topic || ""
      });
      if (newPdfTest.subject) {
        setKnownSubjects(prev => prev.includes(newPdfTest.subject) ? prev : [...prev, newPdfTest.subject]);
        if (newPdfTest.topic) {
          setKnownTopics(prev => ({ ...prev, [newPdfTest.subject]: [...new Set([...(prev[newPdfTest.subject] || []), newPdfTest.topic])] }));
        }
      }
      Alert.alert("Success","Test created from extracted questions!");`
  },
  {
    description: "Reset newPdfTest including testType/subject/topic",
    target: `      setNewPdfTest({ title:"", startTime: startStr, endTime: endStr, marksPerQ:"", negMarks:"", unattendedMarks:"", totalMarks:"", targetAudience:"", targetBatch:"", requireFeedback: false });`,
    replacement: `      setNewPdfTest({ title:"", startTime: startStr, endTime: endStr, marksPerQ:"", negMarks:"", unattendedMarks:"", totalMarks:"", targetAudience:"", targetBatch:"", requireFeedback: false, testType:"mock", subject:"", topic:"" });`
  },
  {
    description: "Add testType/subject/topic to saveTestDefinition payload",
    target: `        targetAudience: newTest.targetAudience ||"all",
        targetBatch: newTest.targetAudience ==="batch"? newTest.targetBatch ||"":"",
        requireFeedback: newTest.requireFeedback
      });
      Alert.alert("Success","Mock Test created & published!");`,
    replacement: `        targetAudience: newTest.targetAudience ||"all",
        targetBatch: newTest.targetAudience ==="batch"? newTest.targetBatch ||"":"",
        requireFeedback: newTest.requireFeedback,
        testType: newTest.testType || "mock",
        subject: newTest.subject || "",
        topic: newTest.topic || ""
      });
      if (newTest.subject) {
        setKnownSubjects(prev => prev.includes(newTest.subject) ? prev : [...prev, newTest.subject]);
        if (newTest.topic) {
          setKnownTopics(prev => ({ ...prev, [newTest.subject]: [...new Set([...(prev[newTest.subject] || []), newTest.topic])] }));
        }
      }
      Alert.alert("Success","Mock Test created & published!");`
  },
  {
    description: "Reset newTest including testType/subject/topic",
    target: `      setNewTest({ title:"", description:"", duration:"", passingMarks:"", startTime:"", endTime:"", selectedQIds: [], targetAudience:"", targetBatch:"", requireFeedback: false });`,
    replacement: `      setNewTest({ title:"", description:"", duration:"", passingMarks:"", startTime:"", endTime:"", selectedQIds: [], targetAudience:"", targetBatch:"", requireFeedback: false, testType:"mock", subject:"", topic:"" });`
  },
  {
    description: "Insert dashboard status warning banner",
    target: `                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Welcome to Nermai IAS Academy</Text>`,
    replacement: `                  {user.role === "student" && (() => {
                    const hasPending = myProfileRequest && myProfileRequest.status === "pending";
                    const hasRejected = myProfileRequest && myProfileRequest.status === "rejected";
                    const hasNoRequest = !myProfileRequest;
                    if (hasNoRequest) {
                      return (
                        <TouchableOpacity onPress={() => { changeErpSub("my-profile"); setActiveTab("erp"); }} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#c62828", backgroundColor: darkMode ? "#3e1c1c" : "#ffebee", cursor: "pointer" }]}>
                          <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 13 }}>⚠️ ACTION REQUIRED: INCOMPLETE PROFILE</Text>
                          <Text style={{ color: darkMode ? "#e0e0e0" : "#424242", fontSize: 12, marginTop: 4 }}>Your student profile is incomplete. Please go to the "My Profile" tab to complete your details and upload required documents.</Text>
                        </TouchableOpacity>
                      );
                    } else if (hasRejected) {
                      return (
                        <TouchableOpacity onPress={() => { changeErpSub("my-profile"); setActiveTab("erp"); }} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#c62828", backgroundColor: darkMode ? "#3e1c1c" : "#ffebee", cursor: "pointer" }]}>
                          <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 13 }}>❌ ACTION REQUIRED: PROFILE REQUEST REJECTED</Text>
                          <Text style={{ color: darkMode ? "#e0e0e0" : "#424242", fontSize: 12, marginTop: 4 }}>Profile submission was rejected. Reason: {myProfileRequest.rejectionReason || "Please check submitted documents."}. Click here to resubmit.</Text>
                        </TouchableOpacity>
                      );
                    } else if (hasPending) {
                      return (
                        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#f57c00", backgroundColor: darkMode ? "#3e2723" : "#fff3e0" }]}>
                          <Text style={{ color: "#f57c00", fontWeight: "bold", fontSize: 13 }}>⏳ PROFILE VERIFICATION PENDING</Text>
                          <Text style={{ color: darkMode ? "#e0e0e0" : "#424242", fontSize: 12, marginTop: 4 }}>Your profile details have been submitted and are currently awaiting administrator verification.</Text>
                        </View>
                      );
                    }
                    return null;
                  })()}
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Welcome to Nermai IAS Academy</Text>`
  },
  {
    description: "Web: inject profile details display above Status Banner",
    target: `                    <Text style={styles.sectionTitle}>My Profile</Text>

                    {/* Status Banner */}`,
    replacement: `                    <Text style={styles.sectionTitle}>My Profile</Text>

                    {myProfileRequest && myProfileRequest.status ==="approved"&& !getLoggedInStudent(user, students)?.profileEditPermission && (() => {
                      const myStudent = getLoggedInStudent(user, students);
                      return (
                        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor:"#4caf50"}]}>
                          <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>My Profile Details</Text>
                          <View style={{ gap: 8 }}>
                            {[
                              { label:"Full Name", value: myStudent?.name || myProfileRequest.name },
                              { label:"Initial", value: myStudent?.initial || myProfileRequest.initial ||"—" },
                              { label:"Date of Birth", value: formatDobForDisplay(myStudent?.dateOfBirth || myStudent?.dob || myProfileRequest.dob) },
                              { label:"Blood Group", value: myStudent?.bloodGroup || myProfileRequest.bloodGroup ||"—" },
                              { label:"Gender", value: myStudent?.gender || myProfileRequest.gender ||"—" },
                              { label:"Community", value: myStudent?.community || myProfileRequest.community ||"—" },
                              { label:"Father's Name", value: myStudent?.fatherName || myProfileRequest.fatherName ||"—" },
                              { label:"Special Category Quota", value: myStudent?.horizontalReservation || myProfileRequest.horizontalReservation ||"None" },
                              { label:"Constituency", value: myStudent?.constituency || myProfileRequest.constituency ||"—" },
                              { label:"Address", value: myStudent?.address || myProfileRequest.address ||"—" }
                            ].map((item, idx) => (
                              <View key={idx} style={{ flexDirection:"row", borderBottomWidth: 1, borderBottomColor: darkMode ?"#333":"#f0f0f0", paddingBottom: 6 }}>
                                <Text style={{ flex: 1.5, fontWeight:"bold", color: darkMode ?"#bbb":"#616161", fontSize: 12 }}>{item.label}</Text>
                                <Text style={{ flex: 2.5, color: darkMode ?"#fff":"#212121", fontSize: 12 }}>{item.value}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })()}

                    {/* Status Banner */}`
  },
  {
    description: "Web: enable profile form if admin grants re-edit permission",
    target: `{(!myProfileRequest || myProfileRequest.status ===\"rejected\") && (() => {`,
    replacement: `{(!myProfileRequest || myProfileRequest.status ===\"rejected\" || getLoggedInStudent(user, students)?.profileEditPermission) && (() => {`
  },
  {
    description: "Web form: prepend password inputs and add Initial field",
    target: `                          <TextInput style={styles.input} placeholder=\"Full Name *\"placeholderTextColor=\"#999\"value={profileForm.name} onChangeText={v => setProfileForm({ ...profileForm, name: v })} />`,
    replacement: `                          <Text style={{ color:"#757575", fontSize: 12, marginBottom: 4, fontWeight:"bold"}}>🔑 Change Account Password *</Text>
                          <TextInput style={[styles.input, { marginBottom: 12 }, showValidationErrors && !studentOldPassword && { borderColor:"#c62828", borderWidth: 2 }]} placeholder="Old Password (created by admin) *" secureTextEntry placeholderTextColor="#999" value={studentOldPassword} onChangeText={setStudentOldPassword} />
                          <TextInput style={[styles.input, { marginBottom: 12 }, showValidationErrors && !studentNewPassword && { borderColor:"#c62828", borderWidth: 2 }]} placeholder="New Password (modified by student) *" secureTextEntry placeholderTextColor="#999" value={studentNewPassword} onChangeText={setStudentNewPassword} />

                          <TextInput style={styles.input} placeholder="Full Name *"placeholderTextColor="#999"value={profileForm.name} onChangeText={v => setProfileForm({ ...profileForm, name: v })} />
                          <TextInput style={[styles.input, { marginBottom: 12 }, showValidationErrors && !profileForm.initial && { borderColor:"#c62828", borderWidth: 2 }]} placeholder="Initial *" placeholderTextColor="#999" maxLength={3} value={profileForm.initial} onChangeText={v => setProfileForm({ ...profileForm, initial: v })} />`
  },
  {
    description: "Web form: add Student Occupation below Father Occupation",
    target: `value={profileForm.occupation} onChangeText={v => setProfileForm({ ...profileForm, occupation: v })} />`,
    replacement: `value={profileForm.occupation} onChangeText={v => setProfileForm({ ...profileForm, occupation: v })} />
                          <TextInput style={[styles.input, { marginBottom: 12 }, showValidationErrors && !profileForm.studentOccupation && { borderColor:"#c62828", borderWidth: 2 }]} placeholder="Student's Occupation *" placeholderTextColor="#999" value={profileForm.studentOccupation} onChangeText={v => setProfileForm({ ...profileForm, studentOccupation: v })} />`
  },
  {
    description: "Web form: community selector with Record<string,string> type",
    target: `                          <Text style={{ color:"#757575", fontSize: 12, marginBottom: 6, fontWeight:"bold"}}> Community</Text>
                          <View style={{ flexDirection:"row", flexWrap:"wrap", gap: 8, marginBottom: 10 }}>
                            {["SC","ST","OBC","MBC","GENERAL"].map(c => (
                              <TouchableOpacity key={c} onPress={() => setProfileForm({ ...profileForm, community: c })} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 2, borderColor: profileForm.community === c ?"#c62828":"#e0e0e0", backgroundColor: profileForm.community === c ?"#ffebee":"#f9f9f9"}}>
                                <Text style={{ fontSize: 12, color: profileForm.community === c ?"#c62828":"#757575", fontWeight: profileForm.community === c ?"bold":"normal"}}>{c}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>`,
    replacement: `                          <Text style={{ color:"#757575", fontSize: 12, marginBottom: 6, fontWeight:"bold"}}>Community *</Text>
                          <View style={{ flexDirection:"row", flexWrap:"wrap", gap: 8, marginBottom: 10 }}>
                            {["SC","ST","OBC","MBC","GENERAL"].map(c => {
                              const fullForms: Record<string, string> = { "SC":"Scheduled Caste","ST":"Scheduled Tribe","OBC":"Other Backward Class","MBC":"Most Backward Class","GENERAL":"General Category (Unreserved)" };
                              return (
                                <TouchableOpacity key={c} onPress={() => setProfileForm({ ...profileForm, community: c })} onLongPress={() => Alert.alert(c, fullForms[c] || c)} delayLongPress={300} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 2, borderColor: profileForm.community === c ?"#c62828":"#e0e0e0", backgroundColor: profileForm.community === c ?"#ffebee":"#f9f9f9"}}>
                                  <Text style={{ fontSize: 12, color: profileForm.community === c ?"#c62828":"#757575", fontWeight: profileForm.community === c ?"bold":"normal"}}>{c}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>`
  },
  {
    description: "Web form: special category (no Destitute Widow) + 30 constituency pills",
    target: `                          {/* Father's Name & Occupation */}`,
    replacement: `                          {/* Special Category Reservation */}
                          <Text style={{ color:"#757575", fontSize: 12, marginBottom: 6, marginTop: 10, fontWeight:"bold"}}>Special Category Reservation (Optional)</Text>
                          <View style={{ flexDirection:"row", flexWrap:"wrap", gap: 8, marginBottom: 10 }}>
                            {["None","PwBD","Ex-Servicemen","Sports Person"].map(sc => (
                              <TouchableOpacity key={sc} onPress={() => setProfileForm({ ...profileForm, horizontalReservation: sc ==="None" ?"": sc })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 2, borderColor: (sc ==="None" ? !profileForm.horizontalReservation : profileForm.horizontalReservation === sc) ?"#c62828":"#e0e0e0", backgroundColor: (sc ==="None" ? !profileForm.horizontalReservation : profileForm.horizontalReservation === sc) ?"#ffebee":"#f9f9f9"}}>
                                <Text style={{ color: (sc ==="None" ? !profileForm.horizontalReservation : profileForm.horizontalReservation === sc) ?"#c62828":"#757575", fontWeight: (sc ==="None" ? !profileForm.horizontalReservation : profileForm.horizontalReservation === sc) ?"bold":"normal", fontSize: 12 }}>{sc ==="PwBD" ?"PwBD (Persons with Benchmark Disabilities)": sc}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {/* Constituency */}
                          <Text style={{ color:"#757575", fontSize: 12, marginBottom: 6, marginTop: 10, fontWeight:"bold"}}>Constituency *</Text>
                          <View style={{ flexDirection:"row", flexWrap:"wrap", gap: 8, marginBottom: 10 }}>
                            {["Ariankuppam","Bahour","Embalam","Indira Nagar","Kadirkamam","Kalapet","Kamaraj Nagar","Karaikal North","Karaikal South","Lawspet","Mahe","Manavely","Mangalam","Mannadipet","Mudaliarpet","Muthialpet","Nedungadu","Nellithope","Neravy T. R. Pattinam","Nettapakkam","Orleampeth","Ossudu","Oupalam","Ozhukarai","Raj Bhavan","Thattanchavady","Thirubuvanai","Thirunallar","Villianur","Yanam","Others"].map(c => (
                              <TouchableOpacity key={c} onPress={() => setProfileForm({ ...profileForm, constituency: c })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 2, borderColor: profileForm.constituency === c ?"#c62828":"#e0e0e0", backgroundColor: profileForm.constituency === c ?"#ffebee":"#f9f9f9"}}>
                                <Text style={{ color: profileForm.constituency === c ?"#c62828":"#757575", fontWeight: profileForm.constituency === c ?"bold":"normal", fontSize: 12 }}>{c}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          {profileForm.constituency ==="Others" && (
                            <TextInput style={[styles.input, { marginBottom: 12 }, showValidationErrors && !profileForm.constituencyOthers && { borderColor:"#c62828", borderWidth: 2 }]} placeholder="Specify Constituency *" placeholderTextColor="#999" value={profileForm.constituencyOthers} onChangeText={v => setProfileForm({ ...profileForm, constituencyOthers: v })} />
                          )}

                          {/* Father's Name & Occupation */}`
  },
  {
    description: "Web: inject password verification before profile submission",
    target: `          onPress: async () => {
            try {
              const compressedPassport = await compressImageBase64(profileForm.passportPhotoBase64);`,
    replacement: `          onPress: async () => {
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
              const compressedPassport = await compressImageBase64(profileForm.passportPhotoBase64);`
  },
  {
    description: "Candidate directory view details modal expansion",
    target: `                                      <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: darkMode ?"#444":"#eeeeee", paddingTop: 10 }}>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Roll Number:</Text> {s.rollNumber ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Course:</Text> {s.course ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Email:</Text> {s.email ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Phone:</Text> {s.phone ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>DOB:</Text> {formatDobForDisplay(s.dateOfBirth || s.dob)}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Blood Group:</Text> {s.bloodGroup ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Address:</Text> {s.address ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Approved Date:</Text> {s.approvedAt ? new Date(s.approvedAt).toLocaleString() :"Pending"}</Text>
                                      </View>`,
    replacement: `<View style={{ gap: 8, borderTopWidth: 1, borderTopColor: darkMode ?"#444":"#eeeeee", paddingTop: 10 }}>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Roll Number:</Text> {s.rollNumber ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Login:</Text> Username: <Text style={{fontWeight:"bold"}}>{s.loginUsername || s.rollNumber ||"N/A"}</Text> | Password: <Text style={{fontWeight:"bold", color:"#c62828"}}>{s.loginPassword ||"N/A"}</Text></Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Initial:</Text> {s.initial ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Course:</Text> {s.course ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Email:</Text> {s.email ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Phone:</Text> {s.phone ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>DOB:</Text> {formatDobForDisplay(s.dateOfBirth || s.dob)}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Blood Group:</Text> {s.bloodGroup ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Gender:</Text> {s.gender ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Community:</Text> {s.community ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Father's Name:</Text> {s.fatherName ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Occupation:</Text> {s.occupation ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Student Occupation:</Text> {s.studentOccupation ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Alt Phone:</Text> {s.altPhone ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Qualification:</Text> {s.qualification ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>College:</Text> {s.college ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Special Category:</Text> {s.horizontalReservation ||"None"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Constituency:</Text> {s.constituency ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Address:</Text> {s.address ||"N/A"}</Text>
                                        <Text style={{ fontSize: 13, color: darkMode ?"#ccc":"#555"}}><Text style={{ fontWeight:"bold", color: darkMode ?"#fff":"#212121"}}>Approved Date:</Text> {s.approvedAt ? new Date(s.approvedAt).toLocaleString() :"Pending"}</Text>
                                      </View>`
  },
  {
    description: "SACS standard HTML select input paddingHorizontal fix",
    target: `                                  height: 28, borderRadius: 4, paddingHorizontal: 4,`,
    replacement: `                                  height: 28, borderRadius: 4, paddingLeft: 4, paddingRight: 4,`
  },
  {
    description: "SACS curriculum selection container border styling fix",
    target: `border: "1px solid " + (darkMode ? "#444" : "#eee")`,
    replacement: `borderWidth: 1, borderColor: (darkMode ? "#444" : "#eee")`
  },
  // ─── TEST PORTAL NEW FEATURES ─────────────────────────────────────────────
  {
    description: "Manual test form: add Test Category + Subject + Topic fields",
    target: `<TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Test Title"placeholderTextColor="#999"value={newTest.title} onChangeText={t => setNewTest({ ...newTest, title: t })} />

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Test Description:</Text>`,
    replacement: `<TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Test Title"placeholderTextColor="#999"value={newTest.title} onChangeText={t => setNewTest({ ...newTest, title: t })} />

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Test Category:</Text>
                  <View style={{ flexDirection:"row", gap: 6, marginBottom: 15 }}>
                    {[{ label:"📅 Daily Test", value:"daily"}, { label:"📆 Weekly Test", value:"weekly"}, { label:"🏆 Mock Test", value:"mock"}].map(cat => (
                      <TouchableOpacity key={cat.value} onPress={() => setNewTest({ ...newTest, testType: cat.value })} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: (newTest.testType ||"mock") === cat.value ?"#c62828": (darkMode ?"#2a2a2a":"#f5f5f5"), borderWidth: 1, borderColor: (newTest.testType ||"mock") === cat.value ?"#c62828": (darkMode ?"#444":"#e0e0e0"), alignItems:"center"}}>
                        <Text style={{ fontSize: 11, fontWeight:"bold", color: (newTest.testType ||"mock") === cat.value ?"#fff": (darkMode ?"#aaa":"#555")}}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Subject Name:</Text>
                  <TextInput style={[styles.input, darkMode && styles.inputDark, { marginBottom: 4 }]} placeholder="e.g. Polity, History, Economics..." placeholderTextColor="#999" value={newTest.subject} onChangeText={v => { setNewTest({ ...newTest, subject: v, topic:"" }); setShowManualSubjectDropdown(true); }} onFocus={() => setShowManualSubjectDropdown(true)} onBlur={() => setTimeout(() => setShowManualSubjectDropdown(false), 200)} />
                  {showManualSubjectDropdown && knownSubjects.filter(s => s.toLowerCase().includes((newTest.subject ||"").toLowerCase())).length > 0 && (
                    <View style={{ borderWidth: 1, borderColor: darkMode ?"#444":"#ccc", borderRadius: 8, backgroundColor: darkMode ?"#222":"#fff", maxHeight: 120, marginBottom: 8, overflow:"hidden"}}>
                      <ScrollView nestedScrollEnabled>
                        {knownSubjects.filter(s => s.toLowerCase().includes((newTest.subject ||"").toLowerCase())).map(s => (
                          <TouchableOpacity key={s} onPress={() => { setNewTest({ ...newTest, subject: s, topic:"" }); setShowManualSubjectDropdown(false); }} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: darkMode ?"#333":"#f0f0f0"}}>
                            <Text style={{ color: darkMode ?"#fff":"#212121", fontSize: 12 }}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Sub-Topic:</Text>
                  <TextInput style={[styles.input, darkMode && styles.inputDark, { marginBottom: 4 }]} placeholder="e.g. Parliament, Mughal Period, GDP..." placeholderTextColor="#999" value={newTest.topic} onChangeText={v => { setNewTest({ ...newTest, topic: v }); setShowManualTopicDropdown(true); }} onFocus={() => setShowManualTopicDropdown(true)} onBlur={() => setTimeout(() => setShowManualTopicDropdown(false), 200)} />
                  {showManualTopicDropdown && (knownTopics[newTest.subject] ||[]).filter(t => t.toLowerCase().includes((newTest.topic ||"").toLowerCase())).length > 0 && (
                    <View style={{ borderWidth: 1, borderColor: darkMode ?"#444":"#ccc", borderRadius: 8, backgroundColor: darkMode ?"#222":"#fff", maxHeight: 120, marginBottom: 15, overflow:"hidden"}}>
                      <ScrollView nestedScrollEnabled>
                        {(knownTopics[newTest.subject] ||[]).filter(t => t.toLowerCase().includes((newTest.topic ||"").toLowerCase())).map(t => (
                          <TouchableOpacity key={t} onPress={() => { setNewTest({ ...newTest, topic: t }); setShowManualTopicDropdown(false); }} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: darkMode ?"#333":"#f0f0f0"}}>
                            <Text style={{ color: darkMode ?"#fff":"#212121", fontSize: 12 }}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Test Description:</Text>`
  },
  {
    description: "AI PDF form: add Test Category + Subject + Topic fields",
    target: `                    value={newPdfTest.title}
                    onChangeText={v => setNewPdfTest({ ...newPdfTest, title: v })}
                  />

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Extraction Mode:</Text>`,
    replacement: `                    value={newPdfTest.title}
                    onChangeText={v => setNewPdfTest({ ...newPdfTest, title: v })}
                  />

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Test Category:</Text>
                  <View style={{ flexDirection:"row", gap: 6, marginBottom: 15 }}>
                    {[{ label:"📅 Daily Test", value:"daily"}, { label:"📆 Weekly Test", value:"weekly"}, { label:"🏆 Mock Test", value:"mock"}].map(cat => (
                      <TouchableOpacity key={cat.value} onPress={() => setNewPdfTest({ ...newPdfTest, testType: cat.value })} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: (newPdfTest.testType ||"mock") === cat.value ?"#c62828": (darkMode ?"#2a2a2a":"#f5f5f5"), borderWidth: 1, borderColor: (newPdfTest.testType ||"mock") === cat.value ?"#c62828": (darkMode ?"#444":"#e0e0e0"), alignItems:"center"}}>
                        <Text style={{ fontSize: 11, fontWeight:"bold", color: (newPdfTest.testType ||"mock") === cat.value ?"#fff": (darkMode ?"#aaa":"#555")}}>{cat.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Subject Name:</Text>
                  <TextInput style={[styles.input, darkMode && styles.inputDark, { marginBottom: 4 }]} placeholder="e.g. Polity, History, Economics..." placeholderTextColor="#999" value={newPdfTest.subject} onChangeText={v => { setNewPdfTest({ ...newPdfTest, subject: v, topic:"" }); setShowPdfSubjectDropdown(true); }} onFocus={() => setShowPdfSubjectDropdown(true)} onBlur={() => setTimeout(() => setShowPdfSubjectDropdown(false), 200)} />
                  {showPdfSubjectDropdown && knownSubjects.filter(s => s.toLowerCase().includes((newPdfTest.subject ||"").toLowerCase())).length > 0 && (
                    <View style={{ borderWidth: 1, borderColor: darkMode ?"#444":"#ccc", borderRadius: 8, backgroundColor: darkMode ?"#222":"#fff", maxHeight: 120, marginBottom: 8, overflow:"hidden"}}>
                      <ScrollView nestedScrollEnabled>
                        {knownSubjects.filter(s => s.toLowerCase().includes((newPdfTest.subject ||"").toLowerCase())).map(s => (
                          <TouchableOpacity key={s} onPress={() => { setNewPdfTest({ ...newPdfTest, subject: s, topic:"" }); setShowPdfSubjectDropdown(false); }} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: darkMode ?"#333":"#f0f0f0"}}>
                            <Text style={{ color: darkMode ?"#fff":"#212121", fontSize: 12 }}>{s}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Sub-Topic:</Text>
                  <TextInput style={[styles.input, darkMode && styles.inputDark, { marginBottom: 4 }]} placeholder="e.g. Parliament, Mughal Period, GDP..." placeholderTextColor="#999" value={newPdfTest.topic} onChangeText={v => { setNewPdfTest({ ...newPdfTest, topic: v }); setShowPdfTopicDropdown(true); }} onFocus={() => setShowPdfTopicDropdown(true)} onBlur={() => setTimeout(() => setShowPdfTopicDropdown(false), 200)} />
                  {showPdfTopicDropdown && (knownTopics[newPdfTest.subject] ||[]).filter(t => t.toLowerCase().includes((newPdfTest.topic ||"").toLowerCase())).length > 0 && (
                    <View style={{ borderWidth: 1, borderColor: darkMode ?"#444":"#ccc", borderRadius: 8, backgroundColor: darkMode ?"#222":"#fff", maxHeight: 120, marginBottom: 15, overflow:"hidden"}}>
                      <ScrollView nestedScrollEnabled>
                        {(knownTopics[newPdfTest.subject] ||[]).filter(t => t.toLowerCase().includes((newPdfTest.topic ||"").toLowerCase())).map(t => (
                          <TouchableOpacity key={t} onPress={() => { setNewPdfTest({ ...newPdfTest, topic: t }); setShowPdfTopicDropdown(false); }} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: darkMode ?"#333":"#f0f0f0"}}>
                            <Text style={{ color: darkMode ?"#fff":"#212121", fontSize: 12 }}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Extraction Mode:</Text>`
  },
  {
    description: "Results: add filteredResults + uniqueSubjects computation inside IIFE",
    target: `              const closedTests = tests.filter((t: any) => {
                const endMs = t.endTime ? new Date(t.endTime).getTime() : null;
                return endMs && now > endMs;
              });`,
    replacement: `              const closedTests = tests.filter((t: any) => {
                const endMs = t.endTime ? new Date(t.endTime).getTime() : null;
                return endMs && now > endMs;
              });
              const uniqueSubjects = [...new Set(allTestResults.filter((t: any) => t.subject).map((t: any) => String(t.subject)))] as string[];
              const topicsForSubject = resultsSubjectFilter
                ? ([...new Set(allTestResults.filter((t: any) => t.subject === resultsSubjectFilter && t.topic).map((t: any) => String(t.topic)))] as string[])
                : [];
              const filteredResults = allTestResults.filter((testLog: any) => {
                if (resultsSubjectFilter && testLog.subject !== resultsSubjectFilter) return false;
                if (resultsTopicFilter && testLog.topic !== resultsTopicFilter) return false;
                return true;
              });`
  },
  {
    description: "Results: use filteredResults in empty state check",
    target: `                  {allTestResults.length === 0 && !resultsLoading && (`,
    replacement: `                  {filteredResults.length === 0 && !resultsLoading && (`
  },
  {
    description: "Results: use filteredResults in results map",
    target: `                  {allTestResults.map((testLog: any) => (`,
    replacement: `                  {filteredResults.map((testLog: any) => (`
  },
  {
    description: "Results: replace filter buttons with expanded subject/topic + updated Clear handler",
    target: `                    <View style={{ flexDirection:"row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={async () => {
                          setResultsLoading(true);
                          try {
                            const params = new URLSearchParams();
                            if (resultsKeyword.trim()) params.append("keyword", resultsKeyword.trim());
                            if (resultsDateFilter.trim()) params.append("date", resultsDateFilter.trim());
                            const res = await api.get(\`/test-portal/review/results/all-tests?\${params.toString()}\`);
                            setAllTestResults(res || []);
                          } catch (e: any) {
                            Alert.alert("Error", e.message ||"Could not load results.");
                          } finally {
                            setResultsLoading(false);
                          }
                        }}
                        style={[styles.primaryBtn, { flex: 1, marginTop: 0, paddingVertical: 10 }]}
                      >
                        <Text style={styles.primaryBtnTxt}>{resultsLoading ?"Loading...":"Load Results"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => { setResultsKeyword(""); setResultsDateFilter(""); setAllTestResults([]); }}
                        style={[styles.outlineBtn, { flex: 0.5, marginTop: 0, paddingVertical: 10 }]}
                      >
                        <Text style={styles.outlineBtnTxt}>Clear</Text>
                      </TouchableOpacity>
                    </View>`,
    replacement: `                    {uniqueSubjects.length > 0 && (
                      <View style={{ marginTop: 8, marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, color:"#757575", marginBottom: 6, fontWeight:"bold"}}>FILTER BY SUBJECT:</Text>
                        <View style={{ flexDirection:"row", flexWrap:"wrap", gap: 6 }}>
                          {uniqueSubjects.map(s => (
                            <TouchableOpacity key={s} onPress={() => { setResultsSubjectFilter(resultsSubjectFilter === s ?"": s); setResultsTopicFilter(""); }} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: resultsSubjectFilter === s ?"#c62828":"#e0e0e0", backgroundColor: resultsSubjectFilter === s ?"#ffebee":"#f9f9f9"}}>
                              <Text style={{ fontSize: 11, color: resultsSubjectFilter === s ?"#c62828":"#757575", fontWeight: resultsSubjectFilter === s ?"bold":"normal"}}>{s}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    {resultsSubjectFilter && topicsForSubject.length > 0 && (
                      <View style={{ marginTop: 4, marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, color:"#757575", marginBottom: 6, fontWeight:"bold"}}>FILTER BY TOPIC:</Text>
                        <View style={{ flexDirection:"row", flexWrap:"wrap", gap: 6 }}>
                          {topicsForSubject.map(t => (
                            <TouchableOpacity key={t} onPress={() => setResultsTopicFilter(resultsTopicFilter === t ?"": t)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: resultsTopicFilter === t ?"#1565c0":"#e0e0e0", backgroundColor: resultsTopicFilter === t ?"#e3f2fd":"#f9f9f9"}}>
                              <Text style={{ fontSize: 11, color: resultsTopicFilter === t ?"#1565c0":"#757575", fontWeight: resultsTopicFilter === t ?"bold":"normal"}}>{t}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}
                    <View style={{ flexDirection:"row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={async () => {
                          setResultsLoading(true);
                          try {
                            const params = new URLSearchParams();
                            if (resultsKeyword.trim()) params.append("keyword", resultsKeyword.trim());
                            if (resultsDateFilter.trim()) params.append("date", resultsDateFilter.trim());
                            const res = await api.get(\`/test-portal/review/results/all-tests?\${params.toString()}\`);
                            setAllTestResults(res || []);
                          } catch (e: any) {
                            Alert.alert("Error", e.message ||"Could not load results.");
                          } finally {
                            setResultsLoading(false);
                          }
                        }}
                        style={[styles.primaryBtn, { flex: 1, marginTop: 0, paddingVertical: 10 }]}
                      >
                        <Text style={styles.primaryBtnTxt}>{resultsLoading ?"Loading...":"Load Results"}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => { setResultsKeyword(""); setResultsDateFilter(""); setResultsSubjectFilter(""); setResultsTopicFilter(""); setAllTestResults([]); }}
                        style={[styles.outlineBtn, { flex: 0.5, marginTop: 0, paddingVertical: 10 }]}
                      >
                        <Text style={styles.outlineBtnTxt}>Clear</Text>
                      </TouchableOpacity>
                    </View>`
  }
];

patchFile(mobilePath, mobileReplacements);
patchFile(webPath, webReplacements);

console.log("\nAll patches applied successfully!");
