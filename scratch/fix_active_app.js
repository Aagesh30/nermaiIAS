const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// Fix 1: The photo block missing closing tags
const target1 = `                  <View style={{ width: 65, height: 75, borderWidth: 1.5, borderColor: "#bdbdbd", borderRadius: 4, backgroundColor: "#eeeeee", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {student.photoBase64 && student.photoBase64 !== "test" ? (
                      <Image source={{ uri: student.photoBase64 }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                    ) : student.photoUrl ? (
                      <Image source={{ uri: student.photoUrl }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                    ) : (
                      <>
                        <Ionicons name="person" size={30} color="#9e9e9e" />
                        <Text style={{ fontSize: 7, color: "#9e9e9e", marginTop: 4, fontWeight: "bold" }}>PHOTO</Text>
                  </View>`;

const replacement1 = `                  <View style={{ width: 65, height: 75, borderWidth: 1.5, borderColor: "#bdbdbd", borderRadius: 4, backgroundColor: "#eeeeee", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {student.photoBase64 && student.photoBase64 !== "test" ? (
                      <Image source={{ uri: student.photoBase64 }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                    ) : student.photoUrl ? (
                      <Image source={{ uri: student.photoUrl }} style={{ width: "100%", height: "100%", resizeMode: "cover" }} />
                    ) : (
                      <>
                        <Ionicons name="person" size={30} color="#9e9e9e" />
                        <Text style={{ fontSize: 7, color: "#9e9e9e", marginTop: 4, fontWeight: "bold" }}>PHOTO</Text>
                      </>
                    )}
                  </View>`;

// Fix 2: The end of Page 2 in renderHallTicket missing closing tags
const target2 = `              {/* Page Indicator */}
              <View style={{ position: "absolute", bottom: 4, right: 10 }}>
                <Text style={{ fontSize: 8, color: "#9e9e9e", fontWeight: "bold" }}>Page 2 of 2</Text>
              </View>
        </View>
      );`;

const replacement2 = `              {/* Page Indicator */}
              <View style={{ position: "absolute", bottom: 4, right: 10 }}>
                <Text style={{ fontSize: 8, color: "#9e9e9e", fontWeight: "bold" }}>Page 2 of 2</Text>
              </View>
            </>
          )}
        </View>
      );`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  console.log("SUCCESS: Fix #1 applied.");
} else {
  console.error("ERROR: Target 1 not found!");
}

if (content.includes(target2)) {
  content = content.replace(target2, replacement2);
  console.log("SUCCESS: Fix #2 applied.");
} else {
  console.error("ERROR: Target 2 not found!");
}

fs.writeFileSync(appPath, content, 'utf8');
console.log("File written. Running compiler check...");
