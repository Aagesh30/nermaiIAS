const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// Replacement 1: MainApp helper
const s1 = `function MainApp() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const [user, setUser] = useState<any>(null);
  const isAdmin = user && ["admin","staff","super_admin","editor","contributor","developer"].includes(user.role);
  const [activeTab, setActiveTab] = useState("home");`;

const r1 = `function MainApp() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const [user, setUser] = useState<any>(null);
  const isAdmin = user && ["admin","staff","super_admin","editor","contributor","developer"].includes(user.role);
  const [activeTab, setActiveTab] = useState("home");

  const renderSidebarItem = (
    itemKey: string,
    activeSub: string,
    label: string,
    iconName: any,
    onPress: () => void,
    lockKey?: string,
    badgeCount?: number,
    collapsed?: boolean
  ) => {
    const isActive = activeSub === itemKey;
    const isLocked = lockKey ? lockedPages[lockKey]?.locked : false;
    
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          styles.sidebarTab,
          isActive && styles.sidebarTabActive,
          isActive && darkMode && styles.sidebarTabActiveDark,
          collapsed ? {
            width: 48,
            height: 48,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 0,
            paddingHorizontal: 0,
            marginBottom: 8,
          } : {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 8,
            width: "100%",
            marginBottom: 4,
            gap: 10,
          }
        ]}
      >
        <Ionicons
          name={iconName}
          size={collapsed ? 22 : 20}
          color={isActive ? "#c62828" : (darkMode ? "#9e9e9e" : "#757575")}
        />
        
        {!collapsed && (
          <>
            <Text
              style={[
                styles.sidebarTabTxt,
                isActive && styles.sidebarTabTxtActive,
                darkMode && styles.sidebarTabTxtDark,
                {
                  fontSize: 13,
                  fontWeight: "600",
                  marginTop: 0,
                  textAlign: "left",
                  flex: 1,
                }
              ]}
            >
              {label}
              {badgeCount && badgeCount > 0 ? (
                <Text style={{ color: "#c62828", fontWeight: "bold" }}> ({badgeCount})</Text>
              ) : null}
            </Text>
            {isLocked && (
              <Ionicons name="lock-closed" size={12} color="#c62828" style={{ marginLeft: "auto" }} />
            )}
          </>
        )}
        
        {collapsed && badgeCount && badgeCount > 0 ? (
          <View
            style={{
              position: "absolute",
              right: -2,
              top: -2,
              backgroundColor: "#c62828",
              borderRadius: 6,
              minWidth: 12,
              height: 12,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 2,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 8, fontWeight: "bold" }}>{badgeCount}</Text>
          </View>
        ) : null}
        
        {collapsed && isLocked && (
          <View
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              backgroundColor: darkMode ? "#1e1e1e" : "#fff",
              borderRadius: 5,
              padding: 1,
            }}
          >
            <Ionicons name="lock-closed" size={10} color="#c62828" />
          </View>
        )}
      </TouchableOpacity>
    );
  };`;

// Replacement 2: Guest Header Button
const s2 = `            ) : (
              <TouchableOpacity onPress={() => setShowHamburger(true)} style={styles.hamburgerBtn}>
                <View style={styles.hamburgerLine} />
                <View style={[styles.hamburgerLine, { width: 18 }]} />
                <View style={[styles.hamburgerLine, { width: 22 }]} />
              </TouchableOpacity>
            )}`;

const r2 = `            ) : (
              <TouchableOpacity onPress={() => setShowHamburger(true)} style={[styles.hamburgerBtn, darkMode && { backgroundColor: "#303030" }]}>
                <Ionicons name="ellipsis-vertical" size={20} color={darkMode ? "#ffffff" : "#424242"} />
              </TouchableOpacity>
            )}`;

// Replacement 3: Logged-in Header Button (unique with prefix)
const s3 = `          <View style={[styles.headerLogo, { backgroundColor:"transparent", borderWidth: 0 }]}>
            <Image source={require("./assets/logo.png")} style={{ width: 34, height: 34, borderRadius: 17 }} />
          </View>
          <View>
            <Text style={[styles.headerTitle, darkMode && { color:"#f5f5f5"}]}>Nermai IAS</Text>
            <Text style={{ color: darkMode ?"#9e9e9e":"#9e9e9e", fontSize: 10 }}>{user.role ==="student"? \`Student · \${user.name}\` : \`\${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal\`}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowHamburger(true)} style={styles.hamburgerBtn}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 18 }]} />
          <View style={[styles.hamburgerLine, { width: 22 }]} />
        </TouchableOpacity>`;

