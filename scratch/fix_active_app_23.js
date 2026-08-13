const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

function normalizeString(str) {
  return str.replace(/\r\n/g, '\n');
}

content = normalizeString(content);

// 1. title
const target1 = `                        value={newCampaign.title}
                        onChangeText={t => setNewCampaign({ ...newCampaign, title: t
                      />`;

const replacement1 = `                        value={newCampaign.title}
                        onChangeText={t => setNewCampaign({ ...newCampaign, title: t })}
                      />`;

// 2. description
const target2 = `                        value={newCampaign.description}
                        onChangeText={d => setNewCampaign({ ...newCampaign, description: d
                      />`;

const replacement2 = `                        value={newCampaign.description}
                        onChangeText={d => setNewCampaign({ ...newCampaign, description: d })}
                      />`;

// 3. posterUrl
const target3 = `                        value={newCampaign.posterUrl}
                        onChangeText={u => setNewCampaign({ ...newCampaign, posterUrl: u
                      />`;

const replacement3 = `                        value={newCampaign.posterUrl}
                        onChangeText={u => setNewCampaign({ ...newCampaign, posterUrl: u })}
                      />`;

// 4. targetUsers
const target4 = `                            onPress={() => setNewCampaign({ ...newCampaign, targetUsers: seg.value
                            style={[styles.roleBtn, newCampaign.targetUsers === seg.value && styles.roleBtnActive, { flex: 1 }]}`;

const replacement4 = `                            onPress={() => setNewCampaign({ ...newCampaign, targetUsers: seg.value })}
                            style={[styles.roleBtn, newCampaign.targetUsers === seg.value && styles.roleBtnActive, { flex: 1 }]}`;

// 5. showInDashboard
const target5 = `                        <TouchableOpacity
                          onPress={() => setNewCampaign({ ...newCampaign, showInDashboard: !newCampaign.showInDashboard
                          style={[styles.toggleTrack, newCampaign.showInDashboard && styles.toggleTrackOn]}`;

const replacement5 = `                        <TouchableOpacity
                          onPress={() => setNewCampaign({ ...newCampaign, showInDashboard: !newCampaign.showInDashboard })}
                          style={[styles.toggleTrack, newCampaign.showInDashboard && styles.toggleTrackOn]}`;

// 6. posterDisplay
const target6 = `                              <TouchableOpacity
                                key={loc.value}
                                onPress={() => setNewCampaign({ ...newCampaign, posterDisplay: loc.value
                                style={[styles.roleBtn, newCampaign.posterDisplay === loc.value && styles.roleBtnActive, { flex: 1 }]}`;

const replacement6 = `                              <TouchableOpacity
                                key={loc.value}
                                onPress={() => setNewCampaign({ ...newCampaign, posterDisplay: loc.value })}
                                style={[styles.roleBtn, newCampaign.posterDisplay === loc.value && styles.roleBtnActive, { flex: 1 }]}`;

// 7. sendNotification
const target7 = `                        <TouchableOpacity
                          onPress={() => setNewCampaign({ ...newCampaign, sendNotification: !newCampaign.sendNotification
                          style={[styles.toggleTrack, newCampaign.sendNotification && styles.toggleTrackOn]}`;

const replacement7 = `                        <TouchableOpacity
                          onPress={() => setNewCampaign({ ...newCampaign, sendNotification: !newCampaign.sendNotification })}
                          style={[styles.toggleTrack, newCampaign.sendNotification && styles.toggleTrackOn]}`;

// 8. notificationMessage
const target8 = `                            value={newCampaign.notificationMessage}
                            onChangeText={n => setNewCampaign({ ...newCampaign, notificationMessage: n
                          />`;

const replacement8 = `                            value={newCampaign.notificationMessage}
                            onChangeText={n => setNewCampaign({ ...newCampaign, notificationMessage: n })}
                          />`;

let count = 0;
if (content.includes(target1)) { content = content.replace(target1, replacement1); console.log("Applied Fix 1"); count++; } else { console.error("Target 1 not found"); }
if (content.includes(target2)) { content = content.replace(target2, replacement2); console.log("Applied Fix 2"); count++; } else { console.error("Target 2 not found"); }
if (content.includes(target3)) { content = content.replace(target3, replacement3); console.log("Applied Fix 3"); count++; } else { console.error("Target 3 not found"); }
if (content.includes(target4)) { content = content.replace(target4, replacement4); console.log("Applied Fix 4"); count++; } else { console.error("Target 4 not found"); }
if (content.includes(target5)) { content = content.replace(target5, replacement5); console.log("Applied Fix 5"); count++; } else { console.error("Target 5 not found"); }
if (content.includes(target6)) { content = content.replace(target6, replacement6); console.log("Applied Fix 6"); count++; } else { console.error("Target 6 not found"); }
if (content.includes(target7)) { content = content.replace(target7, replacement7); console.log("Applied Fix 7"); count++; } else { console.error("Target 7 not found"); }
if (content.includes(target8)) { content = content.replace(target8, replacement8); console.log("Applied Fix 8"); count++; } else { console.error("Target 8 not found"); }

if (count > 0) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`Saved ${count} changes to App.tsx`);
}
