const fs = require('fs');

const files = ['App.tsx', 'web_portal/App.tsx', 'mobile/App.tsx'];

// Custom components block to insert
const customComponents = `
// ================== CUSTOM LOADING ANIMATIONS & SKELETONS ==================
// Custom TouchableOpacity that displays a spinner during presses
function TouchableOpacity(props: any) {
  const [btnLoading, setBtnLoading] = React.useState(false);
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handlePress = async (e: any) => {
    if (btnLoading) return;
    if (props.onPress) {
      setBtnLoading(true);
      try {
        const result = props.onPress(e);
        if (result instanceof Promise) {
          await result;
        } else {
          // Add a small delay so visual feedback is noticeable
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted.current) {
          setBtnLoading(false);
        }
      }
    }
  };

  const { children, disabled, style, ...rest } = props;

  const getSpinnerColor = () => {
    const flatStyle = StyleSheet.flatten(style) || {};
    const bg = flatStyle.backgroundColor;
    if (bg === "#ffffff" || bg === "white" || bg === "#fff" || bg === "transparent" || !bg) {
      return "#c62828";
    }
    return "#ffffff";
  };

  return (
    <RNTouchableOpacity
      {...rest}
      disabled={disabled || btnLoading}
      style={[style, { position: "relative" }]}
      onPress={handlePress}
    >
      <View style={{ opacity: btnLoading ? 0 : 1 }}>
        {children}
      </View>
      {btnLoading && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="small" color={getSpinnerColor()} />
        </View>
      )}
    </RNTouchableOpacity>
  );
}

// Shimmer effect component using react-native Animated
const Shimmer = ({ style, darkMode }: { style: any; darkMode: boolean }) => {
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web', // Safe on all platforms
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: darkMode ? "#2c2c2c" : "#e0e0e0" }, style, { opacity }]} />;
};

// Skeleton Screen representing page layouts
function PageSkeleton({ tab, subTab, darkMode }: { tab: string; subTab?: string; darkMode: boolean }) {
  const bgColor = darkMode ? "#121212" : "#f5f5f5";
  const cardColor = darkMode ? "#1e1e1e" : "#ffffff";

  // Dashboard / Home skeleton
  if (tab === "dashboard" || tab === "home") {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: bgColor }} contentContainerStyle={{ padding: 20 }}>
        {/* Header Section */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
          <View>
            <Shimmer darkMode={darkMode} style={{ width: 180, height: 24, borderRadius: 6, marginBottom: 8 }} />
            <Shimmer darkMode={darkMode} style={{ width: 120, height: 14, borderRadius: 4 }} />
          </View>
          <Shimmer darkMode={darkMode} style={{ width: 40, height: 40, borderRadius: 20 }} />
        </View>

        {/* Banner placeholder */}
        <Shimmer darkMode={darkMode} style={{ width: "100%", height: 160, borderRadius: 12, marginBottom: 25 }} />

        {/* Stats Grid */}
        <View style={{ flexDirection: "row", gap: 15, marginBottom: 25 }}>
          <View style={{ flex: 1, backgroundColor: cardColor, padding: 15, borderRadius: 12, height: 100, borderWidth: 1, borderColor: darkMode ? "#2c2c2c" : "#eaeaea" }}>
            <Shimmer darkMode={darkMode} style={{ width: "40%", height: 12, borderRadius: 4, marginBottom: 12 }} />
            <Shimmer darkMode={darkMode} style={{ width: "70%", height: 24, borderRadius: 6, marginBottom: 8 }} />
            <Shimmer darkMode={darkMode} style={{ width: "50%", height: 10, borderRadius: 4 }} />
          </View>
          <View style={{ flex: 1, backgroundColor: cardColor, padding: 15, borderRadius: 12, height: 100, borderWidth: 1, borderColor: darkMode ? "#2c2c2c" : "#eaeaea" }}>
            <Shimmer darkMode={darkMode} style={{ width: "40%", height: 12, borderRadius: 4, marginBottom: 12 }} />
            <Shimmer darkMode={darkMode} style={{ width: "70%", height: 24, borderRadius: 6, marginBottom: 8 }} />
            <Shimmer darkMode={darkMode} style={{ width: "50%", height: 10, borderRadius: 4 }} />
          </View>
        </View>

        {/* Activities List */}
        <View style={{ backgroundColor: cardColor, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: darkMode ? "#2c2c2c" : "#eaeaea" }}>
          <Shimmer darkMode={darkMode} style={{ width: 140, height: 18, borderRadius: 4, marginBottom: 20 }} />
          {Array.from({ length: 4 }).map((_, idx) => (
            <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 15, paddingVertical: 12, borderBottomWidth: idx === 3 ? 0 : 1, borderColor: darkMode ? "#2c2c2c" : "#f0f0f0" }}>
              <Shimmer darkMode={darkMode} style={{ width: 36, height: 36, borderRadius: 18 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Shimmer darkMode={darkMode} style={{ width: "60%", height: 12, borderRadius: 4 }} />
                <Shimmer darkMode={darkMode} style={{ width: "35%", height: 10, borderRadius: 4 }} />
              </View>
              <Shimmer darkMode={darkMode} style={{ width: 50, height: 12, borderRadius: 4 }} />
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  // Test Portal skeleton
  if (tab === "test" || tab === "freetest") {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: bgColor }} contentContainerStyle={{ padding: 20 }}>
        <Shimmer darkMode={darkMode} style={{ width: 150, height: 24, borderRadius: 6, marginBottom: 20 }} />
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
          <Shimmer darkMode={darkMode} style={{ width: 100, height: 36, borderRadius: 18 }} />
          <Shimmer darkMode={darkMode} style={{ width: 120, height: 36, borderRadius: 18 }} />
        </View>
        <Shimmer darkMode={darkMode} style={{ width: "100%", height: 45, borderRadius: 8, marginBottom: 20 }} />
        {Array.from({ length: 3 }).map((_, idx) => (
          <View key={idx} style={{ backgroundColor: cardColor, padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: darkMode ? "#2c2c2c" : "#eaeaea", gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Shimmer darkMode={darkMode} style={{ width: "60%", height: 16, borderRadius: 4 }} />
              <Shimmer darkMode={darkMode} style={{ width: 70, height: 20, borderRadius: 10 }} />
            </View>
            <Shimmer darkMode={darkMode} style={{ width: "90%", height: 12, borderRadius: 4 }} />
            <View style={{ flexDirection: "row", gap: 15, marginTop: 8 }}>
              <Shimmer darkMode={darkMode} style={{ width: 80, height: 10, borderRadius: 4 }} />
              <Shimmer darkMode={darkMode} style={{ width: 60, height: 10, borderRadius: 4 }} />
            </View>
          </View>
        ))}
      </ScrollView>
    );
  }

  // ERP, CRM, LMS skeleton
  if (tab === "erp" || tab === "crm" || tab === "lms") {
    return (
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: bgColor }}>
        {/* Main Content Area */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <Shimmer darkMode={darkMode} style={{ width: 180, height: 24, borderRadius: 6 }} />
            <Shimmer darkMode={darkMode} style={{ width: 110, height: 35, borderRadius: 8 }} />
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            <Shimmer darkMode={darkMode} style={{ flex: 1, height: 40, borderRadius: 8 }} />
            <Shimmer darkMode={darkMode} style={{ width: 80, height: 40, borderRadius: 8 }} />
          </View>
          <View style={{ backgroundColor: cardColor, borderRadius: 12, borderWidth: 1, borderColor: darkMode ? "#2c2c2c" : "#eaeaea", padding: 15 }}>
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: darkMode ? "#2c2c2c" : "#f0f0f0", paddingBottom: 10, marginBottom: 10 }}>
              <Shimmer darkMode={darkMode} style={{ flex: 1.5, height: 12, borderRadius: 4 }} />
              <Shimmer darkMode={darkMode} style={{ flex: 1, height: 12, borderRadius: 4 }} />
              <Shimmer darkMode={darkMode} style={{ flex: 1, height: 12, borderRadius: 4 }} />
            </View>
            {Array.from({ length: 4 }).map((_, idx) => (
              <View key={idx} style={{ flexDirection: "row", paddingVertical: 12, borderBottomWidth: idx === 3 ? 0 : 1, borderColor: darkMode ? "#2c2c2c" : "#f5f5f5" }}>
                <Shimmer darkMode={darkMode} style={{ flex: 1.5, height: 12, borderRadius: 4 }} />
                <Shimmer darkMode={darkMode} style={{ flex: 1, height: 12, borderRadius: 4 }} />
                <Shimmer darkMode={darkMode} style={{ flex: 1, height: 12, borderRadius: 4 }} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // Fallback layout
  return (
    <ScrollView style={{ flex: 1, backgroundColor: bgColor }} contentContainerStyle={{ padding: 20 }}>
      <Shimmer darkMode={darkMode} style={{ width: "70%", height: 24, borderRadius: 6, marginBottom: 15 }} />
      <Shimmer darkMode={darkMode} style={{ width: "100%", height: 150, borderRadius: 12, marginBottom: 20 }} />
      <View style={{ backgroundColor: cardColor, padding: 20, borderRadius: 12, gap: 15 }}>
        <Shimmer darkMode={darkMode} style={{ width: "95%", height: 12, borderRadius: 4 }} />
        <Shimmer darkMode={darkMode} style={{ width: "85%", height: 12, borderRadius: 4 }} />
        <Shimmer darkMode={darkMode} style={{ width: "60%", height: 12, borderRadius: 4 }} />
      </View>
    </ScrollView>
  );
}
`;

