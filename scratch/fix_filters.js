const fs = require('fs');

const filePath = 'd:/unistrix/NERMAI_IAS_ACADEMY/web_portal/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to avoid \r\n issues
content = content.replace(/\r\n/g, '\n');

// 1. Replace the list filter function
const oldFilter = 'if (filterDirType !== "all" && String(s.type || "").toLowerCase() !== filterDirType.toLowerCase()) return false;';

const newFilter = `if (filterDirType !== "all") {
                                      const typeLower = filterDirType.toLowerCase();
                                      const hasDirectType = String(s.type || "").toLowerCase() === typeLower;
                                      let hasBatchMode = false;
                                      if (s.batchModes) {
                                        for (const key of Object.keys(s.batchModes)) {
                                          const modes = s.batchModes[key];
                                          if (Array.isArray(modes) && modes.map(m => String(m).toLowerCase()).includes(typeLower)) {
                                            hasBatchMode = true;
                                            break;
                                          }
                                        }
                                      }
                                      if (!hasDirectType && !hasBatchMode) return false;
                                    }`;

if (content.includes(oldFilter)) {
  content = content.replace(oldFilter, newFilter);
  console.log("Successfully replaced filter logic.");
} else {
  console.error("Failed to find old filter logic in file.");
}

// 2. Replace Candidate Profile Details badges
// We search for it with 48 spaces
const oldBadges = `                                                <View style={{ backgroundColor: darkMode ? "#c6282820" : "#e0f7fa", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                  <Text style={{ color: darkMode ? "#ff8a80" : "#006064", fontSize: 10, fontWeight: "bold" }}>{(s.type || "offline").toUpperCase()}</Text>
                                                </View>
                                                <View style={{ backgroundColor: darkMode ? "#2e7d3220" : "#e8f5e9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                  <Text style={{ color: darkMode ? "#81c784" : "#2e7d32", fontSize: 10, fontWeight: "bold" }}>{s.batch || "No Batch"}</Text>
                                                </View>`;

const newBadges = `                                                {(() => {
                                                  const bList = Array.isArray(s.batches) ? s.batches : (s.batch ? [s.batch] : []);
                                                  if (bList.length === 0) {
                                                    return (
                                                      <View style={{ backgroundColor: darkMode ? "#2e7d3220" : "#e8f5e9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                        <Text style={{ color: darkMode ? "#81c784" : "#2e7d32", fontSize: 10, fontWeight: "bold" }}>No Batch</Text>
                                                      </View>
                                                    );
                                                  }
                                                  return bList.map((bName) => {
                                                    const modes = (s.batchModes || {})[bName] || [];
                                                    const modesStr = modes.length > 0 ? modes.map(m => String(m).toUpperCase()).join(", ") : (s.type || "offline").toUpperCase();
                                                    return (
                                                      <View key={bName} style={{ flexDirection: "row", gap: 4, alignItems: "center", marginBottom: 2 }}>
                                                        <View style={{ backgroundColor: darkMode ? "#2e7d3220" : "#e8f5e9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                          <Text style={{ color: darkMode ? "#81c784" : "#2e7d32", fontSize: 10, fontWeight: "bold" }}>{bName}</Text>
                                                        </View>
                                                        <View style={{ backgroundColor: darkMode ? "#c6282820" : "#e0f7fa", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                          <Text style={{ color: darkMode ? "#ff8a80" : "#006064", fontSize: 10, fontWeight: "bold" }}>{modesStr}</Text>
                                                        </View>
                                                      </View>
                                                    );
                                                  });
                                                })()}`;

if (content.includes(oldBadges)) {
  content = content.replace(oldBadges, newBadges);
  console.log("Successfully replaced Candidate Profile Details badges.");
} else {
  console.error("Failed to find old badges in file.");
}

// 3. Replace directory list items text
const oldListText = `<Text style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>Roll: {s.rollNumber || s.loginUsername || "N/A"} | Batch: {s.batch || "N/A"}</Text>`;

const newListText = `<Text style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>
                                              Roll: {s.rollNumber || s.loginUsername || "N/A"} | {(() => {
                                                const bList = Array.isArray(s.batches) ? s.batches : (s.batch ? [s.batch] : []);
                                                if (bList.length === 0) return "No Batch";
                                                return bList.map(bName => {
                                                  const modes = (s.batchModes || {})[bName] || [];
                                                  const modesStr = modes.length > 0 ? modes.map(m => String(m).toLowerCase()).join("/") : (s.type || "offline").toLowerCase();
                                                  return \`\${bName} (\${modesStr})\`;
                                                }).join(", ");
                                              })()}
                                            </Text>`;

if (content.includes(oldListText)) {
  content = content.replace(oldListText, newListText);
  console.log("Successfully replaced directory list item text.");
} else {
  console.error("Failed to find old list text in file.");
}

// Save back
fs.writeFileSync(filePath, content, 'utf8');
console.log("File saved.");
