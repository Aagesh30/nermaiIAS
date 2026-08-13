const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Target selectPhotoIdType
const s1 = `  const selectPhotoIdType = (docType: string) => {
    Alert.alert(
      "Confirm Document Selection",
      \`Confirm to select '\${docType}' as your uploaded Photo ID?\`,
      [
        { text:"Cancel", style:"cancel"},
        {
          text:"Confirm",
          style:"default",
          onPress: () => {
            setProfileForm(prev => ({ ...prev, photoIdType: docType, photoIdConfirmed: true }));
          }
        }
      ]
    );
  };`;

const r1 = `  const selectPhotoIdType = (docType: string) => {
    if (Platform.OS === "web") {
      const confirmSelection = window.confirm(\`Confirm to select '\${docType}' as your uploaded Photo ID?\`);
      if (confirmSelection) {
        setProfileForm(prev => ({ ...prev, photoIdType: docType, photoIdConfirmed: true }));
      }
    } else {
      Alert.alert(
        "Confirm Document Selection",
        \`Confirm to select '\${docType}' as your uploaded Photo ID?\`,
        [
          { text:"Cancel", style:"cancel"},
          {
            text:"Confirm",
            style:"default",
            onPress: () => {
              setProfileForm(prev => ({ ...prev, photoIdType: docType, photoIdConfirmed: true }));
            }
          }
        ]
      );
    }
  };`;

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

performReplace(s1, r1, "selectPhotoIdType alert fix");

fs.writeFileSync(filePath, content, 'utf8');
console.log("ALERT FIX SUCCESSFUL!");