const r3 = `          <View style={[styles.headerLogo, { backgroundColor:"transparent", borderWidth: 0 }]}>
            <Image source={require("./assets/logo.png")} style={{ width: 34, height: 34, borderRadius: 17 }} />
          </View>
          <View>
            <Text style={[styles.headerTitle, darkMode && { color:"#f5f5f5"}]}>Nermai IAS</Text>
            <Text style={{ color: darkMode ?"#9e9e9e":"#9e9e9e", fontSize: 10 }}>{user.role ==="student"? \`Student · \${user.name}\` : \`\${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal\`}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowHamburger(true)} style={[styles.hamburgerBtn, darkMode && { backgroundColor: "#303030" }]}>
          <Ionicons name="ellipsis-vertical" size={20} color={darkMode ? "#ffffff" : "#424242"} />
        </TouchableOpacity>`;

// Replacement 4: Test Portal Sidebar
const s4 = `        {/* ================== 2. TEST PORTAL ================== */}
        {activeTab ==="test"&& (
          isPageLocked("test") ? (
            <PageLockedBanner pageTitle="Test Portal"message={lockedPages["test"]?.message} darkMode={darkMode} />
          ) : (
          <View style={styles.splitLayout}>
            {/* Sidebar on the left */}
            {!testSidebarCollapsed && (
              <>
                {/* Backdrop: tap outside to close */}
                <TouchableOpacity
                  style={{ position:"absolute", inset: 0, zIndex: 1999, backgroundColor:"rgba(0,0,0,0.18)"}}
                  onPress={() => setTestSidebarCollapsed(true)}
                  activeOpacity={1}
                />
                <View style={[styles.sidebar, darkMode && styles.sidebarDark, { height:"100%", paddingHorizontal: 5, position:"absolute", left: 0, top: 0, bottom: 0, zIndex: 2000, shadowColor:"#000", shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 8 }]}>
                  {/* Close Sidebar Button (Arrow Button below menu bar) */}
                  <TouchableOpacity
                    onPress={() => setTestSidebarCollapsed(true)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      backgroundColor: darkMode ?"#c6282820":"#ffebee",
                      borderWidth: 1,
                      borderColor: darkMode ?"#c6282840":"#ffcdd2",
                      alignItems:"center",
                      justifyContent:"center",
                      marginBottom: 15,
                      alignSelf:"center"
                    }}
                  >
                    <Ionicons name="arrow-back-outline"size={20} color="#c62828"/>
                  </TouchableOpacity>

                  {/* Scrollable list of tabs */}
                  <ScrollView
                    style={{ width:"100%"}}
                    contentContainerStyle={{ alignItems:"center", gap: 12, paddingBottom: 60 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <TouchableOpacity onPress={() => changeTestSub("available")} style={[styles.sidebarTab, testSub ==="available"&& styles.sidebarTabActive]}>
                      <Ionicons name="document-text-outline"size={20} color={testSub ==="available"?"#c62828":"#757575"} />
                      <Text style={[styles.sidebarTabTxt, testSub ==="available"&& styles.sidebarTabTxtActive]}>Available Exams</Text>
                      {lockedPages["test-available"]?.locked && (
                        <Ionicons name="lock-closed"size={12} color="#c62828"style={{ marginLeft:"auto"}} />
                      )}
                    </TouchableOpacity>

                    {isAdmin && (
                      <>
                        <TouchableOpacity onPress={() => changeTestSub("pdf-create")} style={[styles.sidebarTab, testSub ==="pdf-create"&& styles.sidebarTabActive]}>
                          <Ionicons name="sparkles-outline"size={20} color={testSub ==="pdf-create"?"#c62828":"#757575"} />
                          <Text style={[styles.sidebarTabTxt, testSub ==="pdf-create"&& styles.sidebarTabTxtActive]}>AI Create</Text>
                          {lockedPages["test-pdf-create"]?.locked && (
                            <Ionicons name="lock-closed"size={12} color="#c62828"style={{ marginLeft:"auto"}} />
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => changeTestSub("feedback")} style={[styles.sidebarTab, testSub ==="feedback"&& styles.sidebarTabActive]}>
                          <Ionicons name="chatbubbles-outline"size={20} color={testSub ==="feedback"?"#c62828":"#757575"} />
                          <Text style={[styles.sidebarTabTxt, testSub ==="feedback"&& styles.sidebarTabTxtActive]}>Exams Feedback</Text>
                          {lockedPages["test-feedback"]?.locked && (
                            <Ionicons name="lock-closed"size={12} color="#c62828"style={{ marginLeft:"auto"}} />
                          )}
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity onPress={() => changeTestSub("results")} style={[styles.sidebarTab, testSub ==="results"&& styles.sidebarTabActive]}>
                      <Ionicons name="trophy-outline"size={20} color={testSub ==="results"?"#c62828":"#757575"} />
                      <Text style={[styles.sidebarTabTxt, testSub ==="results"&& styles.sidebarTabTxtActive]}>Results Log</Text>
                      {lockedPages["test-results"]?.locked && (
                        <Ionicons name="lock-closed"size={12} color="#c62828"style={{ marginLeft:"auto"}} />
                      )}
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              </>
            )}

            {/* Subpage Content on the right */}
            <View style={{ flex: 1, position:"relative"}}>
              {testSidebarCollapsed && (
                <TouchableOpacity
                  onPress={() => setTestSidebarCollapsed(false)}
                  style={{
                    position:"absolute",
                    left: 10,
                    top: 10,
                    zIndex: 1000,
                    backgroundColor: darkMode ?"#1e1e1e":"#ffffff",
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    alignItems:"center",
                    justifyContent:"center",
                    borderWidth: 1,
                    borderColor: darkMode ?"#333":"#e0e0e0",
                    shadowColor:"#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2.5,
                    elevation: 4
                  }}
                >
                  <Ionicons name="arrow-forward-outline"size={20} color="#c62828"/>
                </TouchableOpacity>
              )}

              <ScrollView style={[styles.body, testSidebarCollapsed && { paddingTop: 60 }]} contentContainerStyle={{ paddingBottom: 80 }}>`;

