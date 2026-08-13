const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

const target = `                          <TouchableOpacity onPress={() => devDeleteDoc(devSelectedDocId!)} style={{ backgroundColor: "rgba(198, 40, 40, 0.1)", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#c62828" }}>
                            <Text style={{ color: "#c62828", fontSize: 11 }}>🗑 Delete</Text>
                          </TouchableOpacity>
                      {devEditMode === "edit" && (`;

const replacement = `                          <TouchableOpacity onPress={() => devDeleteDoc(devSelectedDocId!)} style={{ backgroundColor: "rgba(198, 40, 40, 0.1)", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#c62828" }}>
                            <Text style={{ color: "#c62828", fontSize: 11 }}>🗑 Delete</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {devEditMode === "edit" && (`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  console.log("SUCCESS: Fix applied.");
} else {
  console.error("ERROR: Target not found!");
}

fs.writeFileSync(appPath, content, 'utf8');
console.log("File written.");
