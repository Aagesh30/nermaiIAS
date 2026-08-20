const fs = require('fs');
const path = require('path');

const webPortalPath = path.join(__dirname, '../../web_portal/App.tsx');
const friendPath = path.join(__dirname, '../../friend/App.tsx.txt');

console.log('Reading files...');
const webPortalContent = fs.readFileSync(webPortalPath, 'utf8');
const friendContent = fs.readFileSync(friendPath, 'utf8');

// 1. Extract SplashScreen and OnboardingScreens components from friendContent
console.log('Extracting SplashScreen and OnboardingScreens from friend code...');
const startPattern = '// ─── SPLASH SCREEN ────────────────────────────────────────────────────────────';
const endPattern = 'const getSavedNav = () => {';

const startIdx = friendContent.indexOf(startPattern);
if (startIdx === -1) {
    console.error('Could not find SplashScreen start pattern in friend file!');
    process.exit(1);
}

const endIdx = friendContent.indexOf(endPattern, startIdx);
if (endIdx === -1) {
    console.error('Could not find SplashScreen end pattern in friend file!');
    process.exit(1);
}

const componentsContent = friendContent.substring(startIdx, endIdx);
console.log('Extracted components content length:', componentsContent.length);

// 2. Insert components right before "function MainApp()" in webPortalContent
console.log('Inserting components before MainApp definition in current App.tsx...');
const mainAppPattern = 'function MainApp() {';
const mainAppIdx = webPortalContent.indexOf(mainAppPattern);
if (mainAppIdx === -1) {
    console.error('Could not find MainApp definition in current App.tsx!');
    process.exit(1);
}

let updatedContent = webPortalContent.substring(0, mainAppIdx) + componentsContent + '\n\n' + webPortalContent.substring(mainAppIdx);

// 3. Extract the updated export default function App() block from friendContent
console.log('Extracting export default function App() wrapper from friend code...');
const appWrapperPattern = 'export default function App() {';
const appStartIdx = friendContent.indexOf(appWrapperPattern);
if (appStartIdx === -1) {
    console.error('Could not find export default function App() start in friend file!');
    process.exit(1);
}

// Find last closing brace of export default function App() in friendContent
// Since it is the end of the file except for styling, let's find "const styles = StyleSheet.create({"
const friendStylesPattern = 'const styles = StyleSheet.create({';
const friendStylesIdx = friendContent.indexOf(friendStylesPattern, appStartIdx);
if (friendStylesIdx === -1) {
    console.error('Could not find styles pattern in friend file!');
    process.exit(1);
}

const appWrapperContent = friendContent.substring(appStartIdx, friendStylesIdx);
console.log('Extracted App wrapper length:', appWrapperContent.length);

// 4. Replace export default function App() wrapper in updatedContent
console.log('Finding export default function App() wrapper in current App.tsx...');
const webAppStartIdx = updatedContent.indexOf('export default function App() {');
if (webAppStartIdx === -1) {
    console.error('Could not find export default function App() start in current App.tsx!');
    process.exit(1);
}

const webStylesIdx = updatedContent.indexOf('const styles = StyleSheet.create({', webAppStartIdx);
if (webStylesIdx === -1) {
    console.error('Could not find styles pattern in current App.tsx!');
    process.exit(1);
}

updatedContent = updatedContent.substring(0, webAppStartIdx) + appWrapperContent + updatedContent.substring(webStylesIdx);

console.log('Writing updated code to web_portal/App.tsx...');
fs.writeFileSync(webPortalPath, updatedContent, 'utf8');
console.log('SplashScreen and OnboardingScreens added successfully!');
