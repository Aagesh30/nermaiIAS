const fs = require('fs');

console.log("Applying fee alert clashing permanent fixes on view layer...");

// 1. Patch mobile App.tsx
const mobilePath = 'App.tsx';
let mobileContent = fs.readFileSync(mobilePath, 'utf8');
mobileContent = mobileContent.replace(/\r\n/g, '\n');

const targetMobileNotif = `              {/* Notifications Center for Users */}
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>🔔 System Alerts & Notifications</Text>
                {notifications.length === 0 ? (
                  <View style={[styles.card, { padding: 15, alignItems: "center" }]}>
                    <Text style={styles.emptyText}>No notifications received yet.</Text>
                  </View>
                ) : (
                  notifications.map(notif => {`;

const replacementMobileNotif = `              {/* Notifications Center for Users */}
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>🔔 System Alerts & Notifications</Text>
                {(() => {
                  const filtered = notifications.filter((n: any) => !((n.title || "").includes("Fee Payment Alert") || (n.message || "").toLowerCase().includes("pay your pending") || (n.message || "").toLowerCase().includes("pending tuition fee")));
                  if (filtered.length === 0) {
                    return (
                      <View style={[styles.card, { padding: 15, alignItems: "center" }]}>
                        <Text style={styles.emptyText}>No notifications received yet.</Text>
                      </View>
                    );
                  }
                  return filtered.map(notif => {
                    const formattedDate = notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : "";
                    return (
                      <View key={notif.id} style={[styles.card, { marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#1565c0", backgroundColor: darkMode ? "#1a2c3d" : "#e3f2fd" }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Ionicons name="notifications" size={15} color="#1565c0" />
                          <Text style={{ fontWeight: "bold", color: "#1565c0", fontSize: 11 }}>SYSTEM BROADCAST</Text>
                        </View>
                        <Text style={{ fontWeight: "bold", color: darkMode ? "#e0e0e0" : "#212121", fontSize: 13 }}>{notif.title}</Text>
                        <Text style={{ color: darkMode ? "#cccccc" : "#424242", fontSize: 12, marginTop: 2 }}>{notif.message}</Text>
                        <Text style={{ color: darkMode ? "#888" : "#888", fontSize: 10, marginTop: 6 }}>
                          Sent: {formattedDate} | By: {notif.sentBy || "Admin"}
                        </Text>
                      </View>
                    );
                  });
                })()}`;

const targetMobileLoopOriginal = `                  notifications.map(notif => {
                    const formattedDate = notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : "";
                    return (
                      <View key={notif.id} style={[styles.card, { marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#1565c0", backgroundColor: darkMode ? "#1a2c3d" : "#e3f2fd" }]}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <Ionicons name="notifications" size={15} color="#1565c0" />
                          <Text style={{ fontWeight: "bold", color: "#1565c0", fontSize: 11 }}>SYSTEM BROADCAST</Text>
                        </View>
                        <Text style={{ fontWeight: "bold", color: darkMode ? "#e0e0e0" : "#212121", fontSize: 13 }}>{notif.title}</Text>
                        <Text style={{ color: darkMode ? "#cccccc" : "#424242", fontSize: 12, marginTop: 2 }}>{notif.message}</Text>
                        <Text style={{ color: darkMode ? "#888" : "#888", fontSize: 10, marginTop: 6 }}>
                          Sent: {formattedDate} | By: {notif.sentBy || "Admin"}
                        </Text>
                      </View>
                    );
                  })`;

if (mobileContent.indexOf(targetMobileNotif) === -1) {
  console.error("ERROR: targetMobileNotif not found!");
  process.exit(1);
}
mobileContent = mobileContent.replace(targetMobileNotif, replacementMobileNotif);
// Remove duplicate original loop mapping if any (replacementMobileNotif duplicates rendering details)
mobileContent = mobileContent.split(replacementMobileNotif + '\n                )').join(') : (');
mobileContent = mobileContent.split(targetMobileLoopOriginal).join('');

fs.writeFileSync(mobilePath, mobileContent, 'utf8');
console.log("- Patched mobile notifications loop successfully.");


// 2. Patch web_portal/App.tsx
const webPath = 'web_portal/App.tsx';
let webContent = fs.readFileSync(webPath, 'utf8');
webContent = webContent.replace(/\r\n/g, '\n');

