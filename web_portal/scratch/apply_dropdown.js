const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Guest User Dropdown Menu Replacement
const s1_start = `        {/* Hamburger Drawer Overlay */}`;
const s1_end = `                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        )}`; // Guest drawer end block

const r1 = `        {/* Hamburger Drawer Overlay as Dropdown Menu */}
        {showHamburger && (
          <View style={{ position:"absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}>
            {/* Backdrop */}
            <TouchableOpacity style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent" }} onPress={() => setShowHamburger(false)} />
            
            {/* Dropdown Card */}
            <View style={{
              position: "absolute",
              top: 55,
              right: 15,
              width: 220,
              backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
              borderRadius: 10,
              borderWidth: 1,
              borderColor: darkMode ? "#2a2a2a" : "#e0e0e0",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 5,
              elevation: 6,
              padding: 4
            }}>
              {/* Dark/Light mode */}
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 6 }}
                onPress={() => setDarkMode(!darkMode)}
              >
                <Ionicons name={darkMode ? "sunny-outline" : "moon-outline"} size={18} color={darkMode ? "#ffb74d" : "#757575"} />
                <Text style={{ fontSize: 13, color: darkMode ? "#e0e0e0" : "#212121", flex: 1 }}>
                  {darkMode ? "Light Mode" : "Dark Mode"}
                </Text>
              </TouchableOpacity>

              {user?.hallTicketGenerated && (
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 6 }}
                  onPress={() => { setShowHamburger(false); setShowGuestHallTicketModal(true); }}
                >
                  <Ionicons name="card-outline" size={18} color={darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={{ fontSize: 13, color: darkMode ? "#e0e0e0" : "#212121" }}>My Hall Ticket</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 6 }}
                onPress={() => { setShowHamburger(false); setShowFeedbackModal(true); }}
              >
                <Ionicons name="chatbox-ellipses-outline" size={18} color={darkMode ? "#9e9e9e" : "#757575"} />
                <Text style={{ fontSize: 13, color: darkMode ? "#e0e0e0" : "#212121" }}>Send Feedback</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 6 }}
                onPress={() => { setShowHamburger(false); setShowIpConfig(!showIpConfig); }}
              >
                <Ionicons name="settings-outline" size={18} color={darkMode ? "#9e9e9e" : "#757575"} />
                <Text style={{ fontSize: 13, color: darkMode ? "#e0e0e0" : "#212121" }}>Server Settings</Text>
              </TouchableOpacity>

              <View style={{ height: 1, backgroundColor: darkMode ? "#2a2a2a" : "#e0e0e0", marginVertical: 4 }} />

              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 6 }}
                onPress={() => { setShowHamburger(false); performLogout(); }}
              >
                <Ionicons name="log-out-outline" size={18} color="#c62828" />
                <Text style={{ fontSize: 13, color: "#c62828", fontWeight: "bold" }}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}`;

// 2. Logged-in User Dropdown Menu Replacement
const s2_start = `      {/* Hamburger Drawer Overlay */}`;
const s2_end = `            </ScrollView>
          </View>
        </View>
      )}`; // Logged-in drawer end block

const r2 = `      {/* Hamburger Drawer Overlay as Dropdown Menu */}
      {showHamburger && (
        <View style={{ position:"absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}>
          {/* Backdrop */}
          <TouchableOpacity style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "transparent" }} onPress={() => setShowHamburger(false)} />
          
          {/* Dropdown Card */}
          <View style={{
            position: "absolute",
            top: 55,
            right: 15,
            width: 220,
            backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
            borderRadius: 10,
            borderWidth: 1,
            borderColor: darkMode ? "#2a2a2a" : "#e0e0e0",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 5,
            elevation: 6,
            padding: 4
          }}>
            {/* Dark/Light mode */}
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 6 }}
              onPress={() => setDarkMode(!darkMode)}
            >
              <Ionicons name={darkMode ? "sunny-outline" : "moon-outline"} size={18} color={darkMode ? "#ffb74d" : "#757575"} />
              <Text style={{ fontSize: 13, color: darkMode ? "#e0e0e0" : "#212121", flex: 1 }}>
                {darkMode ? "Light Mode" : "Dark Mode"}
              </Text>
            </TouchableOpacity>

            {(user?.role ==="student"|| user?.role ==="guest") && (
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 6 }}
                onPress={() => { setShowHamburger(false); setShowFeedbackModal(true); }}
              >
                <Ionicons name="chatbox-ellipses-outline" size={18} color={darkMode ? "#9e9e9e" : "#757575"} />
                <Text style={{ fontSize: 13, color: darkMode ? "#e0e0e0" : "#212121" }}>Send Feedback</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 6 }}
              onPress={() => { setShowHamburger(false); setShowIpConfig(!showIpConfig); }}
            >
              <Ionicons name="settings-outline" size={18} color={darkMode ? "#9e9e9e" : "#757575"} />
              <Text style={{ fontSize: 13, color: darkMode ? "#e0e0e0" : "#212121" }}>Server Settings</Text>
            </TouchableOpacity>

            <View style={{ height: 1, backgroundColor: darkMode ? "#2a2a2a" : "#e0e0e0", marginVertical: 4 }} />

            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, gap: 10, borderRadius: 6 }}
              onPress={() => { setShowHamburger(false); performLogout(); }}
            >
              <Ionicons name="log-out-outline" size={18} color="#c62828" />
              <Text style={{ fontSize: 13, color: "#c62828", fontWeight: "bold" }}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}`;

function performRangeReplace(startStr, endStr, replaceStr, name) {
  const normStartStr = startStr.replace(/\r\n/g, '\n');
  const normEndStr = endStr.replace(/\r\n/g, '\n');
  const normReplaceStr = replaceStr.replace(/\r\n/g, '\n');

  const startIndex = content.indexOf(normStartStr);
  if (startIndex === -1) {
    console.error(`ERROR: Start string not found for: ${name}`);
    process.exit(1);
  }
  const endIndex = content.indexOf(normEndStr, startIndex);
  if (endIndex === -1) {
    console.error(`ERROR: End string not found for: ${name}`);
    process.exit(1);
  }
  const searchStr = content.substring(startIndex, endIndex + normEndStr.length);
  content = content.replace(searchStr, normReplaceStr);
  console.log(`SUCCESS: Replaced range for ${name}`);
}

performRangeReplace(s1_start, s1_end, r1, "Guest Drawer");
performRangeReplace(s2_start, s2_end, r2, "Logged-in Drawer");

fs.writeFileSync(filePath, content, 'utf8');
console.log("DROPDOWN OVERLAYS SUCCESSFUL!");