const r4 = `        {/* ================== 2. TEST PORTAL ================== */}
        {activeTab ==="test"&& (
          isPageLocked("test") ? (
            <PageLockedBanner pageTitle="Test Portal"message={lockedPages["test"]?.message} darkMode={darkMode} />
          ) : (
          <View style={styles.splitLayout}>
            {/* Backdrop for mobile */}
            {isMobile && !testSidebarCollapsed && (
              <TouchableOpacity
                style={{ position:"absolute", inset: 0, zIndex: 1999, backgroundColor:"rgba(0,0,0,0.18)"}}
                onPress={() => setTestSidebarCollapsed(true)}
                activeOpacity={1}
              />
            )}
            
            {/* Persistent/Responsive Sidebar */}
            {(!isMobile || !testSidebarCollapsed) && (
              <View
                style={[
                  styles.sidebar,
                  darkMode && styles.sidebarDark,
                  isMobile
                    ? {
                        height: "100%",
                        paddingHorizontal: 12,
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 2000,
                        shadowColor: "#000",
                        shadowOffset: { width: 2, height: 0 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 8,
                        width: 240,
                        alignItems: "stretch",
                      }
                    : {
                        width: testSidebarCollapsed ? 70 : 240,
                        paddingHorizontal: testSidebarCollapsed ? 8 : 12,
                        alignItems: testSidebarCollapsed ? "center" : "stretch",
                        height: "100%",
                        borderRightWidth: 1,
                        borderColor: darkMode ? "#2a2a2a" : "#e0e0e0",
                      }
                ]}
              >
                {/* Header */}
                {testSidebarCollapsed && !isMobile ? (
                  <TouchableOpacity
                    onPress={() => setTestSidebarCollapsed(false)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 15,
                    }}
                  >
                    <Ionicons name="menu" size={24} color={darkMode ? "#ffffff" : "#c62828"} />
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      marginBottom: 15,
                      paddingHorizontal: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Image
                        source={require("./assets/logo.png")}
                        style={{ width: 24, height: 24, borderRadius: 12 }}
                      />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>
                          Nermai Portal
                        </Text>
                        <Text style={{ fontSize: 9, color: "#888" }}>
                          TEST PORTAL
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setTestSidebarCollapsed(true)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="menu" size={22} color={darkMode ? "#ffffff" : "#c62828"} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Scrollable list of tabs */}
                <ScrollView
                  style={{ width:"100%"}}
                  contentContainerStyle={{ alignItems: testSidebarCollapsed && !isMobile ? "center" : "stretch", gap: 6, paddingBottom: 60 }}
                  showsVerticalScrollIndicator={false}
                >
                  {!testSidebarCollapsed || isMobile ? <Text style={styles.categoryHeader}>EXAMS</Text> : null}
                  {renderSidebarItem("available", testSub, "Available Exams", "document-text-outline", () => changeTestSub("available"), "test-available", undefined, testSidebarCollapsed && !isMobile)}
                  
                  {isAdmin && (
                    <>
                      {renderSidebarItem("pdf-create", testSub, "AI Create", "sparkles-outline", () => changeTestSub("pdf-create"), "test-pdf-create", undefined, testSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("feedback", testSub, "Exams Feedback", "chatbubbles-outline", () => changeTestSub("feedback"), "test-feedback", undefined, testSidebarCollapsed && !isMobile)}
                    </>
                  )}

                  {!testSidebarCollapsed || isMobile ? <Text style={styles.categoryHeader}>PERFORMANCE</Text> : null}
                  {renderSidebarItem("results", testSub, "Results Log", "trophy-outline", () => changeTestSub("results"), "test-results", undefined, testSidebarCollapsed && !isMobile)}
                </ScrollView>
              </View>
            )}

            {/* Subpage Content on the right */}
            <View style={{ flex: 1, position:"relative"}}>
              {isMobile && testSidebarCollapsed && (
                <TouchableOpacity
                  onPress={() => setTestSidebarCollapsed(false)}
                  style={{
                    position:"absolute",
                    left: 10,
                    top: 10,
                    zIndex: 1000,
                    backgroundColor: darkMode ?"#1e1e1e":"#ffffff",
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    alignItems:"center",
                    justifyContent:"center",
                    borderWidth: 1,
                    borderColor: darkMode ?"#333":"#e0e0e0",
                    shadowColor:"#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2.5,
                    elevation: 4
                  }}
                >
                  <Ionicons name="menu" size={20} color="#c62828"/>
                </TouchableOpacity>
              )}

              <ScrollView style={[styles.body, { paddingTop: (isMobile && testSidebarCollapsed) ? 50 : 15 }]} contentContainerStyle={{ paddingBottom: 80 }}>`;