// 2a. Guest Notice Board
const targetWebGuest = `              {/* Guest Official Announcement & Notice Board */}
              <View style={{ marginTop: 5 }}>
                <Text style={styles.sectionTitle}>Official Announcements & Notices</Text>
                {announcements.length === 0 ? (
                  <View style={[styles.card, { padding: 15, alignItems: "center" }]}>
                    <Ionicons name="megaphone-outline" size={32} color="#bdbdbd" style={{ marginBottom: 6 }} style={{ marginBottom: 6 }} />
                    <Text style={styles.emptyText}>No active announcements posted yet.</Text>
                  </View>
                ) : (
                  announcements.map((n: any) => (
                    <View
                      key={n.id}
                      style={[
                        styles.card,
                        {
                          marginBottom: 10,
                          borderLeftWidth: 4,
                          borderLeftColor: n.priority === "high" ? "#c62828" : "#1565c0",
                          backgroundColor: n.priority === "high" ? "#fff5f5" : "#f4f8fb"
                        }
                      ]}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="megaphone" size={16} color={n.priority === "high" ? "#c62828" : "#1565c0"} />
                          <Text style={{ fontWeight: "bold", fontSize: 11, color: n.priority === "high" ? "#c62828" : "#1565c0" }}>
                            {n.priority === "high" ? "HIGH PRIORITY NOTICE" : "NOTICE"}
                          </Text>
                        </View>
                        {n.publishedAt && (
                          <Text style={{ fontSize: 10, color: "#757575" }}>
                            {new Date(n.publishedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 14, marginBottom: 4 }}>{n.title}</Text>
                      <Text style={{ color: "#424242", fontSize: 13, lineHeight: 19 }}>{n.content}</Text>
                    </View>
                  ))
                )}`;

const replacementWebGuest = `              {/* Guest Official Announcement & Notice Board */}
              <View style={{ marginTop: 5 }}>
                <Text style={styles.sectionTitle}>Official Announcements & Notices</Text>
                {(() => {
                  const filtered = announcements.filter((n: any) => !((n.title || "").includes("Fee Payment Alert") || (n.content || "").toLowerCase().includes("pay your pending") || (n.content || "").toLowerCase().includes("pending tuition fee")));
                  if (filtered.length === 0) {
                    return (
                      <View style={[styles.card, { padding: 15, alignItems: "center" }]}>
                        <Ionicons name="megaphone-outline" size={32} color="#bdbdbd" style={{ marginBottom: 6 }} />
                        <Text style={styles.emptyText}>No active announcements posted yet.</Text>
                      </View>
                    );
                  }
                  return filtered.map((n: any) => (
                    <View
                      key={n.id}
                      style={[
                        styles.card,
                        {
                          marginBottom: 10,
                          borderLeftWidth: 4,
                          borderLeftColor: n.priority === "high" ? "#c62828" : "#1565c0",
                          backgroundColor: n.priority === "high" ? "#fff5f5" : "#f4f8fb"
                        }
                      ]}
                    >
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="megaphone" size={16} color={n.priority === "high" ? "#c62828" : "#1565c0"} />
                          <Text style={{ fontWeight: "bold", fontSize: 11, color: n.priority === "high" ? "#c62828" : "#1565c0" }}>
                            {n.priority === "high" ? "HIGH PRIORITY NOTICE" : "NOTICE"}
                          </Text>
                        </View>
                        {n.publishedAt && (
                          <Text style={{ fontSize: 10, color: "#757575" }}>
                            {new Date(n.publishedAt).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 14, marginBottom: 4 }}>{n.title}</Text>
                      <Text style={{ color: "#424242", fontSize: 13, lineHeight: 19 }}>{n.content}</Text>
                    </View>
                  ));
                })()}`;

// Check if double style attribute is there (due to potential backup merge typo)
let cleanTargetWebGuest = targetWebGuest;
if (webContent.indexOf(cleanTargetWebGuest) === -1) {
  // Try matching with single style attribute
  cleanTargetWebGuest = targetWebGuest.replace('style={{ marginBottom: 6 }} style={{ marginBottom: 6 }}', 'style={{ marginBottom: 6 }}');
}

if (webContent.indexOf(cleanTargetWebGuest) === -1) {
  console.error("ERROR: cleanTargetWebGuest not found!");
  process.exit(1);
}
webContent = webContent.split(cleanTargetWebGuest).join(replacementWebGuest);
console.log("- Patched web guest notice board successfully.");


