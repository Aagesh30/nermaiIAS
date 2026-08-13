const fs = require('fs');

const rootApp = fs.readFileSync('App.tsx', 'utf8');

// 1. Rename "export default function App()" to "function MainApp()"
let webApp = rootApp.replace('export default function App()', 'function MainApp()');

// 2. Add imports for SafeAreaProvider if needed
if (!webApp.includes('SafeAreaProvider')) {
  webApp = webApp.replace(
    'import { SafeAreaView } from "react-native-safe-area-context";',
    'import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";'
  );
}

// 3. Append the export default function App() wrapping MainApp
const appWrapper = `

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}
`;

webApp = webApp + appWrapper;

fs.writeFileSync('web_portal/App.tsx', webApp, 'utf8');
console.log('Reconstructed web_portal/App.tsx successfully');