// Replacement 5: ERP Sidebar
const s5_start = `        {/* ================== 3. ERP SYSTEM (Sidebar Layout) ================== */}`;
const s5_end = `              <ScrollView style={[styles.splitContent, { paddingTop: 50 }]} contentContainerStyle={{ paddingBottom: 80 }}>`;

const r5 = `        {/* ================== 3. ERP SYSTEM (Sidebar Layout) ================== */}
        {activeTab ==="erp"&& (
          isPageLocked("erp") ? (
            <PageLockedBanner pageTitle="ERP System"message={lockedPages["erp"]?.message} darkMode={darkMode} />
          ) : (
          <View style={styles.splitLayout}>
            {/* Backdrop for mobile */}
            {isMobile && !erpSidebarCollapsed && (
              <TouchableOpacity
                style={{ position:"absolute", inset: 0, zIndex: 1999, backgroundColor:"rgba(0,0,0,0.18)"}}
                onPress={() => setErpSidebarCollapsed(true)}
                activeOpacity={1}
              />
            )}
            
            {/* Persistent/Responsive Sidebar */}
            {(!isMobile || !erpSidebarCollapsed) && (
              <View
                style={[
                  styles.sidebar,
                  darkMode && styles.sidebarDark,
                  isMobile
                    ? {
                        height: "100%",
                        paddingHorizontal: 12,
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 2000,
                        shadowColor: "#000",
                        shadowOffset: { width: 2, height: 0 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 8,
                        width: 240,
                        alignItems: "stretch",
                      }
                    : {
                        width: erpSidebarCollapsed ? 70 : 240,
                        paddingHorizontal: erpSidebarCollapsed ? 8 : 12,
                        alignItems: erpSidebarCollapsed ? "center" : "stretch",
                        height: "100%",
                        borderRightWidth: 1,
                        borderColor: darkMode ? "#2a2a2a" : "#e0e0e0",
                      }
                ]}
              >
                {/* Header */}
                {erpSidebarCollapsed && !isMobile ? (
                  <TouchableOpacity
                    onPress={() => setErpSidebarCollapsed(false)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 15,
                    }}
                  >
                    <Ionicons name="menu" size={24} color={darkMode ? "#ffffff" : "#c62828"} />
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      marginBottom: 15,
                      paddingHorizontal: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Image
                        source={require("./assets/logo.png")}
                        style={{ width: 24, height: 24, borderRadius: 12 }}
                      />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>
                          Nermai Portal
                        </Text>
                        <Text style={{ fontSize: 9, color: "#888" }}>
                          ERP SYSTEM
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setErpSidebarCollapsed(true)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="menu" size={22} color={darkMode ? "#ffffff" : "#c62828"} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Scrollable list of tabs */}
                <ScrollView
                  style={{ width:"100%"}}
                  contentContainerStyle={{ alignItems: erpSidebarCollapsed && !isMobile ? "center" : "stretch", gap: 6, paddingBottom: 60 }}
                  showsVerticalScrollIndicator={false}
                >
                  {isAdmin ? (
                    <>
                      {!erpSidebarCollapsed || isMobile ? <Text style={styles.categoryHeader}>DIRECTORY</Text> : null}
                      {renderSidebarItem("students", erpSub, "Students", "people-outline", () => changeErpSub("students"), "erp-students", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("staff", erpSub, "Admin", "shield-checkmark-outline", () => changeErpSub("staff"), "erp-staff", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("batch", erpSub, "Batches", "layers-outline", () => changeErpSub("batch"), "erp-batch", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("id-card", erpSub, "ID Cards", "card-outline", () => changeErpSub("id-card"), "erp-id-card", undefined, erpSidebarCollapsed && !isMobile)}

                      {!erpSidebarCollapsed || isMobile ? <Text style={styles.categoryHeader}>SECURITY & RULES</Text> : null}
                      {(user.role ==="super_admin"|| user.role ==="developer") && (
                        <>
                          {renderSidebarItem("permissions", erpSub, "Permissions", "key-outline", () => changeErpSub("permissions"), "erp-permissions", undefined, erpSidebarCollapsed && !isMobile)}
                          {renderSidebarItem("approvals", erpSub, "Approvals Queue", "checkmark-circle-outline", () => { changeErpSub("approvals"); loadPendingApprovals(); }, "erp-approvals", pendingApprovals.length, erpSidebarCollapsed && !isMobile)}
                        </>
                      )}
                      {renderSidebarItem("profile-requests", erpSub, "Profile Requests", "person-add-outline", () => { changeErpSub("profile-requests"); loadProfileRequests(); }, undefined, profileRequests.filter((r: any) => r.status ==="pending").length, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("edit-permissions", erpSub, "Profile Edit Permissions", "shield-checkmark-outline", () => { changeErpSub("edit-permissions"); loadStudents(); }, "erp-edit-permissions", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("sacs", erpSub, "Access Control (SACS)", "shield-half-outline", () => { changeErpSub("sacs"); loadSacsRequests(); }, "erp-sacs", undefined, erpSidebarCollapsed && !isMobile)}

                      {!erpSidebarCollapsed || isMobile ? <Text style={styles.categoryHeader}>OPERATIONS</Text> : null}
                      {renderSidebarItem("announcements", erpSub, "Notices", "megaphone-outline", () => changeErpSub("announcements"), "erp-announcements", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("analytics", erpSub, "Analytics", "analytics-outline", () => changeErpSub("analytics"), "erp-analytics", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("fees", erpSub, "Fees", "cash-outline", () => changeErpSub("fees"), "erp-fees", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("marks", erpSub, "Marks Ledger", "checkbox-outline", () => { changeErpSub("marks"); if (tests.length > 0) { setSelectedErpTestId(tests[0].id); loadErpTestResults(tests[0].id); } }, "erp-marks", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("offline-attendance", erpSub, "Offline Attendance", "clipboard-outline", () => { changeErpSub("offline-attendance"); loadStudents(); loadBatches(); }, "erp-offline-attendance", undefined, erpSidebarCollapsed && !isMobile)}
                    </>
                  ) : (
                    <>
                      {!erpSidebarCollapsed || isMobile ? <Text style={styles.categoryHeader}>MY ACADEMICS</Text> : null}
                      {renderSidebarItem("my-profile", erpSub, "My Profile", "person-circle-outline", () => { changeErpSub("my-profile"); const myStudent = getLoggedInStudent(user, students); if (myStudent) loadMyProfileRequest(myStudent.id); }, undefined, undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("analytics", erpSub, "My Analytics", "analytics-outline", () => changeErpSub("analytics"), "erp-analytics", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("marks", erpSub, "My Marks", "checkbox-outline", () => { changeErpSub("marks"); if (tests.length > 0) { setSelectedErpTestId(tests[0].id); loadErpTestResults(tests[0].id); } }, "erp-marks", undefined, erpSidebarCollapsed && !isMobile)}

                      {!erpSidebarCollapsed || isMobile ? <Text style={styles.categoryHeader}>MY FINANCE & ID</Text> : null}
                      {renderSidebarItem("fees", erpSub, "My Fees", "cash-outline", () => changeErpSub("fees"), "erp-fees", undefined, erpSidebarCollapsed && !isMobile)}
                      {renderSidebarItem("id-card", erpSub, "My ID & Hall Ticket", "card-outline", () => changeErpSub("id-card"), "erp-id-card", undefined, erpSidebarCollapsed && !isMobile)}
                    </>
                  )}
                </ScrollView>
              </View>
            )}

            {/* Subpage Content on the right */}
            <View style={{ flex: 1, position:"relative"}}>
              {isMobile && erpSidebarCollapsed && (
                <TouchableOpacity
                  onPress={() => setErpSidebarCollapsed(false)}
                  style={{
                    position:"absolute",
                    left: 10,
                    top: 10,
                    zIndex: 1000,
                    backgroundColor: darkMode ?"#1e1e1e":"#ffffff",
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    alignItems:"center",
                    justifyContent:"center",
                    borderWidth: 1,
                    borderColor: darkMode ?"#333":"#e0e0e0",
                    shadowColor:"#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2.5,
                    elevation: 4
                  }}
                >
                  <Ionicons name="menu" size={20} color="#c62828"/>
                </TouchableOpacity>
              )}
              <ScrollView style={[styles.splitContent, { paddingTop: (isMobile && erpSidebarCollapsed) ? 50 : 15 }]} contentContainerStyle={{ paddingBottom: 80 }}>`;

