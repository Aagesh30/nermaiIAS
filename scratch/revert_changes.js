const fs = require('fs');

const files = ['App.tsx', 'web_portal/App.tsx', 'mobile/App.tsx'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  
  let content = fs.readFileSync(f, 'utf8');
  console.log(`Reverting file ${f}...`);
  
  // Revert import modifications
  content = content.replace('TouchableOpacity as RNTouchableOpacity', 'TouchableOpacity');
  content = content.replace(',\n  Animated\n} from "react-native"', '\n} from "react-native"');
  content = content.replace(',\n  Animated\n  } from "react-native"', '\n} from "react-native"');
  content = content.replace(',\n  Animated} from "react-native"', '\n} from "react-native"');
  content = content.replace(', Animated', '');
  
  // Revert custom components block
  const customCompStart = content.indexOf('// ================== CUSTOM LOADING ANIMATIONS & SKELETONS ==================');
  if (customCompStart !== -1) {
    const customCompEnd = content.indexOf('// Fallback layout', customCompStart);
    if (customCompEnd !== -1) {
      // Find the end of the fallback layout component (next closing brace or ScrollView block)
      const nextFunction = content.indexOf('export default function App()', customCompEnd);
      if (nextFunction !== -1) {
        content = content.substring(0, customCompStart) + content.substring(nextFunction);
        console.log('  Removed custom components block');
      }
    }
  }
  
  // Revert pageLoading state
  content = content.replace('\n  const [pageLoading, setPageLoading] = React.useState(false);', '');
  
  // Revert useEffect
  const useEffectIndex = content.indexOf('React.useEffect(() => {\n    setPageLoading(true);');
  if (useEffectIndex !== -1) {
    const useEffectEnd = content.indexOf(']);\n', useEffectIndex);
    if (useEffectEnd !== -1) {
      content = content.substring(0, useEffectIndex) + content.substring(useEffectEnd + 4);
      console.log('  Removed useEffect');
    }
  }
  
  // Revert wrapped blocks
  content = content.replace('\n{pageLoading ? (<PageSkeleton tab="erp" darkMode={darkMode} />) : (<>\n', '');
  content = content.replace('\n</>)}\n', '\n');
  content = content.replace('\n{pageLoading ? (<PageSkeleton tab={activeTab} subTab={activeTab === "erp" ? erpSub : activeTab === "lms" ? lmsSub : activeTab === "crm" ? crmSub : undefined} darkMode={darkMode} />) : (<>\n', '');
  content = content.replace('\n{pageLoading ? (<PageSkeleton tab={guestTab} darkMode={darkMode} />) : (\n', '');
  content = content.replace('\n</ScrollView>\n)}\n', '\n</ScrollView>\n');
  
  content = content.replace('\n{pageLoading ? (\n  <View style={{ gap: 15, paddingVertical: 20 }}>\n    <Shimmer darkMode={false} style={{ width: "100%", height: 40, borderRadius: 8 }} />\n    <Shimmer darkMode={false} style={{ width: "100%", height: 40, borderRadius: 8 }} />\n    <Shimmer darkMode={false} style={{ width: "100%", height: 45, borderRadius: 8, marginTop: 10 }} />\n  </View>\n) : (<>\n', '');
  
  fs.writeFileSync(f, content, 'utf8');
  console.log(`Reverted ${f}`);
});