// 2b. Student Notice Board
const targetWebStudent = `                  {/* Official Notice Board Section for Students */}
                  <View style={{ marginTop: 5 }}>
                    <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark, { marginBottom: 10 }]}>Official Announcements & Notice Board</Text>
                    {announcements.length === 0 ? (
                      <View style={[styles.card, darkMode && styles.cardDark, { padding: 15, alignItems:"center"}]}>
                        <Ionicons name="megaphone-outline"size={32} color={darkMode ?"#757575":"#bdbdbd"} style={{ marginBottom: 6 }} />
                        <Text style={[styles.emptyText, darkMode && styles.emptyTextDark]}>No official announcements posted yet.</Text>
                      </View>
                    ) : (
                      announcements.map((n: any) => (
                        <View
                          key={n.id}
                          style={[
                            styles.card,
                            darkMode && styles.cardDark,
                            {
                              marginBottom: 12,
                              borderLeftWidth: 4,
                              borderLeftColor: n.priority ==="high"?"#c62828":"#1976d2",
                              backgroundColor: n.priority ==="high"? (darkMode ?"#2c1a1a":"#fff5f5") : (darkMode ?"#1a2433":"#f4f8fb")
                            }
                          ]}
                        >
                          <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom: 6 }}>
                            <View style={{ flexDirection:"row", alignItems:"center", gap: 6 }}>
                              <Ionicons name="megaphone"size={16} color={n.priority ==="high"?"#c62828":"#1976d2"} />
                              <Text style={{ fontWeight:"bold", fontSize: 11, color: n.priority ==="high"?"#c62828":"#1976d2", textTransform:"uppercase"}}>
                                {n.priority ==="high"?"High Priority Notice":"Official Notice"}
                              </Text>
                            </View>
                            {n.publishedAt && (
                              <Text style={{ fontSize: 10, color: darkMode ?"#999":"#757575"}}>
                                {new Date(n.publishedAt).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                          <Text style={{ fontWeight:"bold", color: darkMode ?"#ffffff":"#212121", fontSize: 14, marginBottom: 4 }}>{n.title}</Text>
                          <Text style={{ color: darkMode ?"#cccccc":"#424242", fontSize: 13, lineHeight: 20 }}>{n.content}</Text>
                          {n.targetBatch && (
                            <View style={{ marginTop: 8, alignSelf:"flex-start", backgroundColor: n.priority ==="high"?"#ffebee":"#e3f2fd", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight:"bold", color: n.priority ==="high"?"#c62828":"#1976d2"}}>Batch: {n.targetBatch}</Text>
                            </View>
                          )}
                        </View>
                      ))
                    )}`;

const replacementWebStudent = `                  {/* Official Notice Board Section for Students */}
                  <View style={{ marginTop: 5 }}>
                    <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark, { marginBottom: 10 }]}>Official Announcements & Notice Board</Text>
                    {(() => {
                      const filtered = announcements.filter((n: any) => !((n.title || "").includes("Fee Payment Alert") || (n.content || "").toLowerCase().includes("pay your pending") || (n.content || "").toLowerCase().includes("pending tuition fee")));
                      if (filtered.length === 0) {
                        return (
                          <View style={[styles.card, darkMode && styles.cardDark, { padding: 15, alignItems:"center"}]}>
                            <Ionicons name="megaphone-outline"size={32} color={darkMode ?"#757575":"#bdbdbd"} style={{ marginBottom: 6 }} />
                            <Text style={[styles.emptyText, darkMode && styles.emptyTextDark]}>No official announcements posted yet.</Text>
                          </View>
                        );
                      }
                      return filtered.map((n: any) => (
                        <View
                          key={n.id}
                          style={[
                            styles.card,
                            darkMode && styles.cardDark,
                            {
                              marginBottom: 12,
                              borderLeftWidth: 4,
                              borderLeftColor: n.priority ==="high"?"#c62828":"#1976d2",
                              backgroundColor: n.priority ==="high"? (darkMode ?"#2c1a1a":"#fff5f5") : (darkMode ?"#1a2433":"#f4f8fb")
                            }
                          ]}
                        >
                          <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom: 6 }}>
                            <View style={{ flexDirection:"row", alignItems:"center", gap: 6 }}>
                              <Ionicons name="megaphone"size={16} color={n.priority ==="high"?"#c62828":"#1976d2"} />
                              <Text style={{ fontWeight:"bold", fontSize: 11, color: n.priority ==="high"?"#c62828":"#1976d2", textTransform:"uppercase"}}>
                                {n.priority ==="high"?"High Priority Notice":"Official Notice"}
                              </Text>
                            </View>
                            {n.publishedAt && (
                              <Text style={{ fontSize: 10, color: darkMode ?"#999":"#757575"}}>
                                {new Date(n.publishedAt).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                          <Text style={{ fontWeight:"bold", color: darkMode ?"#ffffff":"#212121", fontSize: 14, marginBottom: 4 }}>{n.title}</Text>
                          <Text style={{ color: darkMode ?"#cccccc":"#424242", fontSize: 13, lineHeight: 20 }}>{n.content}</Text>
                          {n.targetBatch && (
                            <View style={{ marginTop: 8, alignSelf:"flex-start", backgroundColor: n.priority ==="high"?"#ffebee":"#e3f2fd", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight:"bold", color: n.priority ==="high"?"#c62828":"#1976d2"}}>Batch: {n.targetBatch}</Text>
                            </View>
                          )}
                        </View>
                      ));
                    })()}`;