// Replacement 6: LMS Sidebar
const s6_start = `        {/* ================== 4. LMS LEARNING (Sidebar Layout) ================== */}`;
const s6_end = `            <ScrollView style={[styles.splitContent, { paddingTop: 50 }, darkMode && styles.splitContentDark]} contentContainerStyle={{ paddingBottom: 80 }}>`;

const r6 = `        {/* ================== 4. LMS LEARNING (Sidebar Layout) ================== */}
        {activeTab ==="lms"&& (
          isPageLocked("lms") ? (
            <PageLockedBanner pageTitle="LMS Learning"message={lockedPages["lms"]?.message} darkMode={darkMode} />
          ) : (
          <View style={styles.splitLayout}>
            {/* Backdrop for mobile */}
            {isMobile && !lmsTabsCollapsed && (
              <TouchableOpacity
                style={{ position:"absolute", inset: 0, zIndex: 1999, backgroundColor:"rgba(0,0,0,0.18)"}}
                onPress={() => setLmsTabsCollapsed(true)}
                activeOpacity={1}
              />
            )}
            
            {/* Persistent/Responsive Sidebar */}
            {(!isMobile || !lmsTabsCollapsed) && (
              <View
                style={[
                  styles.sidebar,
                  darkMode && styles.sidebarDark,
                  isMobile
                    ? {
                        height: "100%",
                        paddingHorizontal: 12,
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 2000,
                        shadowColor: "#000",
                        shadowOffset: { width: 2, height: 0 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 8,
                        width: 240,
                        alignItems: "stretch",
                      }
                    : {
                        width: lmsTabsCollapsed ? 70 : 240,
                        paddingHorizontal: lmsTabsCollapsed ? 8 : 12,
                        alignItems: lmsTabsCollapsed ? "center" : "stretch",
                        height: "100%",
                        borderRightWidth: 1,
                        borderColor: darkMode ? "#2a2a2a" : "#e0e0e0",
                      }
                ]}
              >
                {/* Header */}
                {lmsTabsCollapsed && !isMobile ? (
                  <TouchableOpacity
                    onPress={() => setLmsTabsCollapsed(false)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 15,
                    }}
                  >
                    <Ionicons name="menu" size={24} color={darkMode ? "#ffffff" : "#c62828"} />
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      marginBottom: 15,
                      paddingHorizontal: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Image
                        source={require("./assets/logo.png")}
                        style={{ width: 24, height: 24, borderRadius: 12 }}
                      />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>
                          Nermai Portal
                        </Text>
                        <Text style={{ fontSize: 9, color: "#888" }}>
                          LMS LEARNING
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setLmsTabsCollapsed(true)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="menu" size={22} color={darkMode ? "#ffffff" : "#c62828"} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Scrollable list of tabs */}
                <ScrollView
                  style={{ width:"100%"}}
                  contentContainerStyle={{ alignItems: lmsTabsCollapsed && !isMobile ? "center" : "stretch", gap: 6, paddingBottom: 60 }}
                  showsVerticalScrollIndicator={false}
                >
                  {!lmsTabsCollapsed || isMobile ? <Text style={styles.categoryHeader}>LEARNING</Text> : null}
                  {renderSidebarItem("quiz", (lmsSub ==="quiz"|| lmsSub ==="all-quizzes"|| lmsSub ==="create-quiz") ? "quiz" : lmsSub, "Quiz", "help-circle-outline", () => changeLmsSub("quiz"), "lms-quiz", undefined, lmsTabsCollapsed && !isMobile)}
                  {renderSidebarItem("daily-content", lmsSub, "Daily Content", "calendar-outline", () => changeLmsSub("daily-content"), "lms-daily-content", undefined, lmsTabsCollapsed && !isMobile)}
                  {renderSidebarItem("live-classes", lmsSub, "Live", "videocam-outline", () => changeLmsSub("live-classes"), "lms-live-classes", undefined, lmsTabsCollapsed && !isMobile)}
                  {renderSidebarItem("recorded", lmsSub, "Recorded", "play-circle-outline", () => changeLmsSub("recorded"), "lms-recorded", undefined, lmsTabsCollapsed && !isMobile)}

                  {!lmsTabsCollapsed || isMobile ? <Text style={styles.categoryHeader}>MATERIALS</Text> : null}
                  {renderSidebarItem("resources", lmsSub, "Resources", "folder-outline", () => changeLmsSub("resources"), "lms-resources", undefined, lmsTabsCollapsed && !isMobile)}
                </ScrollView>
              </View>
            )}

            {/* Show Sidebar Button */}
            {isMobile && lmsTabsCollapsed && (
              <TouchableOpacity
                onPress={() => setLmsTabsCollapsed(false)}
                style={{
                  position:"absolute",
                  left: 10,
                  top: 10,
                  zIndex: 1000,
                  backgroundColor: darkMode ?"#1e1e1e":"#ffffff",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  alignItems:"center",
                  justifyContent:"center",
                  borderWidth: 1,
                  borderColor: darkMode ?"#333":"#e0e0e0",
                  shadowColor:"#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 2.5,
                  elevation: 4
                }}
              >
                <Ionicons name="menu" size={20} color="#c62828"/>
              </TouchableOpacity>
            )}

            <ScrollView style={[styles.splitContent, { paddingTop: (isMobile && lmsTabsCollapsed) ? 50 : 15 }, darkMode && styles.splitContentDark]} contentContainerStyle={{ paddingBottom: 80 }}>`;