files.forEach(f => {
  if (!fs.existsSync(f)) {
    console.log(`Skipping file ${f} (does not exist)`);
    return;
  }
  
  let content = fs.readFileSync(f, 'utf8');
  console.log(`Processing file: ${f}...`);
  
  // 1. Replace the first import from react-native to rename TouchableOpacity and import Animated
  const searchImport = /import\s*\{([\s\S]*?)\}\s*from\s*["']react-native["']/g;
  const match = searchImport.exec(content);
  if (match) {
    const originalImport = match[0];
    let importList = match[1];
    
    if (importList.includes('TouchableOpacity') && !importList.includes('TouchableOpacity as RNTouchableOpacity')) {
      importList = importList.replace('TouchableOpacity', 'TouchableOpacity as RNTouchableOpacity');
    }
    
    if (!importList.includes('Animated')) {
      importList = importList.trim() + ',\n  Animated';
    }
    
    const newImport = "import {\n  " + importList.split(',').map(s => s.trim()).filter(Boolean).join(',\n  ') + "\n} from \"react-native\"";
    content = content.replace(originalImport, newImport);
    console.log('  Modified import list');
  }
  
  // 2. Insert custom components right after the import block
  if (!content.includes('// ================== CUSTOM LOADING ANIMATIONS & SKELETONS ==================')) {
    const lastImportIndex = content.lastIndexOf('import ');
    const endOfImportLine = content.indexOf('\n', lastImportIndex);
    const insertPos = endOfImportLine + 1;
    
    content = content.substring(0, insertPos) + customComponents + content.substring(insertPos);
    console.log('  Inserted custom components');
  }
  
  // 3. Add pageLoading state inside App
  if (!content.includes('const [pageLoading, setPageLoading] =')) {
    const appIndex = content.indexOf('export default function App()');
    if (appIndex !== -1) {
      const openBrace = content.indexOf('{', appIndex);
      const insertPos = openBrace + 1;
      
      const stateInsert = '\n  const [pageLoading, setPageLoading] = React.useState(false);';
      content = content.substring(0, insertPos) + stateInsert + content.substring(insertPos);
      console.log('  Added pageLoading state');
    }
  }
  
  // 4. Add useEffect for tab-based skeleton trigger
  if (!content.includes('setPageLoading(true);')) {
    const activeTabDecl = content.indexOf('const [activeTab, setActiveTab]');
    if (activeTabDecl !== -1) {
      const endOfLine = content.indexOf('\n', activeTabDecl);
      const insertPos = endOfLine + 1;
      
      let depList = '';
      if (f.includes('mobile')) {
        depList = 'activeTab, erpSub, lmsSub, crmSub, guestTab, authTab';
      } else {
        depList = 'activeTab, erpSub, lmsSub, crmSub, guestTab, devTab, authTab';
      }
      
      const useEffectInsert = "\n  React.useEffect(() => {\n    setPageLoading(true);\n    const timer = setTimeout(() => {\n      setPageLoading(false);\n    }, 600);\n    return () => clearTimeout(timer);\n  }, [" + depList + "]);\n";
      
      content = content.substring(0, insertPos) + useEffectInsert + content.substring(insertPos);
      console.log('  Added useEffect for pageLoading trigger');
    }
  }
  
  // 5. Wrap Developer Workspace splitContent
  const splitContentTarget = 'style={[styles.splitContent, darkMode && styles.splitContentDark, { paddingHorizontal: 0, paddingTop: 0 }]}>';
  if (content.includes(splitContentTarget)) {
    content = content.replace(
      splitContentTarget,
      splitContentTarget + '\n              {pageLoading ? (\n                <PageSkeleton tab="erp" darkMode={darkMode} />\n              ) : (\n                <>\n'
    );
    
    // Close it at manual test save definition
    const manualTestTarget = `                    <TouchableOpacity onPress={saveTestDefinition} style={styles.primaryBtn}>
                      <Text style={styles.primaryBtnTxt}>Create Test Definition</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}`;
    
    if (content.includes(manualTestTarget)) {
      content = content.replace(
        manualTestTarget,
        manualTestTarget + '\n                </>)}'
      );
      console.log('  Wrapped Developer splitContent');
    }
  }
  
  // 6. Wrap Main Body of authenticated portal
  const mainBodyTarget = 'style={[styles.mainBody, darkMode && { backgroundColor: "#121212" }]}>';
  if (content.includes(mainBodyTarget)) {
    content = content.replace(
      mainBodyTarget,
      mainBodyTarget + '\n          {pageLoading ? (\n            <PageSkeleton tab={activeTab} subTab={activeTab === "erp" ? erpSub : activeTab === "lms" ? lmsSub : activeTab === "crm" ? crmSub : undefined} darkMode={darkMode} />\n          ) : (\n            <>\n'
    );
    
    // Close it at bottom tab bar
    const bottomTabTarget = `      {/* Bottom Tab Bar */}
      <View style={[styles.bottomTabBar,`;
    
    if (content.includes(bottomTabTarget)) {
      content = content.replace(
        bottomTabTarget,
        `            </>\n          )}\n      {/* Bottom Tab Bar */}\n      <View style={[styles.bottomTabBar,`
      );
      console.log('  Wrapped Main Body');
    }
  }
  
  // 7. Wrap Guest ScrollView
  const guestModalTarget = `        {/* Email Gate Modal */}
        <Modal visible={guestEmailGateVisible} transparent animationType="fade">`;
        
  if (content.includes(guestModalTarget)) {
    // Find the ScrollView after the Email Gate Modal
    const guestScrollTarget = `<ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>`;
    const searchFrom = content.indexOf(guestModalTarget);
    const scrollPos = content.indexOf(guestScrollTarget, searchFrom);
    
    if (scrollPos !== -1) {
      const beforeScroll = content.substring(0, scrollPos);
      const afterScroll = content.substring(scrollPos);
      
      content = beforeScroll + `{pageLoading ? (\n          <PageSkeleton tab={guestTab} darkMode={darkMode} />\n        ) : (\n          ` + afterScroll;
      
      // Close it at the end of the guest tab
      const endGuestRegex = /(<\/ScrollView>\s*<\/SafeAreaView>\s*\);\s*\})/;
      const matchEnd = content.match(endGuestRegex);
      if (matchEnd) {
        content = content.replace(
          endGuestRegex,
          `</ScrollView>\n        )}\n      </SafeAreaView>\n    );\n  }`
        );
        console.log('  Wrapped Guest ScrollView');
      }
    }
  }
  
  // 8. Wrap Auth Card
  const authSubtitleTarget = `style={styles.authSubtitle}>Integrated Learning Platform</Text>
              </View>`;
  
  if (content.includes(authSubtitleTarget)) {
    content = content.replace(
      authSubtitleTarget,
      authSubtitleTarget + `
              {pageLoading ? (
                <View style={{ gap: 15, paddingVertical: 20 }}>
                  <Shimmer darkMode={false} style={{ width: "100%", height: 40, borderRadius: 8 }} />
                  <Shimmer darkMode={false} style={{ width: "100%", height: 40, borderRadius: 8 }} />
                  <Shimmer darkMode={false} style={{ width: "100%", height: 45, borderRadius: 8, marginTop: 10 }} />
                </View>
              ) : (<>`
    );
    
    // Close it at the end of the auth view card
    const endAuthRegex = /(<\/View>\s*<\/ScrollView>\s*<\/KeyboardAvoidingView>\s*<\/SafeAreaView>\s*\);\s*\})/;
    if (content.match(endAuthRegex)) {
      content = content.replace(
        endAuthRegex,
        `</>)}\n            </View>\n          </ScrollView>\n        </KeyboardAvoidingView>\n      </SafeAreaView>\n    );\n  }`
      );
      console.log('  Wrapped Auth Card content');
    }
  }
  
  // Save changes
  fs.writeFileSync(f, content, 'utf8');
  console.log(`Saved changes to ${f}`);
});
