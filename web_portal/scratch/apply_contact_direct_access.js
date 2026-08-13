const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Target guest bottom nav tab onPress handler
const s1 = `              onPress={() => {
                if (tab.key === "home") {
                  setGuestTab("home");
                } else if (!user) {
                  setPendingGuestTab(tab.key);
                  setShowGuestGoogleAuthModal(true);
                } else {
                  setGuestTab(tab.key);
                }
              }}`;

const r1 = `              onPress={() => {
                if (tab.key === "home" || tab.key === "register") {
                  setGuestTab(tab.key);
                } else if (!user) {
                  setPendingGuestTab(tab.key);
                  setShowGuestGoogleAuthModal(true);
                } else {
                  setGuestTab(tab.key);
                }
              }}`;

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

performReplace(s1, r1, "Guest Contact tab direct access");

fs.writeFileSync(filePath, content, 'utf8');
console.log("GUEST CONTACT DIRECT ACCESS FIXED SUCCESSFULLY!");
