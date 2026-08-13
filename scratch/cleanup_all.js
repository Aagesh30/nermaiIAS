const fs = require('fs');

const files = ['App.tsx', 'web_portal/App.tsx', 'mobile/App.tsx'];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  console.log(`Cleaning ${f}...`);
  
  // Restore imports
  content = content.replace(/import\s*\{\s*([\s\S]*?)\s*\}\s*from\s*["']react-native["']/g, (match, list) => {
    let cleanList = list
      .replace('TouchableOpacity as RNTouchableOpacity', 'TouchableOpacity')
      .replace(/,\s*Animated/g, '')
      .replace(/Animated\s*,\s*/g, '');
    return 'import {\n  ' + cleanList.split(',').map(s => s.trim()).filter(Boolean).join(',\n  ') + '\n} from "react-native"';
  });
  
  // Remove custom components
  const customCompStart = content.indexOf('// ================== CUSTOM LOADING ANIMATIONS & SKELETONS ==================');
  if (customCompStart !== -1) {
    const fallbackLayoutEnd = content.indexOf('// Fallback layout', customCompStart);
    if (fallbackLayoutEnd !== -1) {
      // Find the end of PageSkeleton: look for the closing of function PageSkeleton
      // PageSkeleton ends with "return ( ... ); \n }"
      // Let's find "export default function App()" or "function MainApp()"
      let nextPos = content.indexOf('export default function App()', fallbackLayoutEnd);
      if (nextPos === -1) {
        nextPos = content.indexOf('function MainApp()', fallbackLayoutEnd);
      }
      if (nextPos !== -1) {
        content = content.substring(0, customCompStart) + content.substring(nextPos);
      }
    }
  }
  
  // Remove pageLoading state
  content = content.replace(/\s*const\s*\[pageLoading,\s*setPageLoading\]\s*=\s*React\.useState\(false\);/g, '');
  
  // Remove useEffects
  content = content.replace(/\s*React\.useEffect\(\(\)\s*=>\s*\{\s*setPageLoading\(true\);[\s\S]*?\}\s*,\s*\[[\s\S]*?\]\);\n/g, '');
  
  // Remove pageLoading wrappers
  // 1. splitContent wrapper
  content = content.replace(/\s*\{pageLoading\s*\?\s*\(\s*<PageSkeleton\s+tab="erp"\s+darkMode=\{darkMode\}\s*\/>\s*\)\s*:\s*\(\s*<>\s*/g, '');
  content = content.replace(/\s*<\/>\s*\)\s*\}\s*<\/View>\s*<\/View>\s*<\/SafeAreaView>\s*\);\s*\}/g, (match) => {
    // If it matched the very end of splitContent inside the main return, clean it
    return match.replace('</>)}', '');
  });
  content = content.replace(/\s*<\/>\s*\)\s*\}\s*$/gm, '');
  content = content.replace(/<\/>\s*\)\s*\}/g, '');
  
  // 2. mainBody wrapper
  content = content.replace(/\s*\{pageLoading\s*\?\s*\(\s*<PageSkeleton\s+tab=\{activeTab\}[\s\S]*?\/>\s*\)\s*:\s*\(\s*<>\s*/g, '');
  content = content.replace(/\s*<\/>\s*\)\s*\}\s*\{\/\*\s*Bottom Tab Bar/g, '\n      {/* Bottom Tab Bar');
  content = content.replace(/\s*<\/>\s*\)\s*\}\s*$/gm, '');
  content = content.replace(/<\/>\s*\)\s*\}/g, '');
  
  // 3. Guest wrapper
  content = content.replace(/\s*\{pageLoading\s*\?\s*\(\s*<PageSkeleton\s+tab=\{guestTab\}[\s\S]*?\/>\s*\)\s*:\s*\(\s*/g, '');
  content = content.replace(/\s*\}\)\s*\}\s*<\/SafeAreaView>/g, '\n      </SafeAreaView>');
  content = content.replace(/\s*\}\)\s*\}\s*$/gm, '');
  
  // 4. Auth Card wrapper
  content = content.replace(/\s*\{pageLoading\s*\?\s*\(\s*<View\s+style=\{\{\s*gap:\s*15,\s*paddingVertical:\s*20\s*\}\}>\s*<Shimmer[\s\S]*?\/>\s*<\/View>\s*\)\s*:\s*\(\s*<>\s*/g, '');
  
  // Clean up any remaining dangling </>)} or )}
  // Let's remove any instances of </>)} or )} that were added
  
  fs.writeFileSync(f, content, 'utf8');
  console.log(`Cleaned ${f}`);
});