// Replacement 7: CRM Sidebar
const s7_start = `        {/* ================== 5. CRM PORTAL (Sidebar Layout) ================== */}`;
const s7_end = `              <ScrollView style={[styles.splitContent, { paddingTop: 50 }]} contentContainerStyle={{ paddingBottom: 80 }}>`;

const r7 = `        {/* ================== 5. CRM PORTAL (Sidebar Layout) ================== */}
        {activeTab ==="crm"&& (
          isPageLocked("crm") ? (
            <PageLockedBanner pageTitle="CRM & Admissions"message={lockedPages["crm"]?.message} darkMode={darkMode} />
          ) : (
          <View style={styles.splitLayout}>
            {/* Backdrop for mobile */}
            {isMobile && !crmSidebarCollapsed && (
              <TouchableOpacity
                style={{ position:"absolute", inset: 0, zIndex: 1999, backgroundColor:"rgba(0,0,0,0.18)"}}
                onPress={() => setCrmSidebarCollapsed(true)}
                activeOpacity={1}
              />
            )}
            
            {/* Persistent/Responsive Sidebar */}
            {(!isMobile || !crmSidebarCollapsed) && (
              <View
                style={[
                  styles.sidebar,
                  darkMode && styles.sidebarDark,
                  isMobile
                    ? {
                        height: "100%",
                        paddingHorizontal: 12,
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        zIndex: 2000,
                        shadowColor: "#000",
                        shadowOffset: { width: 2, height: 0 },
                        shadowOpacity: 0.15,
                        shadowRadius: 4,
                        elevation: 8,
                        width: 240,
                        alignItems: "stretch",
                      }
                    : {
                        width: crmSidebarCollapsed ? 70 : 240,
                        paddingHorizontal: crmSidebarCollapsed ? 8 : 12,
                        alignItems: crmSidebarCollapsed ? "center" : "stretch",
                        height: "100%",
                        borderRightWidth: 1,
                        borderColor: darkMode ? "#2a2a2a" : "#e0e0e0",
                      }
                ]}
              >
                {/* Header */}
                {crmSidebarCollapsed && !isMobile ? (
                  <TouchableOpacity
                    onPress={() => setCrmSidebarCollapsed(false)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 15,
                    }}
                  >
                    <Ionicons name="menu" size={24} color={darkMode ? "#ffffff" : "#c62828"} />
                  </TouchableOpacity>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      marginBottom: 15,
                      paddingHorizontal: 4,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Image
                        source={require("./assets/logo.png")}
                        style={{ width: 24, height: 24, borderRadius: 12 }}
                      />
                      <View>
                        <Text style={{ fontSize: 13, fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>
                          Nermai Portal
                        </Text>
                        <Text style={{ fontSize: 9, color: "#888" }}>
                          CRM SYSTEM
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setCrmSidebarCollapsed(true)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name="menu" size={22} color={darkMode ? "#ffffff" : "#c62828"} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Scrollable list of tabs */}
                <ScrollView
                  style={{ width:"100%"}}
                  contentContainerStyle={{ alignItems: crmSidebarCollapsed && !isMobile ? "center" : "stretch", gap: 6, paddingBottom: 60 }}
                  showsVerticalScrollIndicator={false}
                >
                  {!crmSidebarCollapsed || isMobile ? <Text style={styles.categoryHeader}>ADMISSIONS</Text> : null}
                  {renderSidebarItem("admissions", crmSub, "Inquiries", "mail-outline", () => changeCrmSub("admissions"), "crm-admissions", undefined, crmSidebarCollapsed && !isMobile)}
                  {renderSidebarItem("leads", crmSub, "Leads", "funnel-outline", () => changeCrmSub("leads"), "crm-leads", undefined, crmSidebarCollapsed && !isMobile)}

                  {!crmSidebarCollapsed || isMobile ? <Text style={styles.categoryHeader}>ENGAGEMENT & CAMPAIGNS</Text> : null}
                  {renderSidebarItem("campaigns", crmSub, "Campaigns", "megaphone-outline", () => changeCrmSub("campaigns"), "crm-campaigns", undefined, crmSidebarCollapsed && !isMobile)}
                  {renderSidebarItem("feedback", crmSub, "Feedbacks", "star-outline", () => changeCrmSub("feedback"), "crm-feedback", undefined, crmSidebarCollapsed && !isMobile)}
                </ScrollView>
              </View>
            )}

            {/* Subpage Content on the right */}
            <View style={{ flex: 1, position:"relative"}}>
              {isMobile && crmSidebarCollapsed && (
                <TouchableOpacity
                  onPress={() => setCrmSidebarCollapsed(false)}
                  style={{
                    position:"absolute",
                    left: 10,
                    top: 10,
                    zIndex: 1000,
                    backgroundColor: darkMode ?"#1e1e1e":"#ffffff",
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    alignItems:"center",
                    justifyContent:"center",
                    borderWidth: 1,
                    borderColor: darkMode ?"#333":"#e0e0e0",
                    shadowColor:"#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2.5,
                    elevation: 4
                  }}
                >
                  <Ionicons name="menu" size={20} color="#c62828"/>
                </TouchableOpacity>
              )}
              <ScrollView style={[styles.splitContent, { paddingTop: (isMobile && crmSidebarCollapsed) ? 50 : 15 }]} contentContainerStyle={{ paddingBottom: 80 }}>`;

