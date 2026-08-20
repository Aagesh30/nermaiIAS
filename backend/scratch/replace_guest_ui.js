const fs = require('fs');
const path = require('path');

const webPortalPath = path.join(__dirname, '../../web_portal/App.tsx');
const friendPath = path.join(__dirname, '../../friend/App.tsx.txt');

console.log('Reading files...');
const webPortalContent = fs.readFileSync(webPortalPath, 'utf8');
const friendContent = fs.readFileSync(friendPath, 'utf8');

// 1. Extract guest UI blocks (both !user and role === "guest") from friendContent
console.log('Extracting guest UI blocks from friend code...');
const friendStartPattern = '  // When activeAttempt, reviewMode, or studyModalVisible is set, skip this block so those screens can render\n  // ─── STANDALONE REGISTER / SIGN IN FLOW (BEFORE PORTAL ACCESS) ───────────\n  if (!user && !activeAttempt && !reviewMode && !studyModalVisible) {';
const friendEndPattern = '  // Render main screen';

let startIdx = friendContent.indexOf(friendStartPattern);
if (startIdx === -1) {
    // try searching without exact newlines/spaces
    const fallbackStartPattern = '  if (!user && !activeAttempt && !reviewMode && !studyModalVisible) {';
    startIdx = friendContent.indexOf(fallbackStartPattern);
    if (startIdx === -1) {
        console.error('Could not find start pattern in friend file!');
        process.exit(1);
    }
}

const endIdx = friendContent.indexOf(friendEndPattern, startIdx);
if (endIdx === -1) {
    console.error('Could not find end pattern in friend file!');
    process.exit(1);
}

// Extract block and get last closing brace before "// Render main screen"
let friendBlocks = friendContent.substring(startIdx, endIdx);
const lastClosingBraceIdx = friendBlocks.lastIndexOf('}');
if (lastClosingBraceIdx === -1) {
    console.error('Could not find closing brace in friend blocks!');
    process.exit(1);
}
friendBlocks = friendBlocks.substring(0, lastClosingBraceIdx + 1);
console.log('Friend blocks extracted successfully. Length:', friendBlocks.length);

// 2. Find target combined guest block in webPortalContent
console.log('Finding old guest block in web_portal/App.tsx...');
const webPortalStartPattern = '  if ((!user || user?.role === "guest") && !activeAttempt && !reviewMode && !studyModalVisible) {';
const webPortalEndPattern = '  // Render main screen';

const webStartIdx = webPortalContent.indexOf(webPortalStartPattern);
if (webStartIdx === -1) {
    console.error('Could not find start pattern in current App.tsx!');
    process.exit(1);
}

const webEndIdx = webPortalContent.indexOf(webPortalEndPattern, webStartIdx);
if (webEndIdx === -1) {
    console.error('Could not find end pattern in current App.tsx!');
    process.exit(1);
}

// Find the last closing brace of the guest portal block in web_portal/App.tsx
let webBlock = webPortalContent.substring(webStartIdx, webEndIdx);
const webLastClosingBraceIdx = webBlock.lastIndexOf('}');
if (webLastClosingBraceIdx === -1) {
    console.error('Could not find closing brace in current App.tsx block!');
    process.exit(1);
}
const webBlockLength = webLastClosingBraceIdx + 1;

console.log('Replacing guest UI block in web_portal/App.tsx...');
const updatedContent = webPortalContent.substring(0, webStartIdx) + friendBlocks + webPortalContent.substring(webStartIdx + webBlockLength);

console.log('Writing updated code to web_portal/App.tsx...');
fs.writeFileSync(webPortalPath, updatedContent, 'utf8');
console.log('Replacement complete successfully!');
