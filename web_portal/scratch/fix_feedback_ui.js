const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                                    <View style={{
                                                      width: 22,
                                                      height: 22,
                                                      borderRadius: 11,
                                                      backgroundColor: darkMode ? "#2b6cb0" : "#ebf8ff",
                                                      alignItems: "center",
                                                      justifyContent: "center"
                                                    }}>
                                                      <Ionicons name="person" size={11} color="#3182ce" />
                                                    </View>
                                                    <Text style={{ fontSize: 12, fontWeight: "700", color: darkMode ? "#e2e8f0" : "#2d3748" }}>
                                                      {f.studentName || "Student"}
                                                    </Text>
                                                    {f.studentEmail ? (
                                                      <Text style={{ fontSize: 11, color: darkMode ? "#718096" : "#a0aec0" }}>
                                                        ({f.studentEmail})
                                                      </Text>
                                                    ) : null}
                                                  </View>

                                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 1 }}>
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                      <Ionicons
                                                        key={i}
                                                        name={i < (Number(f.rating) || 5) ? "star" : "star-outline"}
                                                        size={13}
                                                        color="#fbc02d"
                                                      />
                                                    ))}
                                                  </View>
                                                </View>`;

const replacement = `<View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 160 }}>
                                                    <View style={{
                                                      width: 26,
                                                      height: 26,
                                                      borderRadius: 13,
                                                      backgroundColor: darkMode ? "#2b6cb0" : "#ebf8ff",
                                                      alignItems: "center",
                                                      justifyContent: "center"
                                                    }}>
                                                      <Ionicons name="person" size={12} color="#3182ce" />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                      <Text style={{ fontSize: 12, fontWeight: "700", color: darkMode ? "#e2e8f0" : "#2d3748" }} numberOfLines={1}>
                                                        {f.studentName || "Student"}
                                                      </Text>
                                                      {f.studentEmail ? (
                                                        <Text style={{ fontSize: 11, color: darkMode ? "#a0aec0" : "#718096" }} numberOfLines={1}>
                                                          {f.studentEmail}
                                                        </Text>
                                                      ) : null}
                                                    </View>
                                                  </View>

                                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: darkMode ? "#2a2a2a" : "#fff8e1", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: darkMode ? "#444" : "#ffe082" }}>
                                                    {Array.from({ length: 5 }).map((_, i) => (
                                                      <Ionicons
                                                        key={i}
                                                        name={i < (Number(f.rating) || 5) ? "star" : "star-outline"}
                                                        size={12}
                                                        color="#fbc02d"
                                                      />
                                                    ))}
                                                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#f57f17", marginLeft: 3 }}>
                                                      {(Number(f.rating) || 5).toFixed(1)}
                                                    </Text>
                                                  </View>
                                                </View>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated feedback card header in App.tsx!');
} else {
  console.log('Target snippet not found in App.tsx!');
}