// Replacement 8: StyleSheet categoryHeader (fixed exact spacing of original)
const s8 = `  roleBtnTxtDark: {
    color:"#9e9e9e",
  },
});`;

const r8 = `  roleBtnTxtDark: {
    color:"#9e9e9e",
  },
  categoryHeader: {
    fontSize: 10,
    fontWeight: "700",
    color: "#9e9e9e",
    marginTop: 18,
    marginBottom: 6,
    paddingHorizontal: 8,
    letterSpacing: 0.8,
  },
});`;

// Helper function to replace exactly
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

function performRangeReplace(startStr, endStr, replaceStr, name) {
  const normStartStr = startStr.replace(/\r\n/g, '\n');
  const normEndStr = endStr.replace(/\r\n/g, '\n');
  const normReplaceStr = replaceStr.replace(/\r\n/g, '\n');

  const startIndex = content.indexOf(normStartStr);
  if (startIndex === -1) {
    console.error(`ERROR: Start string not found for: ${name}`);
    process.exit(1);
  }
  const endIndex = content.indexOf(normEndStr, startIndex);
  if (endIndex === -1) {
    console.error(`ERROR: End string not found for: ${name}`);
    process.exit(1);
  }
  const searchStr = content.substring(startIndex, endIndex + normEndStr.length);
  content = content.replace(searchStr, normReplaceStr);
  console.log(`SUCCESS: Replaced range for ${name}`);
}

// Perform replacements
performReplace(s1, r1, "MainApp helper");
performReplace(s2, r2, "Guest Header Button");
performReplace(s3, r3, "Logged-in Header Button");
performReplace(s4, r4, "Test Portal Sidebar");
performRangeReplace(s5_start, s5_end, r5, "ERP Sidebar");
performRangeReplace(s6_start, s6_end, r6, "LMS Sidebar");
performRangeReplace(s7_start, s7_end, r7, "CRM Sidebar");
performReplace(s8, r8, "StyleSheet");

fs.writeFileSync(filePath, content, 'utf8');
console.log("ALL REPLACEMENTS APPLIED SUCCESSFULLY!");
