const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Target MainApp state variables to add loginError state
const s1 = `  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const [showConfirmDocModal, setShowConfirmDocModal] = useState(false);
  const [showProfileReviewModal, setShowProfileReviewModal] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [showProfileSuccessModal, setShowProfileSuccessModal] = useState(false);`;

const r1 = `  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const [showConfirmDocModal, setShowConfirmDocModal] = useState(false);
  const [showProfileReviewModal, setShowProfileReviewModal] = useState(false);
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [showProfileSuccessModal, setShowProfileSuccessModal] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);`;

// 2. Target handleAuth to set loginError instead of throwing alerts
const s2 = `  const handleAuth = async (overrideUser?: string, overridePass?: string, forceLogin?: boolean) => {
    const u = overrideUser !== undefined ? overrideUser : username;
    const p = overridePass !== undefined ? overridePass : password;

    if (!u || !p) {
      Alert.alert("Input Error","Please provide both username and password.");
      return;
    }

    // Developer portal shortcut — handled client-side + validated server-side
    if (u === "developer@unistrix" && p === "Unistrix@24252630") {
      try {
        const res = await api.post("/developer/login", { username: u, password: p });
        const devData = { role: "developer", name: "Unistrix Developer", username: u, userId: "dev_unistrix" };
        setUser(devData);
        await userStorage.save(devData);
        setShowLoginModal(false);
        setActiveTab("dashboard");
      } catch (e: any) {
        Alert.alert("Dev Login Failed", e.message || "Could not authenticate developer.");
      }
      return;
    }

    try {
      const res = await api.post("/auth/login", { username: u, password: p });
      const userData = res.data || res;
      if (!userData || !userData.role) {
        throw new Error("Invalid user profile returned from server.");
      }
      setUser(userData);
      await userStorage.save(userData);
      setShowLoginModal(false);
      setShowNavbarSignInModal(false);
      if (["admin", "super_admin", "staff", "editor", "developer"].includes(userData.role)) {
        setActiveTab("erp");
      } else {
        setActiveTab("dashboard");
      }
    } catch (e: any) {
      const errorMsg = e.message || "Invalid username or password";
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.alert(\`Incorrect Login Credentials\\n\\n\${errorMsg}\`);
      }
      Alert.alert("Authentication Failed", errorMsg);
    }
  };`;

const r2 = `  const handleAuth = async (overrideUser?: string, overridePass?: string, forceLogin?: boolean) => {
    const u = overrideUser !== undefined ? overrideUser : username;
    const p = overridePass !== undefined ? overridePass : password;
    setLoginError(null);

    if (!u || !p) {
      setLoginError("Please provide both username and password.");
      return;
    }

    // Developer portal shortcut — handled client-side + validated server-side
    if (u === "developer@unistrix" && p === "Unistrix@24252630") {
      try {
        const res = await api.post("/developer/login", { username: u, password: p });
        const devData = { role: "developer", name: "Unistrix Developer", username: u, userId: "dev_unistrix" };
        setUser(devData);
        await userStorage.save(devData);
        setShowLoginModal(false);
        setActiveTab("dashboard");
      } catch (e: any) {
        setLoginError(e.message || "Could not authenticate developer.");
      }
      return;
    }

    try {
      const res = await api.post("/auth/login", { username: u, password: p });
      const userData = res.data || res;
      if (!userData || !userData.role) {
        throw new Error("Invalid user profile returned from server.");
      }
      setUser(userData);
      await userStorage.save(userData);
      setLoginError(null);
      setShowLoginModal(false);
      setShowNavbarSignInModal(false);
      if (["admin", "super_admin", "staff", "editor", "developer"].includes(userData.role)) {
        setActiveTab("erp");
      } else {
        setActiveTab("dashboard");
      }
    } catch (e: any) {
      const errorMsg = e.message || "Invalid username or password";
      setLoginError(errorMsg);
    }
  };`;

// 3. Target Modal Close button
const s3_close = `                <TouchableOpacity onPress={() => setShowNavbarSignInModal(false)}>
                  <Ionicons name="close" size={24} color="#757575" />
                </TouchableOpacity>`;

const r3_close = `                <TouchableOpacity onPress={() => { setShowNavbarSignInModal(false); setLoginError(null); }}>
                  <Ionicons name="close" size={24} color="#757575" />
                </TouchableOpacity>`;

// 4. Target Inputs & Log In Button to clear and display loginError (14 spaces indentation)
const s3_inputs = `              <View style={{ gap: 12, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: "#616161", lineHeight: 17 }}>
                  Enter your assigned username and password to log in to your student/staff dashboard.
                </Text>

                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#424242" }}>USERNAME / ROLL NUMBER</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#424242" }}>PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>

                <TouchableOpacity onPress={() => handleAuth()} style={[styles.primaryBtn, { marginTop: 6, backgroundColor: "#1565c0" }]}>
                  <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnTxt}>LOG IN</Text>
                </TouchableOpacity>
              </View>`;

const r3_inputs = `              <View style={{ gap: 12, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: "#616161", lineHeight: 17 }}>
                  Enter your assigned username and password to log in to your student/staff dashboard.
                </Text>

                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#424242" }}>USERNAME / ROLL NUMBER</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={(val) => { setUsername(val); setLoginError(null); }}
                    autoCapitalize="none"
                  />
                </View>

                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#424242" }}>PASSWORD</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter Password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={(val) => { setPassword(val); setLoginError(null); }}
                    secureTextEntry
                  />
                </View>

                {loginError && (
                  <View style={{
                    backgroundColor: "#ffebee",
                    borderWidth: 1,
                    borderColor: "#ef9a9a",
                    borderRadius: 8,
                    padding: 10,
                    marginVertical: 4,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8
                  }}>
                    <Ionicons name="alert-circle" size={16} color="#c62828" />
                    <Text style={{ fontSize: 12, color: "#c62828", fontWeight: "bold", flex: 1 }}>
                      {loginError}
                    </Text>
                  </View>
                )}

                <TouchableOpacity onPress={() => handleAuth()} style={[styles.primaryBtn, { marginTop: 6, backgroundColor: "#1565c0" }]}>
                  <Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnTxt}>LOG IN</Text>
                </TouchableOpacity>
              </View>`;

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

performReplace(s1, r1, "State declarations loginError");
performReplace(s2, r2, "handleAuth error handling");
performReplace(s3_close, r3_close, "Modal close button");
performReplace(s3_inputs, r3_inputs, "Modal inputs & login button");

fs.writeFileSync(filePath, content, 'utf8');
console.log("LOGIN ERROR BANNER INJECTED SUCCESSFULLY!");