if (webContent.indexOf(targetWebStudent) === -1) {
  console.error("ERROR: targetWebStudent not found!");
  process.exit(1);
}
webContent = webContent.split(targetWebStudent).join(replacementWebStudent);
console.log("- Patched web student notice board successfully.");


// 2c. Student Notifications Center
const targetWebNotif = `              {/* Notifications Center for Users */}
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>System Alerts & Notifications</Text>
                {notifications.length === 0 ? (
                  <View style={[styles.card, { padding: 15, alignItems:"center"}]}>
                    <Text style={styles.emptyText}>No notifications received yet.</Text>
                  </View>
                ) : (
                  notifications.map(notif => {
                    const formattedDate = notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() :"";
                    return (
                      <View key={notif.id} style={[styles.card, { marginBottom: 12, borderLeftWidth: 4, borderLeftColor:"#1565c0", backgroundColor: darkMode ?"#1a2c3d":"#e3f2fd"}]}>
                        <View style={{ flexDirection:"row", alignItems:"center", gap: 6, marginBottom: 4 }}>
                          <Ionicons name="notifications"size={15} color="#1565c0"/>
                          <Text style={{ fontWeight:"bold", color:"#1565c0", fontSize: 11 }}>SYSTEM BROADCAST</Text>
                        </View>
                        <Text style={{ fontWeight:"bold", color: darkMode ?"#e0e0e0":"#212121", fontSize: 13 }}>{notif.title}</Text>
                        <Text style={{ color: darkMode ?"#cccccc":"#424242", fontSize: 12, marginTop: 2 }}>{notif.message}</Text>
                        <Text style={{ color: darkMode ?"#888":"#888", fontSize: 10, marginTop: 6 }}>
                          Sent: {formattedDate} | By: {notif.sentBy ||"Admin"}
                        </Text>
                      </View>
                    );
                  })
                )}`;

const replacementWebNotif = `              {/* Notifications Center for Users */}
              <View style={{ marginTop: 10 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>System Alerts & Notifications</Text>
                {(() => {
                  const filtered = notifications.filter((notif: any) => !((notif.title || "").includes("Fee Payment Alert") || (notif.message || "").toLowerCase().includes("pay your pending") || (notif.message || "").toLowerCase().includes("pending tuition fee")));
                  if (filtered.length === 0) {
                    return (
                      <View style={[styles.card, { padding: 15, alignItems:"center"}]}>
                        <Text style={styles.emptyText}>No notifications received yet.</Text>
                      </View>
                    );
                  }
                  return filtered.map(notif => {
                    const formattedDate = notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : "";
                    return (
                      <View key={notif.id} style={[styles.card, { marginBottom: 12, borderLeftWidth: 4, borderLeftColor:"#1565c0", backgroundColor: darkMode ?"#1a2c3d":"#e3f2fd"}]}>
                        <View style={{ flexDirection:"row", alignItems:"center", gap: 6, marginBottom: 4 }}>
                          <Ionicons name="notifications"size={15} color="#1565c0"/>
                          <Text style={{ fontWeight:"bold", color:"#1565c0", fontSize: 11 }}>SYSTEM BROADCAST</Text>
                        </View>
                        <Text style={{ fontWeight:"bold", color: darkMode ?"#e0e0e0":"#212121", fontSize: 13 }}>{notif.title}</Text>
                        <Text style={{ color: darkMode ?"#cccccc":"#424242", fontSize: 12, marginTop: 2 }}>{notif.message}</Text>
                        <Text style={{ color: darkMode ?"#888":"#888", fontSize: 10, marginTop: 6 }}>
                          Sent: {formattedDate} | By: {notif.sentBy ||"Admin"}
                        </Text>
                      </View>
                    );
                  });
                })()}`;

if (webContent.indexOf(targetWebNotif) === -1) {
  console.error("ERROR: targetWebNotif not found!");
  process.exit(1);
}
webContent = webContent.split(targetWebNotif).join(replacementWebNotif);
console.log("- Patched web student notifications center successfully.");

fs.writeFileSync(webPath, webContent, 'utf8');
console.log("All view layer patches applied successfully!");
