const fs = require('fs');
const path = require('path');

const appPath = path.join('a:', 'NERMAI_IAS_ACADEMY', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8').replace(/\r\n/g, '\n');

const topDeclarations = `// Configure your Host IP address for local network connections
const DEFAULT_HOST_IP = "192.168.0.240";
// Timeout in ms for all API calls — 12s gives plenty of room on LAN
const API_TIMEOUT_MS = 12000;

// Safe cross-platform local storage helper for Guest Demo sessions
const guestStorage = {
  async save(name: string, phone: string, email: string) {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem("nermai_guest_name", name);
        localStorage.setItem("nermai_guest_phone", phone);
        localStorage.setItem("nermai_guest_email", email);
        localStorage.setItem("nermai_guest_auto_login", "true");
      }
    } catch (e) {
      console.log("Failed to save guest credentials locally:", e);
    }
  },
  async get() {
    try {
      if (Platform.OS === "web") {
        const name = localStorage.getItem("nermai_guest_name") || "";
        const phone = localStorage.getItem("nermai_guest_phone") || "";
        const email = localStorage.getItem("nermai_guest_email") || "";
        const autoLogin = localStorage.getItem("nermai_guest_auto_login") === "true";
        return { name, phone, email, autoLogin };
      }
    } catch (e) {
      console.log("Failed to load guest credentials:", e);
    }
    return { name: "", phone: "", email: "", autoLogin: false };
  },
  async disableAutoLogin() {
    try {
      if (Platform.OS === "web") {
        localStorage.setItem("nermai_guest_auto_login", "false");
      }
    } catch (e) { }
  },
  async clear() {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem("nermai_guest_name");
        localStorage.removeItem("nermai_guest_phone");
        localStorage.removeItem("nermai_guest_email");
        localStorage.removeItem("nermai_guest_auto_login");
      }
    } catch (e) { }
  }
};

function DateTimePickerSelect({
  value,
  onChange,
  label,
  darkMode
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
  darkMode: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [activeField, setActiveField] = useState<"year" | "month" | "day" | "hour" | "minute" | null>(null);

  // Parse current value
  let date = new Date();
  if (value) {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  const curYear = date.getFullYear();
  const curMonth = date.getMonth() + 1; // 1-12
  const curDay = date.getDate();
  const curHour = date.getHours();
  const curMin = date.getMinutes();

  // Options arrays
  const years = Array.from({ length: 6 }, (_, i) => String(new Date().getFullYear() + i));
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

  const updateParts = (updates: { y?: string; m?: string; d?: string; hr?: string; min?: string }) => {
    const y = updates.y || String(curYear);
    const m = updates.m || String(curMonth).padStart(2, "0");
    const d = updates.d || String(curDay).padStart(2, "0");
    const hr = updates.hr || String(curHour).padStart(2, "0");
    const min = updates.min || String(curMin).padStart(2, "0");
    onChange(\`\${y}-\${m}-\${d}T\${hr}:\${min}\`);
  };

  const getActiveOptions = () => {
    if (activeField === "year") return years;
    if (activeField === "month") return months;
    if (activeField === "day") return days;
    if (activeField === "hour") return hours;
    if (activeField === "minute") return minutes;
    return [];
  };

  const getActiveTitle = () => {
    if (activeField === "year") return "Select Year";
    if (activeField === "month") return "Select Month";
    if (activeField === "day") return "Select Day";
    if (activeField === "hour") return "Select Hour";
    if (activeField === "minute") return "Select Minute";
    return "";
  };

  const handleSelect = (val: string) => {
    if (activeField === "year") updateParts({ y: val });
    else if (activeField === "month") updateParts({ m: val });
    else if (activeField === "day") updateParts({ d: val });
    else if (activeField === "hour") updateParts({ hr: val });
    else if (activeField === "minute") updateParts({ min: val });
    setShowModal(false);
    setActiveField(null);
  };

  const openPicker = (field: "year" | "month" | "day" | "hour" | "minute") => {
    setActiveField(field);
    setShowModal(true);
  };

  const monthNames: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec"
  };

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 12, fontWeight: "bold", color: darkMode ? "#ccc" : "#444", marginBottom: 6 }}>{label}</Text>

      <View style={{ flexDirection: "row", gap: 6 }}>
        {/* Day */}
        <TouchableOpacity onPress={() => openPicker("day")} style={{ flex: 1, padding: 10, borderWidth: 1, borderColor: darkMode ? "#444" : "#ccc", borderRadius: 8, backgroundColor: darkMode ? "#222" : "#fff", alignItems: "center" }}>
          <Text style={{ color: darkMode ? "#fff" : "#212121", fontSize: 13, fontWeight: "bold" }}>{String(curDay).padStart(2, "0")}</Text>
          <Text style={{ color: "#888", fontSize: 9, marginTop: 2 }}>Day</Text>
        </TouchableOpacity>

        {/* Month */}
        <TouchableOpacity onPress={() => openPicker("month")} style={{ flex: 1.5, padding: 10, borderWidth: 1, borderColor: darkMode ? "#444" : "#ccc", borderRadius: 8, backgroundColor: darkMode ? "#222" : "#fff", alignItems: "center" }}>
          <Text style={{ color: darkMode ? "#fff" : "#212121", fontSize: 13, fontWeight: "bold" }}>{monthNames[String(curMonth).padStart(2, "0")] || String(curMonth).padStart(2, "0")}</Text>
          <Text style={{ color: "#888", fontSize: 9, marginTop: 2 }}>Month</Text>
        </TouchableOpacity>

        {/* Year */}
        <TouchableOpacity onPress={() => openPicker("year")} style={{ flex: 1.5, padding: 10, borderWidth: 1, borderColor: darkMode ? "#444" : "#ccc", borderRadius: 8, backgroundColor: darkMode ? "#222" : "#fff", alignItems: "center" }}>
          <Text style={{ color: darkMode ? "#fff" : "#212121", fontSize: 13, fontWeight: "bold" }}>{curYear}</Text>
          <Text style={{ color: "#888", fontSize: 9, marginTop: 2 }}>Year</Text>
        </TouchableOpacity>

        {/* Hour */}
        <TouchableOpacity onPress={() => openPicker("hour")} style={{ flex: 1.2, padding: 10, borderWidth: 1, borderColor: darkMode ? "#444" : "#ccc", borderRadius: 8, backgroundColor: darkMode ? "#222" : "#fff", alignItems: "center" }}>
          <Text style={{ color: darkMode ? "#fff" : "#212121", fontSize: 13, fontWeight: "bold" }}>{String(curHour).padStart(2, "0")}</Text>
          <Text style={{ color: "#888", fontSize: 9, marginTop: 2 }}>Hr</Text>
        </TouchableOpacity>

        {/* Colon separator */}
        <View style={{ justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: darkMode ? "#fff" : "#444", fontWeight: "bold", fontSize: 16 }}>:</Text>
        </View>

        {/* Minute */}
        <TouchableOpacity onPress={() => openPicker("minute")} style={{ flex: 1.2, padding: 10, borderWidth: 1, borderColor: darkMode ? "#444" : "#ccc", borderRadius: 8, backgroundColor: darkMode ? "#222" : "#fff", alignItems: "center" }}>
          <Text style={{ color: darkMode ? "#fff" : "#212121", fontSize: 13, fontWeight: "bold" }}>{String(curMin).padStart(2, "0")}</Text>
          <Text style={{ color: "#888", fontSize: 9, marginTop: 2 }}>Min</Text>
        </TouchableOpacity>
      </View>

      {showModal && (
        <Modal visible={true} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <View style={{ width: "80%", maxHeight: "60%", backgroundColor: darkMode ? "#1e1e1e" : "#ffffff", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: darkMode ? "#333" : "#eee" }}>
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: darkMode ? "#333" : "#eee", alignItems: "center", backgroundColor: darkMode ? "#222" : "#f9f9f9" }}>
                <Text style={{ fontWeight: "bold", fontSize: 15, color: darkMode ? "#fff" : "#212121" }}>{getActiveTitle()}</Text>
              </View>
              <ScrollView>
                {getActiveOptions().map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => handleSelect(opt)}
                    style={{ paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: darkMode ? "#2a2a2a" : "#f0f0f0" }}
                  >
                    <Text style={{ fontSize: 15, color: darkMode ? "#fff" : "#212121", textAlign: "center" }}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                onPress={() => { setShowModal(false); setActiveField(null); }}
                style={{ padding: 14, alignItems: "center", backgroundColor: darkMode ? "#222" : "#f9f9f9", borderTopWidth: 1, borderTopColor: darkMode ? "#333" : "#eee" }}
              >
                <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

`;

const targetExport = `export default function App() {`;

if (!content.includes(topDeclarations)) {
  content = content.replace(targetExport, topDeclarations + targetExport);
  console.log("Inserted top declarations into App.tsx");
}

content = content.replace(/onChange=\{t => setNewTest\(\{ \.\.\.newTest, startTime: t \}\)\}/g, 'onChange={(t: string) => setNewTest({ ...newTest, startTime: t })}');
content = content.replace(/onChange=\{t => setNewTest\(\{ \.\.\.newTest, endTime: t \}\)\}/g, 'onChange={(t: string) => setNewTest({ ...newTest, endTime: t })}');
content = content.replace(/onChange=\{t => setNewPdfTest\(\{ \.\.\.newPdfTest, startTime: t \}\)\}/g, 'onChange={(t: string) => setNewPdfTest({ ...newPdfTest, startTime: t })}');
content = content.replace(/onChange=\{t => setNewPdfTest\(\{ \.\.\.newPdfTest, endTime: t \}\)\}/g, 'onChange={(t: string) => setNewPdfTest({ ...newPdfTest, endTime: t })}');

fs.writeFileSync(appPath, content, 'utf8');
console.log("Successfully updated App.tsx!");
