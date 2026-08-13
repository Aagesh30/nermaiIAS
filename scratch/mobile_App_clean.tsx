import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

// Configure your Host IP address for local network connections
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
    } catch (e) {}
  },
  async clear() {
    try {
      if (Platform.OS === "web") {
        localStorage.removeItem("nermai_guest_name");
        localStorage.removeItem("nermai_guest_phone");
        localStorage.removeItem("nermai_guest_email");
        localStorage.removeItem("nermai_guest_auto_login");
      }
    } catch (e) {}
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
    onChange(`${y}-${m}-${d}T${hr}:${min}`);
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
              <ScrollView style={{ padding: 10 }}>
                {getActiveOptions().map((opt) => {
                  const isSelected = 
                    (activeField === "year" && opt === String(curYear)) ||
                    (activeField === "month" && opt === String(curMonth).padStart(2, "0")) ||
                    (activeField === "day" && opt === String(curDay).padStart(2, "0")) ||
                    (activeField === "hour" && opt === String(curHour).padStart(2, "0")) ||
                    (activeField === "minute" && opt === String(curMin).padStart(2, "0"));

                  return (
                    <TouchableOpacity 
                      key={opt} 
                      onPress={() => handleSelect(opt)}
                      style={{ 
                        paddingVertical: 12, 
                        paddingHorizontal: 16, 
                        alignItems: "center", 
                        borderBottomWidth: 0.5, 
                        borderBottomColor: darkMode ? "#2a2a2a" : "#f0f0f0",
                        backgroundColor: isSelected ? (darkMode ? "#b71c1c33" : "#ffebee") : "transparent"
                      }}
                    >
                      <Text style={{ 
                        fontSize: 14, 
                        color: isSelected ? "#c62828" : (darkMode ? "#fff" : "#212121"),
                        fontWeight: isSelected ? "bold" : "normal"
                      }}>
                        {activeField === "month" ? (monthNames[opt] || opt) : opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity 
                onPress={() => { setShowModal(false); setActiveField(null); }}
                style={{ padding: 16, borderTopWidth: 1, borderTopColor: darkMode ? "#333" : "#eee", alignItems: "center", backgroundColor: darkMode ? "#222" : "#f9f9f9" }}
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

export default function App() {
  // Config State
  const [hostIp, setHostIp] = useState(() => {
    if (Platform.OS === "web" && typeof window !== "undefined" && window.location.hostname) {
      return window.location.hostname;
    }
    return DEFAULT_HOST_IP;
  });
  const [showIpConfig, setShowIpConfig] = useState(false);

  // Keep the base URL in a ref so API calls always use the latest IP
  // without recreating the api object on every render
  const hostIpRef = useRef(hostIp);
  useEffect(() => { hostIpRef.current = hostIp; }, [hostIp]);

  const getBaseUrl = () => `http://${hostIpRef.current}:5000/api`;

  // Stable API helper — defined once, reads hostIpRef dynamically
  const api = useRef({
    async get(path: string, headers?: any) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const res = await fetch(`${getBaseUrl()}${path}`, {
          headers: { "Content-Type": "application/json", ...headers },
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "API error");
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    },
    async post(path: string, body: any, headers?: any, customTimeout?: number) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), customTimeout || API_TIMEOUT_MS);
      try {
        const res = await fetch(`${getBaseUrl()}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "API error");
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    },
    async patch(path: string, body: any, headers?: any) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const res = await fetch(`${getBaseUrl()}${path}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "API error");
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    },
    async put(path: string, body: any, headers?: any) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const res = await fetch(`${getBaseUrl()}${path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "API error");
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    },
    async delete(path: string, headers?: any) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const res = await fetch(`${getBaseUrl()}${path}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...headers },
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "API error");
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    }
  }).current;

  // Auth State
  const [user, setUser] = useState<any | null>(null);
  const [authTab, setAuthTab] = useState<"login" | "guest">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("student");

  // Guest Login State
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({ name: "", phone: "", email: "", city: "", preferredCourse: "UPSC GS" });
  const [admissionSubmitted, setAdmissionSubmitted] = useState(false);
  const [guestTab, setGuestTab] = useState<"home" | "courses" | "updates">("home");
  const [guestNotifications, setGuestNotifications] = useState<any[]>([]);
  const [notifyMsg, setNotifyMsg] = useState({ title: "", message: "" });
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<"dashboard" | "test" | "erp" | "lms" | "crm">("dashboard");

  // Sub-Navigation States
  const [dashboardSub, setDashboardSub] = useState<"overview" | "notices" | "post">("overview");
  const [testSub, setTestSub] = useState<"available" | "create" | "bank" | "results" | "pdf-create">("available");
  const [erpSub, setErpSub] = useState<"students" | "staff" | "fees" | "id-card" | "analytics" | "marks" | "announcements" | "my-profile">("analytics");
  const [lmsSub, setLmsSub] = useState<"quiz" | "all-quizzes" | "create-quiz" | "resources" | "live-classes" | "recorded">("quiz");
  const [crmSub, setCrmSub] = useState<"admissions" | "leads" | "campaigns" | "feedback">("admissions");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Data states
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [todayQuiz, setTodayQuiz] = useState<any | null>(null);
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [pdfExtractText, setPdfExtractText] = useState("");
  const [genMode, setGenMode] = useState<"file" | "text">("file");
  const [extractMode, setExtractMode] = useState<"auto" | "local" | "ai">("auto");
  const [pdfBase64, setPdfBase64] = useState("");
  const [pdfFilename, setPdfFilename] = useState("");
  const [akBase64, setAkBase64] = useState("");
  const [akFilename, setAkFilename] = useState("");
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [extractDraftId, setExtractDraftId] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const extractionAbortRef = useRef<AbortController | null>(null);
  const [newPdfTest, setNewPdfTest] = useState(() => {
    const start = new Date(Date.now() + 15 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const startStr = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-" + String(start.getDate()).padStart(2, "0") + "T" + String(start.getHours()).padStart(2, "0") + ":" + String(Math.floor(start.getMinutes() / 5) * 5).padStart(2, "0");
    const endStr = end.getFullYear() + "-" + String(end.getMonth() + 1).padStart(2, "0") + "-" + String(end.getDate()).padStart(2, "0") + "T" + String(end.getHours()).padStart(2, "0") + ":" + String(Math.floor(end.getMinutes() / 5) * 5).padStart(2, "0");
    return { title: "", startTime: startStr, endTime: endStr, marksPerQ: "1", negMarks: "0.33", unattendedMarks: "0", totalMarks: "" };
  });
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null);
  const [editingQData, setEditingQData] = useState<any | null>(null);
  const [admissionDateFilter, setAdmissionDateFilter] = useState("");
  const [leadDateFilter, setLeadDateFilter] = useState("");
  const [crmSidebarCollapsed, setCrmSidebarCollapsed] = useState(false);
  const [erpSidebarCollapsed, setErpSidebarCollapsed] = useState(false);
  const [dashboardTabsCollapsed, setDashboardTabsCollapsed] = useState(false);
  const [testTabsCollapsed, setTestTabsCollapsed] = useState(false);
  const [lmsTabsCollapsed, setLmsTabsCollapsed] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);

  // Student Profile Request State
  const [myProfileRequest, setMyProfileRequest] = useState<any | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", dob: "", bloodGroup: "", address: "", passportPhotoBase64: "", photoIdBase64: "", photoIdType: "Aadhar" });

  // UI/UX State
  const [darkMode, setDarkMode] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(5);

  // Attempt test state
  const [activeAttempt, setActiveAttempt] = useState<any | null>(null);
  const [attemptQuestions, setAttemptQuestions] = useState<any[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0); // in seconds, counts DOWN from endTime
  const [examEndTime, setExamEndTime] = useState<number>(0); // absolute ms timestamp

  // Result / Review state (after test)
  const [resultData, setResultData] = useState<any | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewData, setReviewData] = useState<any | null>(null);

  // Admin live monitoring
  const [liveCount, setLiveCount] = useState<any | null>(null);
  const [selectedMonitorTestId, setSelectedMonitorTestId] = useState("");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any[]>([]);

  // Forms
  const [newNotice, setNewNotice] = useState({ title: "", content: "", priority: "normal" });
  const [newStudent, setNewStudent] = useState({ firstName: "", lastName: "", admissionNumber: "", rollNumber: "", batch: "", course: "UPSC GS", email: "", phone: "", loginUsername: "", loginPassword: "" });
  const [newStaff, setNewStaff] = useState({ firstName: "", lastName: "", employeeId: "", designation: "Faculty", department: "Polity", email: "", phone: "", loginUsername: "", loginPassword: "" });
  const [newQuestion, setNewQuestion] = useState({ question: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "" });
  const [newTest, setNewTest] = useState(() => {
    const start = new Date(Date.now() + 15 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const startStr = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-" + String(start.getDate()).padStart(2, "0") + "T" + String(start.getHours()).padStart(2, "0") + ":" + String(Math.floor(start.getMinutes() / 5) * 5).padStart(2, "0");
    const endStr = end.getFullYear() + "-" + String(end.getMonth() + 1).padStart(2, "0") + "-" + String(end.getDate()).padStart(2, "0") + "T" + String(end.getHours()).padStart(2, "0") + ":" + String(Math.floor(end.getMinutes() / 5) * 5).padStart(2, "0");
    return { title: "", description: "", duration: "60", passingMarks: "5", startTime: startStr, endTime: endStr, selectedQIds: [] as string[] };
  });
  const [manualQuestionsJson, setManualQuestionsJson] = useState("");
  const [manualNumQuestions, setManualNumQuestions] = useState("");
  const [newInquiry, setNewInquiry] = useState({ name: "", email: "", phone: "", course: "UPSC GS", message: "" });
  const [newLead, setNewLead] = useState({ name: "", phone: "", source: "Website", notes: "" });
  const [newFeedback, setNewFeedback] = useState({ name: "", batch: "", rating: "5", comments: "" });

  // Campaign creation form state
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    posterUrl: "",
    targetUsers: "all",      // "all" | "free" | "paid"
    posterDisplay: "none",   // "none" | "free_home" | "paid_dashboard" | "both"
    isActive: true,
    showInDashboard: true,
    sendNotification: false,
    notificationMessage: ""
  });

  // Quiz state
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizFeedbackQuestions, setQuizFeedbackQuestions] = useState<any[]>([]);

  // Create Quiz Form (LMS Admin)
  const [quizDateInput, setQuizDateInput] = useState(new Date().toISOString().split("T")[0]);
  const [newQuizQ, setNewQuizQ] = useState({ questionText: "", opt0: "", opt1: "", opt2: "", opt3: "", correctIdx: 0 });
  const [newQuizQs, setNewQuizQs] = useState<any[]>([]);

  // ID Card Selected
  const [selectedIdStudent, setSelectedIdStudent] = useState<any | null>(null);

  // ERP Marks & Analytics State
  const [selectedErpTestId, setSelectedErpTestId] = useState<string>("");
  const [erpTestResults, setErpTestResults] = useState<any[]>([]);

  const loadErpTestResults = async (testId: string) => {
    if (!testId) {
      setErpTestResults([]);
      return;
    }
    try {
      const res = await api.get(`/test-portal/evaluation/test/${testId}`);
      setErpTestResults(res || []);
    } catch (e) {
      console.log("Failed loading test results for ERP:", e);
      setErpTestResults([]);
    }
  };

  // Guard ref — prevents duplicate loads when component re-renders
  // without user or hostIp actually changing
  const loadedForUserRef = useRef<string | null>(null);

  // Load persisted guest session on mount
  useEffect(() => {
    const checkPersistedGuest = async () => {
      const persisted = await guestStorage.get();
      if (persisted.name && persisted.phone) {
        // Pre-fill the guest input fields for convenience
        setGuestName(persisted.name);
        setGuestPhone(persisted.phone);
        setGuestEmail(persisted.email);
        
        // If auto-login is enabled (user didn't explicitly log out), log in automatically
        if (persisted.autoLogin) {
          try {
            const baseUrl = `http://${hostIpRef.current || DEFAULT_HOST_IP}:5000/api`;
            const res = await fetch(`${baseUrl}/crm/leads/guest-login`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: persisted.name,
                phone: persisted.phone,
                email: persisted.email
              })
            });
            const json = await res.json();
            const data = json.data || json;
            if (res.ok) {
              setUser({
                role: "guest",
                name: data.name || persisted.name,
                phone: data.phone || persisted.phone,
                email: data.email || persisted.email,
                leadId: data.leadId,
                hasApplied: data.hasApplied || false,
                userId: data.leadId
              });
              setAdmissionSubmitted(data.hasApplied || false);
              
              // Trigger initial guest data fetch
              try {
                const notifRes = await fetch(`${baseUrl}/crm/leads/${data.leadId}/notifications`);
                const notifJson = await notifRes.json();
                setGuestNotifications(notifJson.data || notifJson || []);
                
                const annRes = await fetch(`${baseUrl}/announcement`);
                const annJson = await annRes.json();
                setAnnouncements(annJson.data || annJson || []);

                const campRes = await fetch(`${baseUrl}/crm/campaigns?userType=free`);
                const campJson = await campRes.json();
                setCampaigns(campJson.data || campJson || []);
              } catch (err) {
                console.log("Failed fetching initial guest data:", err);
              }
            }
          } catch (e) {
            console.log("Auto-login failed:", e);
          }
        }
      }
    };
    checkPersistedGuest();
  }, []);

  // Fetch initial data — only runs when user identity changes
  useEffect(() => {
    if (!user) {
      loadedForUserRef.current = null;
      return;
    }

    if (user.role === "student") {
      setErpSub("analytics");
    } else {
      setErpSub("students");
    }

    // Build a key that only changes when login identity or IP changes
    const loadKey = `${user.id || user.username || user.phone}@${hostIp}`;
    if (loadedForUserRef.current === loadKey) return;
    loadedForUserRef.current = loadKey;

    if (user.role !== "guest") {
      loadAnnouncements();
      loadNotifications();
      loadStudents();
      loadStaff();
      loadFees();
      loadTests();
      loadQuestions();
      loadAdmissions();
      loadLeads();
      loadCampaigns();
      loadFeedback();
      loadTodayQuiz();
      loadAllQuizzes();
    } else {
      loadAnnouncements();
      loadNotifications();
      loadGuestNotifications(user.leadId || user.userId || "");
      loadCampaigns();
    }
    loadCourses();
  }, [user, hostIp]);

  // Automatically reload subtab data on change
  useEffect(() => {
    if (!user) return;
    if (crmSub === "feedback") {
      loadFeedback();
    } else if (crmSub === "leads") {
      loadLeads();
    } else if (crmSub === "campaigns") {
      loadCampaigns();
    } else if (crmSub === "admissions") {
      loadAdmissions();
    }
  }, [crmSub]);

  useEffect(() => {
    if (!user) return;
    if (erpSub === "students") {
      loadStudents();
    } else if (erpSub === "staff") {
      loadStaff();
    } else if (erpSub === "fees") {
      loadFees();
    }
  }, [erpSub]);

  // Exam timer — real-time countdown from absolute endTime to prevent drift
  useEffect(() => {
    if (!activeAttempt || !examEndTime) return;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((examEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        // Auto-submit when time is up
        submitTestAttempt();
      }
    };
    tick(); // immediate first tick
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [activeAttempt, examEndTime]);

  // API Call Loaders
  const loadAnnouncements = async () => {
    try {
      const res = await api.get("/announcement");
      setAnnouncements(res || []);
    } catch (e) {
      console.log("Failed loading announcements:", e);
      setAnnouncements([]);
    }
  };

  const loadNotifications = async () => {
    try {
      const role = user?.role || "guest";
      const myStudent = students.find((s: any) => s.email === user?.email || s.phone === user?.phone || s.rollNumber === user?.username || s.id === user?.userId);
      const batch = myStudent?.batch || "";
      const res = await api.get(`/notification?role=${role}&batch=${batch}`);
      setNotifications(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading notifications:", e);
      setNotifications([]);
    }
  };

  const loadMyProfileRequest = async (studentId: string) => {
    try {
      const res = await api.get(`/erp/profile-request/student/${studentId}`);
      setMyProfileRequest(res?.data || res || null);
    } catch (e) {
      console.log("Failed loading my profile request:", e);
    }
  };

  const pickImage = async (field: "passportPhotoBase64" | "photoIdBase64") => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "Permission to access camera roll is required!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Resize and compress using ImageManipulator
        const manipulated = await ImageManipulator.manipulateAsync(
          selectedAsset.uri,
          [{ resize: { width: 250, height: 250 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        const base64Data = `data:image/jpeg;base64,${manipulated.base64}`;
        setProfileForm(prev => ({
          ...prev,
          [field]: base64Data
        }));
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to pick image");
    }
  };

  const submitProfileCompletion = async () => {
    const myStudent = students.find((s: any) => s.email === user.email || s.phone === user.phone || s.rollNumber === user.username || s.id === user.userId);
    const rawCount = myStudent?.profileSubmitCount;
    const count = typeof rawCount === "number" ? rawCount : 0;
    if (count >= 3) {
      Alert.alert("Limit Reached", "You have reached the maximum limit of 3 profile submission attempts. Please contact the administrator directly.");
      return;
    }
    if (!profileForm.name || !profileForm.dob || !profileForm.address) {
      Alert.alert("Error", "Name, Date of Birth and Address are required.");
      return;
    }
    try {
      await api.post("/erp/profile-request", {
        studentId: myStudent?.id || user.userId,
        username: user.username,
        ...profileForm
      });
      Alert.alert("Success", "Profile completion request submitted! Admin will review and approve soon.");
      loadMyProfileRequest(myStudent?.id || user.userId);
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit profile.");
    }
  };

  const loadStudents = async () => {
    try {
      const res = await api.get("/erp/student");
      const list = res?.data || res || [];
      setStudents(list);
      if (user && user.role === "student") {
        const myStudent = list.find((s: any) => s.email === user.email || s.phone === user.phone || s.rollNumber === user.username || s.id === user.userId);
        if (myStudent) {
          loadMyProfileRequest(myStudent.id);
        }
      }
    } catch (e) {
      console.log("Failed loading students:", e);
      setStudents([]);
    }
  };

  const loadStaff = async () => {
    try {
      const res = await api.get("/erp/staff");
      setStaff(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading staff:", e);
      setStaff([]);
    }
  };

  const loadFees = async () => {
    try {
      const res = await api.get("/erp/fees/payments");
      setFees(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading fees ledger:", e);
      setFees([]);
    }
  };

  const [studentAttempts, setStudentAttempts] = useState<any[]>([]);

  const loadTests = async () => {
    try {
      const res = await api.get("/test-portal/test-creation");
      const allTests = res?.data || res || [];
      setTests(user?.role === "student" ? allTests.filter((t: any) => t.published) : allTests);

      if (user && user.role === "student") {
        try {
          const attemptsRes = await api.get(`/test-portal/review/history/${user.userId}`);
          setStudentAttempts(attemptsRes?.data || attemptsRes || []);
        } catch (err) {
          console.log("Failed to load student attempts:", err);
        }
      }
    } catch (e) {
      console.log("Failed loading tests:", e);
      setTests([]);
    }
  };

  const loadQuestions = async () => {
    try {
      const res = await api.get("/test-portal/question-bank");
      setQuestions(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading question bank:", e);
      setQuestions([]);
    }
  };

  const loadAdmissions = async (fromDate?: string) => {
    try {
      const params = fromDate ? `?fromDate=${fromDate}T00:00:00` : "";
      const res = await api.get(`/crm/admission${params}`);
      setAdmissions(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading admissions:", e);
      setAdmissions([]);
    }
  };

  const loadLeads = async () => {
    try {
      const res = await api.get("/crm/leads");
      setLeads(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading leads:", e);
      setLeads([]);
    }
  };


  const loadCampaigns = async () => {
    if (!user) return;
    try {
      let endpoint = "/crm/campaigns";
      if (user.role === "admin" || user.role === "staff") {
        endpoint = "/crm/campaigns/admin";
      } else if (user.role === "student") {
        endpoint = "/crm/campaigns?userType=paid";
      } else if (user.role === "guest") {
        endpoint = "/crm/campaigns?userType=free";
      }
      const res = await api.get(endpoint);
      setCampaigns(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading campaigns:", e);
      setCampaigns([]);
    }
  };

  const loadFeedback = async () => {
    try {
      const res = await api.get("/crm/alumni-feedback");
      setFeedbacks(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading feedbacks:", e);
      setFeedbacks([]);
    }
  };

  const loadTodayQuiz = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/lms/daily-quiz/today?studentId=${user.userId}`);
      const quiz = res.data || res;
      setTodayQuiz(quiz);
      if (quiz.existingAttempt) {
        setQuizScore(quiz.existingAttempt.correctCount);
        const feedback = quiz.questions.map((q: any, idx: number) => ({
          ...q,
          userAnswer: quiz.existingAttempt.answers.find((a: any) => a.questionIndex === idx)?.selectedOptionIndex
        }));
        setQuizFeedbackQuestions(feedback);
      } else {
        setQuizScore(null);
        setQuizAnswers({});
      }
    } catch (e) {
      console.log("Failed loading today's quiz:", e);
      setTodayQuiz(null);
    }
  };

  const loadSpecificQuiz = async (quizId: string) => {
    if (!user) return;
    try {
      const res = await api.get(`/lms/daily-quiz/${quizId}?studentId=${user.userId}`);
      const quiz = res.data || res;
      setTodayQuiz(quiz);
      if (quiz.existingAttempt) {
        setQuizScore(quiz.existingAttempt.correctCount);
        const feedback = quiz.questions.map((q: any, idx: number) => ({
          ...q,
          userAnswer: quiz.existingAttempt.answers.find((a: any) => a.questionIndex === idx)?.selectedOptionIndex
        }));
        setQuizFeedbackQuestions(feedback);
      } else {
        setQuizScore(null);
        setQuizAnswers({});
      }
      setLmsSub("quiz");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to load quiz.");
    }
  };

  const loadAllQuizzes = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/lms/daily-quiz/all?studentId=${user.userId}`);
      setAllQuizzes(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading all quizzes:", e);
      setAllQuizzes([]);
    }
  };

  const loadCourses = async () => {
    try {
      const res = await api.get("/crm/courses");
      setCourses(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading courses:", e);
      setCourses([]);
    }
  };

  const loadGuestNotifications = async (leadId: string) => {
    try {
      const res = await api.get(`/crm/leads/${leadId}/notifications`);
      setGuestNotifications(res || []);
    } catch (e) {
      console.log("Failed loading guest notifications:", e);
      setGuestNotifications([]);
    }
  };

  // Guest Login Handler
  const handleGuestLogin = async () => {
    if (!guestName.trim() || !guestPhone.trim()) {
      Alert.alert("Required", "Please enter your Name and Phone Number.");
      return;
    }
    try {
      const res = await api.post("/crm/leads/guest-login", {
        name: guestName.trim(),
        phone: guestPhone.trim(),
        email: guestEmail.trim()
      });
      const data = res.data || res;
      setUser({
        role: "guest",
        name: data.name || guestName,
        phone: data.phone || guestPhone,
        email: data.email || guestEmail,
        leadId: data.leadId,
        hasApplied: data.hasApplied || false,
        userId: data.leadId
      });
      setAdmissionSubmitted(data.hasApplied || false);
      loadAnnouncements();
      loadGuestNotifications(data.leadId);
      loadCampaigns();

      // Save credentials locally
      await guestStorage.save(guestName.trim(), guestPhone.trim(), guestEmail.trim());
    } catch (e: any) {
      Alert.alert("Error", e.message || "Could not start guest session.");
    }
  };

  // Submit Admission (Guest → Admin CRM)
  const handleGuestAdmission = async () => {
    if (!admissionForm.name || !admissionForm.phone) {
      Alert.alert("Required", "Name and Phone are required.");
      return;
    }
    try {
      await api.post("/crm/admission", {
        ...admissionForm,
        createdBy: user?.name || "guest"
      });
      setAdmissionSubmitted(true);
      setShowAdmissionForm(false);
      Alert.alert("Application Submitted!", "Your admission application has been submitted. We'll contact you soon.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit application.");
    }
  };

  // Mark Course Interest (Guest)
  const markCourseInterest = async (course: any) => {
    if (!user?.leadId) return;
    try {
      await api.post(`/crm/courses/${course.id}/interest`, {
        leadId: user.leadId,
        leadName: user.name,
        phone: user.phone,
        email: user.email
      });
      Alert.alert("Interest Recorded!", `Your interest in "${course.name}" has been noted. We'll keep you updated!`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to record interest.");
    }
  };

  // Document picker helper for mobile document selection
  const pickWordDocument = async (target: "qp" | "ak") => {
    try {
      const docTypes = target === "qp" 
        ? [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword"
          ]
        : [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
            "text/csv",
            "text/comma-separated-values",
            "application/csv",
            "text/plain"
          ];

      const result = await DocumentPicker.getDocumentAsync({
        type: docTypes,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (target === "qp") {
          setPdfFilename(asset.name);
        } else {
          setAkFilename(asset.name);
        }

        // On native platforms we read file as base64 string
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: "base64",
        });

        if (target === "qp") {
          setPdfBase64(base64);
        } else {
          setAkBase64(base64);
        }
        Alert.alert("Success", `${target === "qp" ? "Question Paper" : "Answer Key"} "${asset.name}" loaded successfully!`);
      }
    } catch (err: any) {
      Alert.alert("Error", "Failed to select document: " + err.message);
    }
  };

  // AI PDF Question Extraction (Admin)
  const extractQuestionsFromText = async () => {
    if (genMode === "file" && !pdfBase64) {
      Alert.alert("Error", "Please upload a Question Paper Word File (.docx).");
      return;
    }
    if (genMode === "text" && !pdfExtractText.trim()) {
      Alert.alert("Error", "Please paste the Question Paper text.");
      return;
    }
    setIsExtracting(true);
    const abortCtrl = new AbortController();
    extractionAbortRef.current = abortCtrl;
    try {
      const res = await api.post("/test-portal/test-creation/extract", {
        questionPaperText: genMode === "text" ? pdfExtractText : undefined,
        questionPaperBase64: genMode === "file" ? pdfBase64 : undefined,
        answerKeyBase64: akBase64 || undefined,
        filename: genMode === "file" ? pdfFilename : "pasted_text.txt",
        title: newPdfTest.title || "Untitled Test",
        mode: extractMode
      }, undefined, 180000); // 3 minutes timeout for AI processing
      if (abortCtrl.signal.aborted) return;
      const data = res.data || res;
      const normalized = (data.questions || []).map((q: any) => {
        const questionEn = q.questionEn || q.questionText || q.question || "";
        const questionTa = q.questionTa || "";
        let optionsObj: any = {
          A: { en: "", ta: "" },
          B: { en: "", ta: "" },
          C: { en: "", ta: "" },
          D: { en: "", ta: "" }
        };
        if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
          ["A", "B", "C", "D"].forEach(k => {
            optionsObj[k].en = q.options[k]?.en || q.options[k] || "";
            optionsObj[k].ta = q.options[k]?.ta || "";
          });
        } else if (Array.isArray(q.options)) {
          ["A", "B", "C", "D"].forEach((k, idx) => {
            optionsObj[k].en = q.options[idx] || "";
          });
        }
        ["A", "B", "C", "D"].forEach(k => {
          const flatEn = q[`option ${k.toLowerCase()}`] || q[`option${k}`] || "";
          const flatTa = q[`option ${k.toLowerCase()} ta`] || q[`option${k}Ta`] || "";
          if (flatEn && !optionsObj[k].en) optionsObj[k].en = flatEn;
          if (flatTa && !optionsObj[k].ta) optionsObj[k].ta = flatTa;
        });
        let correctAnswer = q.correctAnswer || q.correctOption || q.answer || "";
        correctAnswer = correctAnswer.toString().trim().toUpperCase();
        if (!["A", "B", "C", "D"].includes(correctAnswer)) {
          correctAnswer = "A";
        }
        return {
          ...q,
          questionEn,
          questionTa,
          options: optionsObj,
          correctAnswer
        };
      });
      setExtractedQuestions(normalized);
      setExtractDraftId(data.draftId || "");
      Alert.alert("Extraction Complete!", `Extracted ${data.questionCount || 0} questions successfully.`);
    } catch (e: any) {
      if (abortCtrl.signal.aborted) return; // silently ignore cancelled
      Alert.alert("Extraction Failed", e.message || "Extraction failed.");
    } finally {
      extractionAbortRef.current = null;
      setIsExtracting(false);
    }
  };

  // Cancel ongoing extraction
  const cancelExtraction = () => {
    Alert.alert(
      "Cancel Extraction",
      "Are you sure you want to cancel the question extraction? Any progress will be lost.",
      [
        { text: "Keep Waiting", style: "cancel" },
        {
          text: "Cancel Extraction", style: "destructive",
          onPress: () => {
            if (extractionAbortRef.current) {
              extractionAbortRef.current.abort();
              extractionAbortRef.current = null;
            }
            setIsExtracting(false);
          }
        }
      ]
    );
  };

  // Create Test from AI Extracted Questions
  const createTestFromExtraction = async () => {
    if (!extractDraftId || !newPdfTest.title) {
      Alert.alert("Error", "Title and extracted questions are required.");
      return;
    }
    if (!newPdfTest.startTime || !newPdfTest.endTime) {
      Alert.alert("Error", "Scheduled Start Time and End Time are mandatory.");
      return;
    }
    try {
      const correctVal = parseFloat(newPdfTest.marksPerQ) || 1;
      const wrongVal = Math.abs(parseFloat(newPdfTest.negMarks) || 0.33);
      const unattendedVal = parseFloat(newPdfTest.unattendedMarks) || 0;

      await api.post("/test-portal/test-creation", {
        title: newPdfTest.title,
        draftId: extractDraftId,
        questions: extractedQuestions, // Send edited questions array!
        startTime: newPdfTest.startTime || null,
        endTime: newPdfTest.endTime || null,
        marksPerQuestion: correctVal,
        negativeMarks: wrongVal,
        unattendedMarks: unattendedVal,
        totalMarks: extractedQuestions.length * correctVal,
        createdBy: user?.name || "admin",
        published: true
      });
      Alert.alert("Success", "Test created from extracted questions!");
      setExtractedQuestions([]);
      setExtractDraftId("");
      setPdfExtractText("");
      setPdfBase64("");
      setPdfFilename("");
      setAkBase64("");
      setAkFilename("");
      const start = new Date(Date.now() + 15 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const startStr = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-" + String(start.getDate()).padStart(2, "0") + "T" + String(start.getHours()).padStart(2, "0") + ":" + String(Math.floor(start.getMinutes() / 5) * 5).padStart(2, "0");
      const endStr = end.getFullYear() + "-" + String(end.getMonth() + 1).padStart(2, "0") + "-" + String(end.getDate()).padStart(2, "0") + "T" + String(end.getHours()).padStart(2, "0") + ":" + String(Math.floor(end.getMinutes() / 5) * 5).padStart(2, "0");
      setNewPdfTest({ title: "", startTime: startStr, endTime: endStr, marksPerQ: "1", negMarks: "0.33", unattendedMarks: "0", totalMarks: "" });
      setTestSub("available");
      loadTests();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create test.");
    }
  };

  // Send Notification to Leads (Admin)
  const sendLeadNotification = async () => {
    if (!notifyMsg.title || !notifyMsg.message) {
      Alert.alert("Error", "Please fill in title and message.");
      return;
    }
    try {
      const payload: any = { title: notifyMsg.title, message: notifyMsg.message, sentBy: user?.name };
      if (selectedLeadIds.length > 0) {
        payload.leadIds = selectedLeadIds;
      } else {
        payload.targetAll = true;
      }
      await api.post("/crm/leads/notify", payload);
      Alert.alert("Sent!", `Notification sent to ${selectedLeadIds.length > 0 ? selectedLeadIds.length : "all"} leads.`);
      setNotifyMsg({ title: "", message: "" });
      setSelectedLeadIds([]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to send notification.");
    }
  };



  // Auth Submit
  const handleAuth = async (overrideUser?: string, overridePass?: string, forceLogin?: boolean) => {
    const u = overrideUser !== undefined ? overrideUser : username;
    const p = overridePass !== undefined ? overridePass : password;

    if (!u || !p) {
      Alert.alert("Input Error", "Please provide both username and password.");
      return;
    }

    try {
      const res = await api.post("/auth/login", { username: u, password: p });
      setUser(res);
      setActiveTab("dashboard");
    } catch (e: any) {
      Alert.alert(
        "Authentication Failed",
        `Could not authenticate with server at ${getBaseUrl()}.\n\nError: ${e.message || "Unknown error"}`
      );
    }
  };

  // Create/Post Functions
  const createNotice = async () => {
    try {
      await api.post("/announcement", { 
        title: newNotice.title, 
        content: newNotice.content, 
        priority: newNotice.priority, 
        createdBy: user.name,
        targetDashboard: "all"
      });
      Alert.alert("Success", "Notice published successfully!");
      setNewNotice({ title: "", content: "", priority: "normal" });
      loadAnnouncements();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to publish announcement.");
    }
  };

  const createStudentRecord = async () => {
    try {
      await api.post("/erp/student", { ...newStudent, createdBy: user.name });
      Alert.alert("Success", "Student registered successfully!");
      setNewStudent({ firstName: "", lastName: "", admissionNumber: "", rollNumber: "", batch: "", course: "UPSC GS", email: "", phone: "", loginUsername: "", loginPassword: "" });
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save student profile.");
    }
  };

  const createStaffRecord = async () => {
    try {
      await api.post("/erp/staff", { ...newStaff, createdBy: user.name });
      Alert.alert("Success", "Staff record saved!");
      setNewStaff({ firstName: "", lastName: "", employeeId: "", designation: "Faculty", department: "Polity", email: "", phone: "", loginUsername: "", loginPassword: "" });
      loadStaff();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save staff record.");
    }
  };

  const updateStudentRecord = async () => {
    if (!editingStudent) return;
    try {
      await api.put(`/erp/student/${editingStudent.id}`, editingStudent);
      Alert.alert("Success", "Student record updated!");
      setEditingStudent(null);
      setShowStudentForm(false);
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update student profile.");
    }
  };

  const deleteStudentRecord = async (id: string) => {
    const performDelete = async () => {
      try {
        await api.delete(`/erp/student/${id}`);
        Alert.alert("Success", "Student record deleted.");
        loadStudents();
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to delete student record.");
      }
    };
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm("Are you sure you want to delete this student record?")) {
        await performDelete();
      }
    } else {
      Alert.alert("Delete", "Are you sure you want to delete this student record?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDelete }
      ]);
    }
  };

  const updateStaffRecord = async () => {
    if (!editingStaff) return;
    try {
      await api.put(`/erp/staff/${editingStaff.id}`, editingStaff);
      Alert.alert("Success", "Staff record updated!");
      setEditingStaff(null);
      setShowStaffForm(false);
      loadStaff();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update staff profile.");
    }
  };

  const deleteStaffRecord = async (id: string) => {
    const performDelete = async () => {
      try {
        await api.delete(`/erp/staff/${id}`);
        Alert.alert("Success", "Staff record deleted.");
        loadStaff();
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to delete staff record.");
      }
    };
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm("Are you sure you want to delete this staff record?")) {
        await performDelete();
      }
    } else {
      Alert.alert("Delete", "Are you sure you want to delete this staff record?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: performDelete }
      ]);
    }
  };

  const saveQuestion = async () => {
    try {
      await api.post("/test-portal/question-bank", { 
        question: newQuestion.question, 
        options: [newQuestion.optA, newQuestion.optB, newQuestion.optC, newQuestion.optD], 
        answer: newQuestion.answer, 
        explanation: newQuestion.explanation, 
        type: "MCQ",
        marks: 1,
        negativeMarks: 0.33,
        createdBy: user.name 
      });
      Alert.alert("Success", "Question saved to bank!");
      setNewQuestion({ question: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "" });
      loadQuestions();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save question.");
    }
  };

  const saveTestDefinition = async () => {
    try {
      if (!newTest.title) {
        Alert.alert("Error", "Please enter test title.");
        return;
      }
      if (!newTest.startTime || !newTest.endTime) {
        Alert.alert("Error", "Scheduled Start Time and End Time are mandatory.");
        return;
      }
      
      let parsedQuestions: any[] = [];
      if (manualQuestionsJson.trim()) {
        try {
          const parsed = JSON.parse(manualQuestionsJson);
          if (Array.isArray(parsed)) {
            parsedQuestions = parsed;
          } else if (typeof parsed === "object") {
            parsedQuestions = [parsed];
          }
        } catch (e: any) {
          Alert.alert("JSON Error", "Invalid JSON format: " + e.message);
          return;
        }
      }

      if (parsedQuestions.length === 0) {
        Alert.alert("Error", "Please input questions in JSON format.");
        return;
      }

      // Limit to the selected number of questions if specified
      const numLimit = Number(manualNumQuestions);
      if (numLimit && numLimit > 0 && numLimit < parsedQuestions.length) {
        parsedQuestions = parsedQuestions.slice(0, numLimit);
      }

      await api.post("/test-portal/test-creation", { 
        title: newTest.title, 
        description: newTest.description, 
        durationMinutes: Number(newTest.duration), 
        passingMarks: Number(newTest.passingMarks), 
        startTime: newTest.startTime || null,
        endTime: newTest.endTime || null,
        questionsData: parsedQuestions, 
        published: true,
        createdBy: user.name 
      });
      Alert.alert("Success", "Mock Test created & published!");
      setNewTest({ title: "", description: "", duration: "60", passingMarks: "5", startTime: "", endTime: "", selectedQIds: [] });
      setManualQuestionsJson("");
      setManualNumQuestions("");
      loadTests();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create test.");
    }
  };

  const submitInquiry = async () => {
    try {
      await api.post("/crm/admission", { ...newInquiry, createdBy: user.name });
      Alert.alert("Success", "Admission inquiry submitted!");
      setNewInquiry({ name: "", email: "", phone: "", course: "UPSC GS", message: "" });
      loadAdmissions();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save inquiry.");
    }
  };

  const saveLead = async () => {
    try {
      await api.post("/crm/leads", { ...newLead });
      Alert.alert("Success", "Prospective lead logged!");
      setNewLead({ name: "", phone: "", source: "Website", notes: "" });
      loadLeads();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to log lead.");
    }
  };

  const saveFeedback = async () => {
    try {
      await api.post("/crm/alumni-feedback", { ...newFeedback, rating: Number(newFeedback.rating) });
      Alert.alert("Success", "Testimonial submitted!");
      setNewFeedback({ name: "", batch: "", rating: "5", comments: "" });
      loadFeedback();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit feedback.");
    }
  };

  const submitStudentFeedback = async () => {
    try {
      await api.post("/crm/alumni-feedback", {
        name: user?.name || "Anonymous",
        batch: user?.role === "student" ? "Student" : "Guest",
        rating: feedbackRating,
        feedback: feedbackText
      });
      Alert.alert("Thank You!", "Your feedback has been submitted.");
      setFeedbackText("");
      setFeedbackRating(5);
      setShowFeedbackModal(false);
      loadFeedback();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit feedback.");
    }
  };

  const saveCampaign = async () => {
    if (!newCampaign.title) {
      Alert.alert("Error", "Campaign Title is required.");
      return;
    }
    try {
      const payload = {
        title: newCampaign.title,
        description: newCampaign.description,
        posterUrl: newCampaign.posterUrl,
        targetUsers: newCampaign.targetUsers,
        posterDisplay: newCampaign.posterDisplay === "none" ? null : newCampaign.posterDisplay,
        isActive: newCampaign.isActive,
        showInDashboard: newCampaign.showInDashboard,
        sendNotification: newCampaign.sendNotification,
        notificationMessage: newCampaign.notificationMessage,
        createdBy: user?.name || "admin"
      };

      await api.post("/crm/campaigns", payload);
      Alert.alert("Success", "Campaign published successfully!");
      setNewCampaign({
        title: "",
        description: "",
        posterUrl: "",
        targetUsers: "all",
        posterDisplay: "none",
        isActive: true,
        showInDashboard: true,
        sendNotification: false,
        notificationMessage: ""
      });
      loadCampaigns();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to publish campaign.");
    }
  };

  const deleteCampaign = async (id: string) => {
    Alert.alert(
      "Delete Campaign",
      "Are you sure you want to delete this campaign?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/crm/campaigns/${id}`, { deletedBy: user?.name || "admin" });
              Alert.alert("Success", "Campaign deleted.");
              loadCampaigns();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to delete campaign.");
            }
          }
        }
      ]
    );
  };

  // LMS Quiz Operations
  const publishQuizQuestionDirectly = async () => {
    if (!newQuizQ.questionText || !newQuizQ.opt0 || !newQuizQ.opt1 || !newQuizQ.opt2 || !newQuizQ.opt3) {
      Alert.alert("Error", "Please fill in the question and all 4 options.");
      return;
    }
    try {
      const qPayload = {
        questionText: newQuizQ.questionText,
        options: [newQuizQ.opt0, newQuizQ.opt1, newQuizQ.opt2, newQuizQ.opt3],
        correctOptionIndex: newQuizQ.correctIdx
      };
      await api.post("/lms/daily-quiz", {
        quizDate: quizDateInput,
        questions: [qPayload],
        createdBy: user.name
      });
      Alert.alert("Success", `Daily Quiz question published for ${quizDateInput}!`);
      setNewQuizQ({ questionText: "", opt0: "", opt1: "", opt2: "", opt3: "", correctIdx: 0 });
      loadTodayQuiz();
      setLmsSub("quiz");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to publish daily quiz.");
    }
  };

  const submitLmsQuiz = async () => {
    if (!todayQuiz) return;
    const formattedAnswers = Object.entries(quizAnswers).map(([qIdx, oIdx]) => ({
      questionIndex: Number(qIdx),
      selectedOptionIndex: oIdx
    }));

    try {
      const res = await api.post("/lms/daily-quiz/submit", {
        studentId: user.userId,
        quizId: todayQuiz.id,
        answers: formattedAnswers,
        submittedBy: user.name
      });
      setQuizScore(res.correctCount);
      setQuizFeedbackQuestions(res.questions || []);
      Alert.alert("Quiz Completed!", `You scored ${res.correctCount} / ${res.totalQuestions}`);
      
      // Clear answers state for the next quiz
      setQuizAnswers({});
      
      // Reload quizzes to get next pending one
      await loadTodayQuiz();
      await loadAllQuizzes();
    } catch (e: any) {
      Alert.alert("Submission Error", e.message || "Failed to submit answers.");
    }
  };

  const deleteLmsQuiz = async () => {
    if (!todayQuiz) return;
    Alert.alert(
      "Delete Quiz",
      "Are you sure you want to delete today's quiz? This will remove all questions and student response history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/lms/daily-quiz/${todayQuiz.id}`);
              Alert.alert("Success", "Daily quiz deleted successfully.");
              setTodayQuiz(null);
              setQuizAnswers({});
              setQuizScore(null);
            } catch (e: any) {
              Alert.alert("Error", e.message || "Failed to delete daily quiz.");
            }
          }
        }
      ]
    );
  };

  // Exam Operations
  const getTestStatusForStudent = (test: any) => {
    // Find if student has completed or started this test
    const attempt = studentAttempts.find((a: any) => a.testId === test.id);
    const now = Date.now();
    const startTimeMs = test.startTime ? new Date(test.startTime).getTime() : 0;
    const endTimeMs = test.endTime ? new Date(test.endTime).getTime() : 0;

    if (attempt && (attempt.status === "submitted" || attempt.status === "evaluated" || attempt.isSubmitted)) {
      return { status: "completed", label: "Review Answers", attemptId: attempt.id || attempt.attemptId, disabled: false };
    }

    if (startTimeMs && now < startTimeMs) {
      return { status: "scheduled", label: "Scheduled", disabled: true };
    }

    if (endTimeMs && now > endTimeMs) {
      return { status: "expired", label: "Expired", disabled: true };
    }

    // Otherwise they can launch/resume the exam
    if (attempt && attempt.status === "started") {
      return { status: "ongoing", label: "Resume Exam", attemptId: attempt.id || attempt.attemptId, disabled: false };
    }

    return { status: "ready", label: "Start Test", disabled: false };
  };

  const launchReview = async (attemptId: string) => {
    try {
      const res = await api.get(`/test-portal/review/attempt/${attemptId}`);
      const reviewPayload = res?.data || res;
      setReviewData(reviewPayload);
      setReviewMode(true);
    } catch (e: any) {
      Alert.alert("Error Fetching Review", e.message || "Could not load test review details.");
    }
  };

  const monitorTest = async (testId: string) => {
    setSelectedMonitorTestId(testId);
    try {
      const liveRes = await api.get(`/test-portal/examination/live-count/${testId}`);
      setLiveCount(liveRes?.data || liveRes);

      const leaderboardRes = await api.get(`/test-portal/review/leaderboard/${testId}`);
      setLeaderboard(leaderboardRes?.data || leaderboardRes || []);
    } catch (e) {
      console.log("Failed loading monitor data:", e);
    }
  };

  const startExam = async (test: any) => {
    const statusInfo = getTestStatusForStudent(test);
    if (statusInfo.status === "completed") {
      await launchReview(statusInfo.attemptId!);
      return;
    }
    if (statusInfo.status === "ongoing") {
      try {
        const res = await api.get(`/test-portal/examination/resume/${statusInfo.attemptId}`, { "user-id": user.userId });
        setActiveAttempt(res);
        const timerRes = await api.get(`/test-portal/examination/timer/${statusInfo.attemptId}`, { "user-id": user.userId });
        const remSec = timerRes?.remainingTime ?? (res.durationMinutes * 60);
        setTimeLeft(remSec);
        setExamEndTime(Date.now() + remSec * 1000);
        
        const qRes = await api.get(`/test-portal/examination/questions/${statusInfo.attemptId}`, { "user-id": user.userId });
        setAttemptQuestions(qRes || []);
        setCurrentQIdx(0);
        
        const progressRes = await api.get(`/test-portal/examination/progress/${statusInfo.attemptId}`, { "user-id": user.userId });
        const savedAns: Record<string, string> = {};
        if (progressRes && progressRes.answers) {
          progressRes.answers.forEach((ansObj: any) => {
            savedAns[ansObj.questionId] = ansObj.selectedAnswer;
          });
        }
        setSelectedAnswers(savedAns);
      } catch (e: any) {
        Alert.alert("Error Resuming Exam", e.message || "Could not resume test attempt.");
      }
      return;
    }

    try {
      const res = await api.post(`/test-portal/examination/start/${test.id}`, {}, { "user-id": user.userId });
      const attemptData = res?.data || res;
      setActiveAttempt(attemptData);
      
      const remSec = attemptData.remainingTime ?? (attemptData.durationMinutes * 60);
      setTimeLeft(remSec);
      setExamEndTime(Date.now() + remSec * 1000);
      
      const qRes = await api.get(`/test-portal/examination/questions/${attemptData.attemptId}`, { "user-id": user.userId });
      setAttemptQuestions(qRes || []);
      setCurrentQIdx(0);
      setSelectedAnswers({});
    } catch (e: any) {
      Alert.alert("Error Starting Exam", e.message || "Could not initialize test attempt.");
    }
  };

  const selectAnswer = async (ans: string) => {
    const activeQ = attemptQuestions[currentQIdx];
    if (!activeQ || !activeAttempt) return;
    
    setSelectedAnswers(prev => ({ ...prev, [activeQ.id]: ans }));

    try {
      await api.post(`/test-portal/examination/answer/${activeAttempt.attemptId}`, {
        questionId: activeQ.id,
        answer: ans
      }, { "user-id": user.userId });
    } catch (e) {
      console.log("Failed to save answer to server:", e);
    }
  };

  const submitTestAttempt = async () => {
    if (!activeAttempt) return;
    const attemptId = activeAttempt.attemptId;
    try {
      await api.post(`/test-portal/examination/submit/${attemptId}`, {}, { "user-id": user.userId });
      const evalRes = await api.post(`/test-portal/evaluation/evaluate/${attemptId}`, {});
      const evalData = evalRes?.data || evalRes;
      
      const obtained = evalData?.obtainedMarks ?? 0;
      const total = evalData?.totalMarks ?? 0;
      const pct = evalData?.percentage ?? 0;
      const passStatus = evalData?.status === "pass" ? "PASSED" : "FAILED";

      Alert.alert(
        "Exam Submitted & Evaluated",
        `Score: ${obtained} / ${total}\nPercentage: ${Math.round(pct)}%\nStatus: ${passStatus.toUpperCase()}`
      );
      
      setActiveAttempt(null);
      setExamEndTime(0);
      loadTests();
      
      // Instantly open review view for student feedback
      await launchReview(attemptId);
    } catch (e: any) {
      Alert.alert("Error Submitting", e.message || "Could not grade your exam.");
      setActiveAttempt(null);
      setExamEndTime(0);
      loadTests();
    }
  };


  // Render Login
  if (!user) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%", padding: 20 }}>
          <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.authCard}>
            <View style={{ alignItems: "center", marginBottom: 18 }}>
              <Image source={require("./assets/logo.png")} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 1, borderColor: "#eee" }} />
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", width: "100%", position: "relative" }}>
                <Text style={styles.authTitle}>NERMAI IAS ACADEMY</Text>
                <TouchableOpacity onPress={() => setShowIpConfig(!showIpConfig)} style={{ position: "absolute", right: 0 }}>
                  <Ionicons name="settings-outline" size={22} color="#c62828" />
                </TouchableOpacity>
              </View>
              <Text style={styles.authSubtitle}>Integrated Learning Platform</Text>
            </View>

            {showIpConfig && (
              <View style={styles.ipConfigBox}>
                <Text style={styles.ipConfigLabel}>Host Server IP Address:</Text>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={hostIp}
                    onChangeText={setHostIp}
                    placeholder="192.168.x.x"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity onPress={() => setShowIpConfig(false)} style={styles.ipSaveBtn}>
                    <Text style={{ color: "#ffffff", fontWeight: "bold" }}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Two tabs: Sign In | Register */}
            <View style={styles.authTabs}>
              <TouchableOpacity onPress={() => setAuthTab("login")} style={[styles.authTabBtn, authTab === "login" && styles.authTabBtnActive]}>
                <Text style={[styles.authTabTxt, authTab === "login" && styles.authTabTxtActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setAuthTab("guest")} style={[styles.authTabBtn, authTab === "guest" && styles.authTabBtnActive]}>
                <Text style={[styles.authTabTxt, authTab === "guest" && styles.authTabTxtActive]}>Register</Text>
              </TouchableOpacity>
            </View>

            {/* Guest Login Form */}
            {authTab === "guest" && (
              <View>
                <Text style={{ fontSize: 13, color: "#757575", marginBottom: 15, textAlign: "center" }}>
                  Register to access free resources & portal updates
                </Text>
                <TextInput style={styles.input} placeholder="Your Full Name *" placeholderTextColor="#999" value={guestName} onChangeText={setGuestName} />
                <TextInput style={styles.input} placeholder="Phone Number *" placeholderTextColor="#999" value={guestPhone} onChangeText={setGuestPhone} keyboardType="phone-pad" />
                <TextInput style={styles.input} placeholder="Email (Optional)" placeholderTextColor="#999" value={guestEmail} onChangeText={setGuestEmail} keyboardType="email-address" />
                <TouchableOpacity onPress={handleGuestLogin} style={[styles.primaryBtn, { backgroundColor: "#c62828" }]}>
                  <Text style={styles.primaryBtnTxt}>REGISTER & ENTER →</Text>
                </TouchableOpacity>
                <Text style={{ textAlign: "center", fontSize: 11, color: "#aaa", marginTop: 10 }}>
                  By registering, you get free access to updates and announcements.
                </Text>
              </View>
            )}

            {/* Regular login form */}
            {authTab === "login" && (
              <>
                <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#999" value={username} onChangeText={setUsername} autoCapitalize="none" />
                <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />

                <TouchableOpacity onPress={() => handleAuth()} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnTxt}>LOG IN</Text>
                </TouchableOpacity>

                <View style={{ marginTop: 25, borderTopWidth: 1, borderColor: "#e0e0e0", paddingTop: 15 }}>
                  <Text style={{ textAlign: "center", fontSize: 12, color: "#757575", marginBottom: 10 }}>Quick Login Demos:</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity onPress={() => { setAuthTab("login"); setUsername("student"); setPassword("student"); handleAuth("student", "student", true); }} style={styles.demoBtn}>
                      <Text style={styles.demoBtnTxt}>Student Demo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setAuthTab("login"); setUsername("admin"); setPassword("admin"); handleAuth("admin", "admin", true); }} style={styles.demoBtn}>
                      <Text style={styles.demoBtnTxt}>Admin Demo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ================== GUEST USER DASHBOARD ==================
  if (user?.role === "guest") {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image source={require("./assets/logo.png")} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#fff" }} />
            <View>
              <Text style={styles.headerTitle}>NERMAI IAS ACADEMY</Text>
              <Text style={{ color: "#fff", opacity: 0.8, fontSize: 11 }}>Welcome, {user.name} (Free Access)</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={async () => {
              await guestStorage.disableAutoLogin();
              setUser(null);
            }} 
            style={styles.logoutBtn}
          >
            <Text style={styles.logoutBtnTxt}>Exit</Text>
          </TouchableOpacity>
        </View>

        {/* Guest Bottom Nav */}
        <View style={{ flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderColor: "#e0e0e0" }}>
          {(["home", "courses", "updates"] as const).map(tab => (
            <TouchableOpacity key={tab} onPress={() => setGuestTab(tab)} style={{ flex: 1, paddingVertical: 10, alignItems: "center", borderBottomWidth: 2, borderBottomColor: guestTab === tab ? "#c62828" : "transparent" }}>
              <Ionicons name={tab === "home" ? "home-outline" : tab === "courses" ? "book-outline" : "notifications-outline"} size={20} color={guestTab === tab ? "#c62828" : "#757575"} />
              <Text style={{ fontSize: 10, color: guestTab === tab ? "#c62828" : "#757575", fontWeight: "bold", marginTop: 2 }}>{tab === "home" ? "Home" : tab === "courses" ? "Courses" : "Updates"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* HOME TAB */}
          {guestTab === "home" && (
            <View style={{ gap: 15 }}>
              {/* Active Guest Campaign Banners (Ad Containers) */}
              {campaigns.filter((c: any) => c.showInDashboard && c.posterUrl).length > 0 && (
                <View style={{ marginBottom: 5 }}>
                  <Text style={styles.sectionTitle}>Highlights & Special Offers</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginVertical: 8 }}>
                    {campaigns.filter((c: any) => c.showInDashboard && c.posterUrl).map((cp: any) => (
                      <View key={cp.id} style={[styles.card, { width: 285, marginRight: 12, padding: 0, overflow: "hidden" }]}>
                        <Image source={{ uri: cp.posterUrl }} style={{ width: "100%", height: 110, resizeMode: "cover" }} />
                        <View style={{ padding: 10 }}>
                          <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 13 }}>{cp.title}</Text>
                          {cp.description ? <Text style={{ color: "#757575", fontSize: 11, marginTop: 2 }} numberOfLines={2}>{cp.description}</Text> : null}
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Text Promo Banners for Guest */}
              {campaigns.filter((c: any) => c.showInDashboard && !c.posterUrl).map((cp: any) => (
                <View key={cp.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#1565c0", backgroundColor: "#e3f2fd", marginVertical: 4 }]}>
                  <Text style={{ fontWeight: "bold", color: "#1565c0", fontSize: 13 }}>{cp.title}</Text>
                  {cp.description ? <Text style={{ color: "#212121", fontSize: 12, marginTop: 2 }}>{cp.description}</Text> : null}
                </View>
              ))}

              {/* Campaign Notification Alerts for Guest */}
              {campaigns.filter((c: any) => c.sendNotification).map((cp: any) => (
                <View key={cp.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#2e7d32", backgroundColor: "#e8f5e9", marginVertical: 4 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <Ionicons name="notifications" size={15} color="#2e7d32" />
                    <Text style={{ fontWeight: "bold", color: "#2e7d32", fontSize: 11 }}>SYSTEM UPDATE</Text>
                  </View>
                  <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 13 }}>{cp.title}</Text>
                  <Text style={{ color: "#212121", fontSize: 12, marginTop: 2 }}>
                    {cp.notificationMessage || cp.description}
                  </Text>
                </View>
              ))}

              {/* Academy Courses Banner (Image 1) */}
              <View style={[styles.card, { backgroundColor: "#800000", padding: 20, borderRadius: 12 }]}>
                <Text style={{ fontSize: 14, fontWeight: "bold", color: "#fff", lineHeight: 22, marginBottom: 15, textAlign: "center" }}>
                  Renowned Coaching Institute for UPSC (Civil Services), Puducherry UDC, LDC, Sub-Inspector, Deputy Tahsildar, TNPSC Group II and Other Competitive Examinations.
                </Text>
                <View style={{ gap: 12 }}>
                  {[
                    "UPSC CIVIL SERVICE ( IAS / IPS )",
                    "TNPSC / RAILWAYS",
                    "UDC / LDC / VAO",
                    "BANKING",
                    "PUDUCHERRY EXAM",
                    "SSC / PC / DT / SI"
                  ].map((course, idx) => (
                    <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <Ionicons name="thumbs-up" size={18} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 14, fontWeight: "bold", letterSpacing: 0.5 }}>
                        {course}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Core Offerings Grid (Image 2) */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginVertical: 10 }}>
                {[
                  { title: "Non Profit Initiative", icon: "heart-outline", color: "#1976d2" },
                  { title: "Comprehensive syllabus coverage", icon: "book-outline", color: "#4caf50" },
                  { title: "Regular Test Practice", icon: "create-outline", color: "#e65100" },
                  { title: "Personal Guidance/ Counseling", icon: "people-outline", color: "#9c27b0" },
                  { title: "Offline & Online", icon: "laptop-outline", color: "#00acc1" },
                  { title: "Digitally interactive Classroom", icon: "desktop-outline", color: "#e53935" },
                  { title: "Result Driven Learning", icon: "trophy-outline", color: "#8d6e63" },
                  { title: "Video Library", icon: "play-circle-outline", color: "#3f51b5" }
                ].map((item, i) => (
                  <View key={i} style={[styles.card, { width: "48%", alignItems: "center", paddingVertical: 18, paddingHorizontal: 10, margin: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 }]}>
                    <Ionicons name={item.icon as any} size={28} color={item.color} style={{ marginBottom: 8 }} />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#2c3e50", textAlign: "center", lineHeight: 15 }}>
                      {item.title}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Academy Key Features (Image 3) */}
              <View style={{ marginVertical: 10 }}>
                <Text style={[styles.sectionTitle, { textAlign: "center", fontSize: 18, color: "#1a237e", marginBottom: 12, borderBottomWidth: 0 }]}>
                  Our Features
                </Text>
                <View style={{ gap: 12 }}>
                  {[
                    {
                      title: "Digitally interactive Classroom",
                      desc: "Even for a service based institution, what really matters is? Coaching. That's the prime of everything, so that we said goodbye to the old school model i.e. Marker Board Presentation.",
                      icon: "videocam-outline",
                      color: "#c62828",
                      bgColor: "#ffebee"
                    },
                    {
                      title: "Friendly Environment",
                      desc: "Our tagline denotes \"an institute run by volunteers, students and service minded teachers\". Like what mentioned above, we run this academy with the direct and indirect participation of the students in various fields of administration.",
                      icon: "people-outline",
                      color: "#1565c0",
                      bgColor: "#e3f2fd"
                    },
                    {
                      title: "Video Library",
                      desc: "The entire class in a batch is compiled as video and the same is uploaded in the cloud storage. So that aspirants can get it whenever they are in need during their course period. No matter what?",
                      icon: "film-outline",
                      color: "#2e7d32",
                      bgColor: "#e8f5e9"
                    }
                  ].map((feat, idx) => (
                    <View key={idx} style={[styles.card, { padding: 16 }]}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <View style={{ padding: 6, borderRadius: 8, backgroundColor: feat.bgColor }}>
                          <Ionicons name={feat.icon as any} size={20} color={feat.color} />
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: "bold", color: "#1a237e", flex: 1 }}>
                          {feat.title}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: "#555", lineHeight: 18 }}>
                        {feat.desc}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Admission CTA */}
              {admissionSubmitted ? (
                <View style={[styles.card, { backgroundColor: "#e8f5e9", borderColor: "#4caf50" }]}>
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: "#2e7d32", textAlign: "center" }}>Application Submitted!</Text>
                  <Text style={{ color: "#555", textAlign: "center", marginTop: 8, fontSize: 13 }}>Our team will contact you shortly at {user.phone}</Text>
                </View>
              ) : showAdmissionForm ? (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Admission Application</Text>
                  <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#999" value={admissionForm.name} onChangeText={v => setAdmissionForm({ ...admissionForm, name: v })} />
                  <TextInput style={styles.input} placeholder="Phone Number *" placeholderTextColor="#999" value={admissionForm.phone} onChangeText={v => setAdmissionForm({ ...admissionForm, phone: v })} keyboardType="phone-pad" />
                  <TextInput style={styles.input} placeholder="Email (Optional)" placeholderTextColor="#999" value={admissionForm.email} onChangeText={v => setAdmissionForm({ ...admissionForm, email: v })} keyboardType="email-address" />
                  <TextInput style={styles.input} placeholder="City" placeholderTextColor="#999" value={admissionForm.city} onChangeText={v => setAdmissionForm({ ...admissionForm, city: v })} />
                  <Text style={styles.label}>Preferred Course:</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 15 }}>
                    {["UPSC GS", "TNPSC Group 1", "TNPSC Group 2", "LDC", "SSC", "Other"].map(c => (
                      <TouchableOpacity key={c} onPress={() => setAdmissionForm({ ...admissionForm, preferredCourse: c })} style={[styles.roleBtn, admissionForm.preferredCourse === c && styles.roleBtnActive]}>
                        <Text style={[styles.roleBtnTxt, admissionForm.preferredCourse === c && styles.roleBtnTxtActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity onPress={() => setShowAdmissionForm(false)} style={[styles.outlineBtn, { flex: 1 }]}>
                      <Text style={styles.outlineBtnTxt}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleGuestAdmission} style={[styles.primaryBtn, { flex: 1 }]}>
                      <Text style={styles.primaryBtnTxt}>Submit Application</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setShowAdmissionForm(true); setAdmissionForm({ name: user.name, phone: user.phone, email: user.email, city: "", preferredCourse: "UPSC GS" }); }} style={[styles.primaryBtn, { paddingVertical: 18 }]}>
                  <Text style={[styles.primaryBtnTxt, { fontSize: 16 }]}>Register Nermai IAS Academy</Text>
                </TouchableOpacity>
              )}

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Contact Us</Text>
                <Text style={{ color: "#555", fontSize: 13, lineHeight: 22 }}>
                  Phone: +91 99999 00000{"\n"}
                  Email: info@nermaiacademy.com{"\n"}
                  Address: Nermai IAS Academy, Tamil Nadu
                </Text>
              </View>
            </View>
          )}

          {/* COURSES TAB */}
          {guestTab === "courses" && (
            <View style={{ gap: 12 }}>
              <Text style={styles.sectionTitle}>Available Courses</Text>
              {courses.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="book-outline" size={40} color="#757575" />
                  <Text style={styles.emptyText}>No courses available yet. Check back soon!</Text>
                </View>
              ) : (
                courses.map(course => (
                  <View key={course.id} style={styles.card}>
                    <Text style={{ fontSize: 15, fontWeight: "bold", color: "#c62828", marginBottom: 4 }}>{course.name}</Text>
                    {course.category && <Text style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>Category: {course.category}</Text>}
                    {course.description && <Text style={{ color: "#555", fontSize: 13, marginBottom: 8 }}>{course.description}</Text>}
                    {course.duration && <Text style={{ color: "#757575", fontSize: 12, marginBottom: 4 }}>Duration: {course.duration}</Text>}
                    {course.fee > 0 && <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 14, marginBottom: 10 }}>₹{course.fee}</Text>}
                    <TouchableOpacity onPress={() => markCourseInterest(course)} style={[styles.primaryBtn, { backgroundColor: "#1565c0" }]}>
                      <Text style={styles.primaryBtnTxt}>I'm Interested</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}

          {/* UPDATES TAB */}
          {guestTab === "updates" && (
            <View style={{ gap: 15 }}>
              {/* Campaign & Academy Updates */}
              {campaigns.filter((c: any) => c.sendNotification).length > 0 && (
                <View style={styles.card}>
                  <Text style={[styles.sectionTitle, { color: "#2e7d32", borderBottomWidth: 1, borderBottomColor: "#e0e0e0", paddingBottom: 8 }]}>
                    Campaign & Academy Updates
                  </Text>
                  <View style={{ gap: 10, marginTop: 10 }}>
                    {campaigns.filter((c: any) => c.sendNotification).map((cp: any) => (
                      <View key={cp.id} style={{ backgroundColor: "#e8f5e9", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#c8e6c9" }}>
                        <Text style={{ fontWeight: "bold", fontSize: 14, color: "#2e7d32", marginBottom: 4 }}>{cp.title}</Text>
                        <Text style={{ fontSize: 13, color: "#333", marginBottom: 6 }}>{cp.notificationMessage || cp.description}</Text>
                        <Text style={{ fontSize: 10, color: "#757575" }}>
                          Received: {cp.createdAt ? new Date(cp.createdAt).toLocaleString() : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Private Counselor Messages */}
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { color: "#1565c0", borderBottomWidth: 1, borderBottomColor: "#e0e0e0", paddingBottom: 8 }]}>
                  Counselor Messages
                </Text>
                {guestNotifications.length === 0 ? (
                  <View style={{ paddingVertical: 20, alignItems: "center" }}>
                    <Ionicons name="chatbubbles-outline" size={36} color="#9e9e9e" />
                    <Text style={{ color: "#757575", fontSize: 13, textAlign: "center", marginTop: 8 }}>
                      No direct messages from counselor yet.
                    </Text>
                    <Text style={{ color: "#9e9e9e", fontSize: 11, textAlign: "center", marginTop: 4 }}>
                      Personal updates from the CRM admin panel to your phone will appear here.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10, marginTop: 10 }}>
                    {guestNotifications.map(notif => (
                      <View key={notif.id} style={{ backgroundColor: "#f5f5f5", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#e0e0e0" }}>
                        <Text style={{ fontWeight: "bold", fontSize: 14, color: "#1565c0", marginBottom: 4 }}>{notif.title}</Text>
                        <Text style={{ fontSize: 13, color: "#333", marginBottom: 6 }}>{notif.message}</Text>
                        <Text style={{ fontSize: 10, color: "#9e9e9e" }}>
                          Received: {notif.sentAt ? new Date(notif.sentAt).toLocaleString() : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Public Announcements */}
              <View style={styles.card}>
                <Text style={[styles.sectionTitle, { color: "#c62828", borderBottomWidth: 1, borderBottomColor: "#e0e0e0", paddingBottom: 8 }]}>
                  Public Announcements
                </Text>
                {announcements.length === 0 ? (
                  <View style={{ paddingVertical: 20, alignItems: "center" }}>
                    <Ionicons name="notifications-off-outline" size={36} color="#9e9e9e" />
                    <Text style={{ color: "#757575", fontSize: 13, textAlign: "center", marginTop: 8 }}>
                      No announcements posted yet.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 10, marginTop: 10 }}>
                    {announcements.filter(a => a.targetDashboard === "all" || !a.targetDashboard).map(ann => (
                      <View key={ann.id} style={{ borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 10 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <Text style={{ fontWeight: "bold", fontSize: 14, color: ann.priority === "high" ? "#d32f2f" : "#333", flex: 1 }}>
                            {ann.title}
                          </Text>
                          {ann.priority === "high" && (
                            <View style={{ backgroundColor: "#ffebee", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ color: "#c62828", fontSize: 9, fontWeight: "bold" }}>URGENT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>{ann.content}</Text>
                        <Text style={{ fontSize: 10, color: "#9e9e9e" }}>
                          Posted: {ann.createdAt ? new Date(ann.createdAt).toLocaleDateString() : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render main screen

  if (activeAttempt) {
    return (
      <SafeAreaView style={[styles.modalContainer, { flex: 1, backgroundColor: "#ffffff" }]}>
        <StatusBar style="light" />
        <View style={[styles.header, { backgroundColor: "#c62828" }]}>
          <Text style={styles.headerTitle}>{activeAttempt.title || "Examination in Progress"}</Text>
          <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 18 }}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
          </Text>
        </View>

        {attemptQuestions[currentQIdx] ? (
          <View style={{ flex: 1, padding: 20, backgroundColor: "#ffffff" }}>
            <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 14, marginBottom: 8 }}>
              QUESTION {currentQIdx + 1} OF {attemptQuestions.length}
            </Text>
            
            <Text style={{ fontSize: 18, fontWeight: "bold", color: "#212121", marginBottom: 20 }}>
              {attemptQuestions[currentQIdx].question}
            </Text>

            <View style={{ gap: 10 }}>
              {attemptQuestions[currentQIdx].options?.map((opt: string, oIdx: number) => {
                const selected = selectedAnswers[attemptQuestions[currentQIdx].id] === opt;
                return (
                  <TouchableOpacity
                    key={oIdx}
                    onPress={() => selectAnswer(opt)}
                    style={[styles.modalOptionBtn, selected && styles.modalOptionBtnSelected]}
                  >
                    <Text style={{ color: selected ? "#ffffff" : "#212121", fontWeight: "bold" }}>
                      {String.fromCharCode(65 + oIdx)}. {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Navigation inside Modal */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 40 }}>
              <TouchableOpacity
                disabled={currentQIdx === 0}
                onPress={() => setCurrentQIdx(prev => prev - 1)}
                style={[styles.demoBtn, currentQIdx === 0 && { opacity: 0.5 }]}
              >
                <Text style={styles.demoBtnTxt}>Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={submitTestAttempt} style={[styles.primaryBtn, { backgroundColor: "#c62828", minWidth: 120 }]}>
                <Text style={styles.primaryBtnTxt}>Submit Exam</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={currentQIdx === attemptQuestions.length - 1}
                onPress={() => setCurrentQIdx(prev => prev + 1)}
                style={[styles.demoBtn, currentQIdx === attemptQuestions.length - 1 && { opacity: 0.5 }]}
              >
                <Text style={styles.demoBtnTxt}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#ffffff" }}>
            <Text style={{ color: "#757575" }}>Loading Exam Questions...</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (reviewMode && reviewData) {
    return (
      <SafeAreaView style={[styles.modalContainer, { flex: 1, backgroundColor: "#ffffff" }]}>
        <StatusBar style="light" />
        <View style={[styles.header, { backgroundColor: "#2e7d32" }]}>
          <Text style={styles.headerTitle}>{reviewData.testTitle || "Review Answers"}</Text>
          <TouchableOpacity onPress={() => { setReviewMode(false); setReviewData(null); }} style={{ padding: 8 }}>
            <Ionicons name="close-circle-outline" size={26} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: "#e8f5e9", padding: 15, borderBottomWidth: 1, borderColor: "#c8e6c9" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1b5e20" }}>
              Score: {reviewData.obtainedMarks} / {reviewData.totalMarks}
            </Text>
            <View style={{ backgroundColor: reviewData.status === "pass" ? "#2e7d32" : "#c62828", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 11 }}>
                {String(reviewData.status).toUpperCase()} ({Math.round(reviewData.percentage)}%)
              </Text>
            </View>
          </View>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: "#ffffff" }} contentContainerStyle={{ padding: 15 }}>
          {reviewData.questions?.map((q: any, idx: number) => {
            const isCorrect = q.isCorrect;
            const isSkipped = q.selectedAnswer === null || q.selectedAnswer === undefined || q.selectedAnswer === "";
            
            return (
              <View key={idx} style={{ 
                marginBottom: 20, 
                padding: 15, 
                borderRadius: 12, 
                borderWidth: 1, 
                borderColor: isSkipped ? "#e0e0e0" : isCorrect ? "#c8e6c9" : "#ffcdd2",
                backgroundColor: isSkipped ? "#fafafa" : isCorrect ? "#f1f8e9" : "#ffebee" 
              }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 13 }}>
                    Question {idx + 1}
                  </Text>
                  <View style={{ 
                    paddingHorizontal: 8, 
                    paddingVertical: 3, 
                    borderRadius: 8, 
                    backgroundColor: isSkipped ? "#9e9e9e" : isCorrect ? "#2e7d32" : "#c62828" 
                  }}>
                    <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "bold" }}>
                      {isSkipped ? "Unattempted (0)" : isCorrect ? "Correct (+1)" : "Incorrect (-0.25)"}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 15, fontWeight: "bold", color: "#212121", marginBottom: 10 }}>
                  {q.questionText}
                </Text>

                <View style={{ gap: 8, marginBottom: 10 }}>
                  {q.options?.map((opt: string, oIdx: number) => {
                    const letter = String.fromCharCode(65 + oIdx);
                    const isSelected = q.selectedAnswer === letter || q.selectedAnswer === opt;
                    const isCorrectOption = q.correctAnswer === letter || q.correctAnswer === opt;
                    
                    let borderC = "#e0e0e0";
                    let bgC = "#ffffff";
                    let textC = "#212121";

                    if (isCorrectOption) {
                      borderC = "#2e7d32";
                      bgC = "#e8f5e9";
                      textC = "#2e7d32";
                    } else if (isSelected) {
                      borderC = "#c62828";
                      bgC = "#ffebee";
                      textC = "#c62828";
                    }

                    return (
                      <View key={oIdx} style={{ 
                        flexDirection: "row", 
                        alignItems: "center", 
                        padding: 10, 
                        borderRadius: 8, 
                        borderWidth: 1, 
                        borderColor: borderC, 
                        backgroundColor: bgC 
                      }}>
                        <Text style={{ fontWeight: "bold", color: textC, marginRight: 8 }}>
                          {letter}.
                        </Text>
                        <Text style={{ flex: 1, color: textC, fontWeight: isCorrectOption || isSelected ? "bold" : "normal" }}>
                          {opt}
                        </Text>
                        {isCorrectOption && (
                          <Ionicons name="checkmark-circle" size={16} color="#2e7d32" />
                        )}
                        {isSelected && !isCorrectOption && (
                          <Ionicons name="close-circle" size={16} color="#c62828" />
                        )}
                      </View>
                    );
                  })}
                </View>

                {q.explanation && (
                  <View style={{ marginTop: 8, padding: 10, backgroundColor: "#fffde7", borderRadius: 8, borderLeftWidth: 3, borderLeftColor: "#fbc02d" }}>
                    <Text style={{ fontWeight: "bold", fontSize: 11, color: "#f57f17", marginBottom: 2 }}>Explanation:</Text>
                    <Text style={{ fontSize: 12, color: "#5d4037" }}>{q.explanation}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, darkMode && { backgroundColor: "#121212" }]}>
      <StatusBar style={darkMode ? "light" : "dark"} />
      
      {/* Hamburger Drawer Overlay */}
      {showHamburger && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, flexDirection: "row" }}>
          {/* Backdrop */}
          <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} onPress={() => setShowHamburger(false)} />
          {/* Drawer Panel */}
          <View style={[styles.drawerPanel, darkMode && styles.drawerPanelDark]}>
            {/* Drawer Header */}
            <View style={[styles.drawerHeader, darkMode && styles.drawerHeaderDark]}>
              <View style={styles.drawerAvatarCircle}>
                <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 22 }}>{user.name?.[0]?.toUpperCase() || "U"}</Text>
              </View>
              <Text style={[styles.drawerName, darkMode && { color: "#f0f0f0" }]}>{user.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: user.role === "admin" ? "#b71c1c" : user.role === "staff" ? "#1565c0" : "#2e7d32" }]}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>{user.role.toUpperCase()}</Text>
              </View>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Settings Section */}
              <Text style={[styles.drawerSection, darkMode && { color: "#9e9e9e" }]}>APPEARANCE</Text>
              <View style={[styles.drawerItem, darkMode && styles.drawerItemDark]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View style={[styles.drawerIconBox, { backgroundColor: darkMode ? "#7c4dff" : "#e3f2fd" }]}>
                    <Ionicons name={darkMode ? "moon" : "sunny"} size={18} color={darkMode ? "#ffffff" : "#1565c0"} />
                  </View>
                  <Text style={[styles.drawerItemTxt, darkMode && { color: "#e0e0e0" }]}>{darkMode ? "Dark Mode" : "Light Mode"}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setDarkMode(!darkMode)}
                  style={[styles.toggleTrack, darkMode && styles.toggleTrackOn]}
                >
                  <View style={[styles.toggleThumb, darkMode && styles.toggleThumbOn]} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.drawerSection, darkMode && { color: "#9e9e9e" }]}>ACCOUNT</Text>
              {user?.role !== "admin" && user?.role !== "staff" && (
                <TouchableOpacity
                  style={[styles.drawerItem, darkMode && styles.drawerItemDark]}
                  onPress={() => { setShowHamburger(false); setShowFeedbackModal(true); }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                    <View style={[styles.drawerIconBox, { backgroundColor: "#e8f5e9" }]}>
                      <Ionicons name="chatbox-ellipses-outline" size={18} color="#2e7d32" />
                    </View>
                    <Text style={[styles.drawerItemTxt, darkMode && { color: "#e0e0e0" }]}>Send Feedback</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={darkMode ? "#9e9e9e" : "#bdbdbd"} />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.drawerItem, darkMode && styles.drawerItemDark]}
                onPress={() => { setShowHamburger(false); setShowIpConfig(!showIpConfig); }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View style={[styles.drawerIconBox, { backgroundColor: "#fff3e0" }]}>
                    <Ionicons name="settings-outline" size={18} color="#e65100" />
                  </View>
                  <Text style={[styles.drawerItemTxt, darkMode && { color: "#e0e0e0" }]}>Server Settings</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={darkMode ? "#9e9e9e" : "#bdbdbd"} />
              </TouchableOpacity>

              <View style={[styles.drawerDivider, darkMode && { borderColor: "#333" }]} />

              <TouchableOpacity
                style={[styles.drawerItem, { marginBottom: 30 }]}
                onPress={async () => { 
                  await guestStorage.disableAutoLogin();
                  setShowHamburger(false); 
                  setUser(null); 
                  setActiveTab("dashboard"); 
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                  <View style={[styles.drawerIconBox, { backgroundColor: "#ffebee" }]}>
                    <Ionicons name="log-out-outline" size={18} color="#c62828" />
                  </View>
                  <Text style={[styles.drawerItemTxt, { color: "#c62828", fontWeight: "700" }]}>Logout</Text>
                </View>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <Modal visible={true} animationType="slide" transparent>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
            <View style={[styles.feedbackSheet, darkMode && styles.feedbackSheetDark]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <Text style={[styles.feedbackTitle, darkMode && { color: "#f0f0f0" }]}>Send Feedback</Text>
                <TouchableOpacity onPress={() => setShowFeedbackModal(false)}>
                  <Ionicons name="close" size={24} color={darkMode ? "#9e9e9e" : "#757575"} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, darkMode && { color: "#aaa" }]}>How would you rate your experience?</Text>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                {[1,2,3,4,5].map(r => (
                  <TouchableOpacity key={r} onPress={() => setFeedbackRating(r)} style={{ alignItems: "center" }}>
                    <Ionicons name={r <= feedbackRating ? "star" : "star-outline"} size={32} color={r <= feedbackRating ? "#FFA000" : "#bdbdbd"} />
                    <Text style={{ fontSize: 10, color: darkMode ? "#9e9e9e" : "#757575", marginTop: 2 }}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, darkMode && { color: "#aaa" }]}>Your message (optional)</Text>
              <TextInput
                style={[styles.input, { height: 100 }, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444", color: "#e0e0e0" }]}
                placeholder="Tell us what you think..."
                placeholderTextColor={darkMode ? "#666" : "#999"}
                multiline
                value={feedbackText}
                onChangeText={setFeedbackText}
              />

              <TouchableOpacity
                onPress={submitStudentFeedback}
                style={[styles.primaryBtn, { width: "100%" }]}
              >
                <Text style={styles.primaryBtnTxt}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Header */}
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={[styles.headerLogo, { backgroundColor: "transparent", borderWidth: 0 }]}>
            <Image source={require("./assets/logo.png")} style={{ width: 34, height: 34, borderRadius: 17 }} />
          </View>
          <View>
            <Text style={[styles.headerTitle, darkMode && { color: "#f5f5f5" }]}>Nermai IAS</Text>
            <Text style={{ color: darkMode ? "#9e9e9e" : "#9e9e9e", fontSize: 10 }}>{user.role === "student" ? `Student · ${user.name}` : `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Portal`}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowHamburger(true)} style={styles.hamburgerBtn}>
          <View style={styles.hamburgerLine} />
          <View style={[styles.hamburgerLine, { width: 18 }]} />
          <View style={[styles.hamburgerLine, { width: 22 }]} />
        </TouchableOpacity>
      </View>

      {/* Main Content Body */}
      <View style={[styles.mainBody, darkMode && { backgroundColor: "#121212" }]}>

        {/* ================== 1. DASHBOARD ================== */}
        {activeTab === "dashboard" && (
          <ScrollView style={[styles.body, darkMode && { backgroundColor: "#121212" }]} contentContainerStyle={{ paddingBottom: 80 }}>
            <View style={{ gap: 15 }}>
                {/* Active Campaign banners (Ad Containers) */}
                {user.role === "student" && campaigns.filter((c: any) => c.showInDashboard && c.posterUrl).length > 0 && (
                  <View style={{ marginBottom: 5 }}>
                    <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>Special Highlights & Programs</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", marginVertical: 8 }}>
                      {campaigns.filter((c: any) => c.showInDashboard && c.posterUrl).map((cp: any) => (
                        <View key={cp.id} style={[styles.card, darkMode && styles.cardDark, { width: 280, marginRight: 12, padding: 0, overflow: "hidden" }]}>
                          <Image source={{ uri: cp.posterUrl }} style={{ width: "100%", height: 110, resizeMode: "cover" }} />
                          <View style={{ padding: 10 }}>
                            <Text style={{ fontWeight: "bold", color: darkMode ? "#e0e0e0" : "#212121", fontSize: 13 }}>{cp.title}</Text>
                            {cp.description ? <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 11, marginTop: 2 }} numberOfLines={2}>{cp.description}</Text> : null}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Campaign notification banners */}
                {user.role === "student" && campaigns.filter((c: any) => c.sendNotification).map((cp: any) => (
                  <View key={cp.id} style={[styles.card, darkMode && styles.cardDark, { borderLeftWidth: 4, borderLeftColor: "#2e7d32", backgroundColor: darkMode ? "#1b2e1b" : "#e8f5e9", marginVertical: 4 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Ionicons name="notifications" size={15} color="#2e7d32" />
                      <Text style={{ fontWeight: "bold", color: "#2e7d32", fontSize: 11 }}>SYSTEM UPDATE</Text>
                    </View>
                    <Text style={{ fontWeight: "bold", color: darkMode ? "#e0e0e0" : "#212121", fontSize: 13 }}>{cp.title}</Text>
                    <Text style={{ color: darkMode ? "#cccccc" : "#212121", fontSize: 12, marginTop: 2 }}>
                      {cp.notificationMessage || cp.description}
                    </Text>
                  </View>
                ))}

                {/* Text Promo Banners for Paid Students */}
                {user.role === "student" && campaigns.filter((c: any) => c.showInDashboard && !c.posterUrl).map((cp: any) => (
                  <View key={cp.id} style={[styles.card, darkMode && styles.cardDark, { borderLeftWidth: 4, borderLeftColor: "#1565c0", backgroundColor: darkMode ? "#1a2c3d" : "#e3f2fd", marginVertical: 4 }]}>
                    <Text style={{ fontWeight: "bold", color: "#1565c0", fontSize: 13 }}>{cp.title}</Text>
                    {cp.description ? <Text style={{ color: darkMode ? "#cccccc" : "#212121", fontSize: 12, marginTop: 2 }}>{cp.description}</Text> : null}
                  </View>
                ))}

                {user.role === "student" && (() => {
                  const myStudent = students.find((s: any) => s.email === user.email || s.phone === user.phone || s.rollNumber === user.username || s.id === user.userId);
                  const isGenerated = myStudent && (myStudent.idCardGenerated === true || myStudent.hallTicketGenerated === true);
                  if (isGenerated) {
                    return (
                      <View style={{ alignItems: "center", marginBottom: 15 }}>
                        <Text style={[styles.sectionTitle, { alignSelf: "stretch" }]}>My Generated ID Card / Hall Ticket</Text>
                        <View style={styles.idCard}>
                          <Text style={styles.idCardHeader}>NERMAI IAS ACADEMY</Text>
                          <View style={styles.idCardAvatar}><Ionicons name="person" size={40} color="#c62828" /></View>
                          <Text style={styles.idCardName}>{myStudent.firstName} {myStudent.lastName}</Text>
                          <Text style={{ color: "#c62828", fontSize: 12, fontWeight: "bold", marginBottom: 10 }}>IAS CANDIDATE</Text>
                          <View style={{ width: "100%", borderTopWidth: 1, borderColor: "#e0e0e0", paddingTop: 8, gap: 2 }}>
                            <Text style={styles.idCardMeta}>Roll No: {myStudent.rollNumber}</Text>
                            <Text style={styles.idCardMeta}>Admission: {myStudent.admissionNumber}</Text>
                            <Text style={styles.idCardMeta}>Batch: {myStudent.batch || "UPSC 2026"}</Text>
                            <Text style={styles.idCardMeta}>Course: {myStudent.course}</Text>
                          </View>
                          <View style={styles.idBarcode}>
                            <Text style={{ letterSpacing: 3, fontSize: 10, color: "#ffffff", fontWeight: "bold" }}>|||| BARCODE ||||</Text>
                          </View>
                        </View>
                      </View>
                    );
                  }
                  return null;
                })()}

                {(user.role === "admin" || user.role === "staff") ? (
                  <>
                    <View style={styles.row}>
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardVal}>{students.length}</Text>
                        <Text style={styles.cardLbl}>Registered Students</Text>
                      </View>
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardVal}>{staff.length}</Text>
                        <Text style={styles.cardLbl}>Faculty & Mentors</Text>
                      </View>
                    </View>
                    <View style={styles.row}>
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardVal}>{tests.length}</Text>
                        <Text style={styles.cardLbl}>Active Mock Exams</Text>
                      </View>
                      <View style={[styles.card, { flex: 1 }]}>
                        <Text style={styles.cardVal}>{admissions.length}</Text>
                        <Text style={styles.cardLbl}>Logged Inquiries</Text>
                      </View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>Welcome to Nermai IAS Academy</Text>
                      <Text style={{ color: "#212121", fontSize: 13, lineHeight: 20 }}>
                        Welcome back, {user.name}! Use the navigation options below to check your individual analytics, view your mock test marks, keep track of your fee payments, and take your exams and daily quizzes.
                      </Text>
                    </View>

                    {/* Pending Daily Capsule Quiz Card on Dashboard */}
                    {todayQuiz && !todayQuiz.existingAttempt && (
                      <View style={[styles.card, { borderTopWidth: 4, borderTopColor: "#c62828" }]}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                          <Text style={[styles.sectionTitle, { color: "#c62828", marginBottom: 0, fontSize: 15 }]}>Pending Daily Capsule Quiz</Text>
                          <Text style={{ fontSize: 11, color: "#757575", fontWeight: "bold" }}>Date: {todayQuiz.quizDate}</Text>
                        </View>
                        <Text style={{ fontWeight: "bold", fontSize: 14, color: "#212121", marginBottom: 8 }}>{todayQuiz.title}</Text>
                        <Text style={{ fontSize: 12, color: "#757575", marginBottom: 15 }}>
                          This daily quiz is active on your dashboard. Complete it now to test your knowledge!
                        </Text>

                        {todayQuiz.questions.map((quizItem: any, qIdx: number) => (
                          <View key={qIdx} style={{ marginVertical: 10, borderBottomWidth: 1, borderColor: "#eeeeee", paddingBottom: 10 }}>
                            <Text style={{ fontWeight: "700", color: "#212121", marginBottom: 8 }}>{qIdx + 1}. {quizItem.questionText}</Text>
                            <View style={{ gap: 6 }}>
                              {quizItem.options.map((opt: string, oIdx: number) => {
                                const selected = quizAnswers[qIdx] === oIdx;
                                return (
                                  <TouchableOpacity
                                    key={oIdx}
                                    onPress={() => setQuizAnswers({ ...quizAnswers, [qIdx]: oIdx })}
                                    style={[styles.optionBtn, selected && styles.optionBtnSelected]}
                                  >
                                    <Text style={{ color: selected ? "#ffffff" : "#212121", fontWeight: selected ? "bold" : "normal" }}>{opt}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        ))}

                        <TouchableOpacity onPress={submitLmsQuiz} style={[styles.primaryBtn, { marginTop: 15 }]}>
                          <Text style={styles.primaryBtnTxt}>Submit Quiz</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                {/* Notifications Center for Users */}
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>🔔 System Alerts & Notifications</Text>
                  {notifications.length === 0 ? (
                    <View style={[styles.card, { padding: 15, alignItems: "center" }]}>
                      <Text style={styles.emptyText}>No notifications received yet.</Text>
                    </View>
                  ) : (
                    notifications.map(notif => {
                      const formattedDate = notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : "";
                      return (
                        <View key={notif.id} style={[styles.card, { marginBottom: 12, borderLeftWidth: 4, borderLeftColor: "#1565c0", backgroundColor: "#e3f2fd" }]}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                            <Ionicons name="notifications" size={15} color="#1565c0" />
                            <Text style={{ fontWeight: "bold", color: "#1565c0", fontSize: 11 }}>SYSTEM BROADCAST</Text>
                          </View>
                          <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 13 }}>{notif.title}</Text>
                          <Text style={{ color: "#424242", fontSize: 12, marginTop: 2 }}>{notif.message}</Text>
                          <Text style={{ color: "#888", fontSize: 10, marginTop: 6 }}>
                            Sent: {formattedDate} | By: {notif.sentBy || "Admin"}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* Inline Notice Board / Announcements */}
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Notice Board & Announcements</Text>
                  {announcements.length === 0 ? (
                    <View style={[styles.card, { padding: 20, alignItems: "center" }]}>
                      <Ionicons name="notifications-off-outline" size={32} color="#757575" />
                      <Text style={[styles.emptyText, { marginTop: 8 }]}>No notices published yet.</Text>
                    </View>
                  ) : (
                    announcements.map(notice => {
                      const formattedDate = notice.publishedAt ? new Date(notice.publishedAt).toLocaleDateString() : (notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : "");
                      return (
                        <View key={notice.id} style={[styles.card, { marginBottom: 12 }, notice.priority === "high" && { borderLeftWidth: 5, borderLeftColor: "#c62828" }]}>
                          <Text style={styles.noticeTitle}>{notice.title}</Text>
                          <Text style={styles.noticeContent}>{notice.content}</Text>
                          <Text style={styles.noticeMeta}>
                            Priority: {notice.priority.toUpperCase()} | Published: {formattedDate} | By: {notice.createdBy || "Admin"}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
          </ScrollView>
        )}

        {/* ================== 2. TEST PORTAL ================== */}
        {activeTab === "test" && (
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 80 }}>
            {/* Collapsible Tabs Selector */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#ffffff", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e0e0e0", marginBottom: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: "bold", color: "#c62828" }}>
                Menu: {testSub === "available" ? "Available Exams" : testSub === "pdf-create" ? "AI Create" : testSub === "create" ? "Manual" : "Results Log"}
              </Text>
              <TouchableOpacity onPress={() => setTestTabsCollapsed(!testTabsCollapsed)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 11, color: "#757575" }}>{testTabsCollapsed ? "Expand Menu" : "Collapse Menu"}</Text>
                <Ionicons name={testTabsCollapsed ? "chevron-down" : "chevron-up"} size={16} color="#757575" />
              </TouchableOpacity>
            </View>

            {!testTabsCollapsed && (
              <View style={styles.rectBar}>
                <TouchableOpacity onPress={() => setTestSub("available")} style={[styles.rectTab, testSub === "available" && styles.rectTabActive]}>
                  <Text style={[styles.rectTabTxt, testSub === "available" && styles.rectTabTxtActive]}>Available Exams</Text>
                </TouchableOpacity>
                {(user.role === "admin" || user.role === "staff") && (
                  <>
                    <TouchableOpacity onPress={() => setTestSub("pdf-create")} style={[styles.rectTab, testSub === "pdf-create" && styles.rectTabActive]}>
                      <Text style={[styles.rectTabTxt, testSub === "pdf-create" && styles.rectTabTxtActive]}>AI Create</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setTestSub("create")} style={[styles.rectTab, testSub === "create" && styles.rectTabActive]}>
                      <Text style={[styles.rectTabTxt, testSub === "create" && styles.rectTabTxtActive]}>Manual</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity onPress={() => setTestSub("results")} style={[styles.rectTab, testSub === "results" && styles.rectTabActive]}>
                  <Text style={[styles.rectTabTxt, testSub === "results" && styles.rectTabTxtActive]}>Results Log</Text>
                </TouchableOpacity>
              </View>
            )}

            {testSub === "available" && (
              <View style={{ gap: 12 }}>
                {tests.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={40} color="#757575" />
                    <Text style={styles.emptyText}>No mock tests available.</Text>
                  </View>
                ) : (
                  tests.map(t => {
                    const statusInfo = getTestStatusForStudent(t);
                    const isAdmin = user.role === "admin" || user.role === "staff";
                    
                    return (
                      <View key={t.id} style={styles.card}>
                        <Text style={styles.noticeTitle}>{t.title}</Text>
                        <Text style={styles.noticeContent}>{t.description}</Text>
                        
                        <View style={{ marginTop: 6, gap: 2, marginBottom: 6 }}>
                          {t.startTime && (
                            <Text style={{ fontSize: 11, color: "#757575" }}>
                              📅 Starts: {new Date(t.startTime).toLocaleString()}
                            </Text>
                          )}
                          {t.endTime && (
                            <Text style={{ fontSize: 11, color: "#757575" }}>
                              🏁 Ends: {new Date(t.endTime).toLocaleString()}
                            </Text>
                          )}
                        </View>

                        <Text style={styles.noticeMeta}>Duration: {t.durationMinutes} Mins | Passing: {t.passingMarks}</Text>
                        
                        {isAdmin ? (
                          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                            <TouchableOpacity onPress={() => monitorTest(t.id)} style={[styles.primaryBtn, { flex: 1 }]}>
                              <Text style={styles.primaryBtnTxt}>Monitor Live & Leaderboard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => {
                                Alert.alert("Delete Test", "Are you sure you want to delete this test?", [
                                  { text: "Cancel", style: "cancel" },
                                  { text: "Delete", style: "destructive", onPress: async () => {
                                    try {
                                      await api.delete(`/test-portal/test-creation/${t.id}`);
                                      Alert.alert("Success", "Test deleted successfully.");
                                      loadTests();
                                    } catch (e: any) {
                                      Alert.alert("Error", e.message || "Failed to delete test.");
                                    }
                                  }}
                                ]);
                              }}
                              style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: "#ffebee", justifyContent: "center", alignItems: "center" }}
                            >
                              <Ionicons name="trash-outline" size={20} color="#c62828" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity 
                            disabled={statusInfo.disabled} 
                            onPress={() => startExam(t)} 
                            style={[styles.primaryBtn, { marginTop: 10 }, statusInfo.disabled && { backgroundColor: "#bdbdbd" }]}
                          >
                            <Text style={styles.primaryBtnTxt}>{statusInfo.label}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {testSub === "create" && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Define New Mock Test</Text>
                <TextInput style={styles.input} placeholder="Test Title" placeholderTextColor="#999" value={newTest.title} onChangeText={t => setNewTest({ ...newTest, title: t })} />
                <TextInput style={styles.input} placeholder="Test Description" placeholderTextColor="#999" value={newTest.description} onChangeText={d => setNewTest({ ...newTest, description: d })} />
                <TextInput style={styles.input} placeholder="Duration (Minutes)" placeholderTextColor="#999" keyboardType="numeric" value={newTest.duration} onChangeText={du => setNewTest({ ...newTest, duration: du })} />
                <TextInput style={styles.input} placeholder="Passing Marks" placeholderTextColor="#999" keyboardType="numeric" value={newTest.passingMarks} onChangeText={p => setNewTest({ ...newTest, passingMarks: p })} />
                
                <DateTimePickerSelect
                  label="Scheduled Start Time (Mandatory):"
                  value={newTest.startTime}
                  onChange={t => setNewTest({ ...newTest, startTime: t })}
                  darkMode={darkMode}
                />

                <DateTimePickerSelect
                  label="Scheduled End Time (Mandatory):"
                  value={newTest.endTime}
                  onChange={t => setNewTest({ ...newTest, endTime: t })}
                  darkMode={darkMode}
                />

                <Text style={styles.label}>Select Number of Questions:</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="Number of Questions (e.g. 5)" 
                  placeholderTextColor="#999" 
                  keyboardType="numeric" 
                  value={manualNumQuestions} 
                  onChangeText={setManualNumQuestions} 
                />

                {Platform.OS === "web" && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={styles.label}>Upload Questions JSON File:</Text>
                    <input
                      type="file"
                      accept=".json"
                      style={{
                        padding: "8px",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        width: "100%",
                        boxSizing: "border-box"
                      }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const text = event.target?.result as string;
                              const parsed = JSON.parse(text);
                              setManualQuestionsJson(JSON.stringify(parsed, null, 2));
                              if (Array.isArray(parsed)) {
                                setManualNumQuestions(parsed.length.toString());
                              }
                              Alert.alert("Success", "JSON file loaded successfully!");
                            } catch (err: any) {
                              Alert.alert("Error", "Invalid JSON: " + err.message);
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </View>
                )}

                <Text style={styles.label}>Paste Questions JSON Array:</Text>
                <TextInput
                  style={[styles.input, { height: 150, textAlignVertical: "top", fontFamily: "monospace", fontSize: 11 }]}
                  placeholder={`[\n  {\n    "question": "Question text...",\n    "option a": "Choice 1",\n    "option b": "Choice 2",\n    "option c": "Choice 3",\n    "option d": "Choice 4",\n    "correct option": "B",\n    "explanation": "Why B is correct..."\n  }\n]`}
                  placeholderTextColor="#999"
                  multiline
                  value={manualQuestionsJson}
                  onChangeText={setManualQuestionsJson}
                />
                <TouchableOpacity onPress={saveTestDefinition} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnTxt}>Create Test Definition</Text>
                </TouchableOpacity>
              </View>
            )}

            {testSub === "pdf-create" && (user.role === "admin" || user.role === "staff") && (
              <View style={{ gap: 15 }}>
                <View style={[styles.card, darkMode && styles.cardDark]}>
                  <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>AI Question Paper Generator</Text>
                  <Text style={{ color: darkMode ? "#9e9e9e" : "#555", fontSize: 12, marginBottom: 12 }}>
                    Generate full mock tests with bilingual English & Tamil questions in seconds. Select your input mode below.
                  </Text>
                  
                  {/* Segmented Control for Selection Mode */}
                  <View style={{ flexDirection: "row", marginBottom: 15, borderRadius: 8, backgroundColor: darkMode ? "#222" : "#eee", padding: 4 }}>
                    <TouchableOpacity
                      onPress={() => setGenMode("file")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: genMode === "file" ? (darkMode ? "#333" : "#fff") : "transparent",
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ fontWeight: "bold", color: genMode === "file" ? "#c62828" : (darkMode ? "#aaa" : "#555"), fontSize: 13 }}>Word File Upload</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setGenMode("text")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: genMode === "text" ? (darkMode ? "#333" : "#fff") : "transparent",
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ fontWeight: "bold", color: genMode === "text" ? "#c62828" : (darkMode ? "#aaa" : "#555"), fontSize: 13 }}>Copy-Paste Text</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Test Title:</Text>
                  <TextInput 
                    style={[styles.input, darkMode && styles.inputDark]} 
                    placeholder="e.g. UPSC Prelims Mock 2026" 
                    placeholderTextColor="#999" 
                    value={newPdfTest.title} 
                    onChangeText={v => setNewPdfTest({ ...newPdfTest, title: v })} 
                  />

                  <Text style={[styles.label, darkMode && styles.labelDark]}>Extraction Mode:</Text>
                  <View style={{ flexDirection: "row", marginBottom: 15, borderRadius: 8, backgroundColor: darkMode ? "#222" : "#eee", padding: 4 }}>
                    <TouchableOpacity
                      onPress={() => setExtractMode("auto")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: extractMode === "auto" ? (darkMode ? "#333" : "#fff") : "transparent",
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ fontWeight: "bold", color: extractMode === "auto" ? "#c62828" : (darkMode ? "#aaa" : "#555"), fontSize: 11 }}>Auto (Recommended)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setExtractMode("local")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: extractMode === "local" ? (darkMode ? "#333" : "#fff") : "transparent",
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ fontWeight: "bold", color: extractMode === "local" ? "#c62828" : (darkMode ? "#aaa" : "#555"), fontSize: 11 }}>Local-Only (Free)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setExtractMode("ai")}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 6,
                        backgroundColor: extractMode === "ai" ? (darkMode ? "#333" : "#fff") : "transparent",
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ fontWeight: "bold", color: extractMode === "ai" ? "#c62828" : (darkMode ? "#aaa" : "#555"), fontSize: 11 }}>AI-Only (Groq)</Text>
                    </TouchableOpacity>
                  </View>

                  {Platform.OS === "web" && (
                    <>
                      <input
                        id="qp-pdf-input"
                        type="file"
                        accept=".docx,.doc"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPdfFilename(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const dataUrl = event.target?.result as string;
                                const base64 = dataUrl.split(",")[1];
                                setPdfBase64(base64);
                                Alert.alert("Success", `Question Paper "${file.name}" loaded successfully!`);
                              } catch (err: any) {
                                Alert.alert("Error", "Failed to process Question Paper: " + err.message);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <input
                        id="ak-pdf-input"
                        type="file"
                        accept=".docx,.doc,.csv"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setAkFilename(file.name);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              try {
                                const dataUrl = event.target?.result as string;
                                const base64 = dataUrl.split(",")[1];
                                setAkBase64(base64);
                                Alert.alert("Success", `Answer Key "${file.name}" loaded successfully!`);
                              } catch (err: any) {
                                Alert.alert("Error", "Failed to process Answer Key: " + err.message);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </>
                  )}

                  {genMode === "file" ? (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={[styles.label, darkMode && styles.labelDark]}>Upload Question Paper Word File (.docx):</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (Platform.OS === "web") {
                            document.getElementById("qp-pdf-input")?.click();
                          } else {
                            pickWordDocument("qp");
                          }
                        }}
                        style={{
                          borderWidth: 2,
                          borderStyle: "dashed",
                          borderColor: "#c62828",
                          backgroundColor: darkMode ? "#2a1e1e" : "#fff8f8",
                          borderRadius: 12,
                          padding: 20,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          marginBottom: 15
                        }}
                      >
                        <Ionicons name="document-text-outline" size={32} color="#c62828" />
                        <Text style={{ fontWeight: "bold", color: "#c62828", fontSize: 13 }}>
                          {pdfFilename ? "Replace Question Paper Word File" : "Choose Question Paper Word File"}
                        </Text>
                        <Text style={{ fontSize: 11, color: darkMode ? "#9e9e9e" : "#757575", textAlign: "center" }}>
                          {pdfFilename ? `✓ Selected: ${pdfFilename}` : "Extracts bilingual English & Tamil questions automatically"}
                        </Text>
                      </TouchableOpacity>

                      <Text style={[styles.label, darkMode && styles.labelDark]}>Upload Answer Key File (.docx or .csv) (Optional):</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (Platform.OS === "web") {
                            document.getElementById("ak-pdf-input")?.click();
                          } else {
                            pickWordDocument("ak");
                          }
                        }}
                        style={{
                          borderWidth: 2,
                          borderStyle: "dashed",
                          borderColor: "#2e7d32",
                          backgroundColor: darkMode ? "#1e2a1e" : "#f4f9f4",
                          borderRadius: 12,
                          padding: 20,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          marginBottom: 15
                        }}
                      >
                        <Ionicons name="key-outline" size={32} color="#2e7d32" />
                        <Text style={{ fontWeight: "bold", color: "#2e7d32", fontSize: 13 }}>
                          {akFilename ? "Replace Answer Key File (.docx or .csv)" : "Choose Answer Key File (.docx or .csv) (Optional)"}
                        </Text>
                        <Text style={{ fontSize: 11, color: darkMode ? "#9e9e9e" : "#757575", textAlign: "center" }}>
                          {akFilename ? `✓ Selected: ${akFilename}` : "Extracts correct choices (A, B, C, D) automatically"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ marginBottom: 10 }}>
                      <Text style={[styles.label, darkMode && styles.labelDark]}>Paste Question Paper Text (Any number of lines):</Text>
                      <TextInput
                        style={[styles.input, darkMode && styles.inputDark, { minHeight: 220, maxHeight: 400, textAlignVertical: "top", padding: 12 }]}
                        placeholder="Paste question paper content here (no limit on number of lines)..."
                        placeholderTextColor="#999"
                        multiline
                        scrollEnabled={true}
                        value={pdfExtractText}
                        onChangeText={setPdfExtractText}
                      />

                      <Text style={[styles.label, darkMode && styles.labelDark]}>Upload Answer Key File (.docx or .csv) (Optional):</Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (Platform.OS === "web") {
                            document.getElementById("ak-pdf-input")?.click();
                          } else {
                            pickWordDocument("ak");
                          }
                        }}
                        style={{
                          borderWidth: 2,
                          borderStyle: "dashed",
                          borderColor: "#2e7d32",
                          backgroundColor: darkMode ? "#1e2a1e" : "#f4f9f4",
                          borderRadius: 12,
                          padding: 20,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          marginBottom: 15
                        }}
                      >
                        <Ionicons name="key-outline" size={32} color="#2e7d32" />
                        <Text style={{ fontWeight: "bold", color: "#2e7d32", fontSize: 13 }}>
                          {akFilename ? "Replace Answer Key File (.docx or .csv)" : "Choose Answer Key File (.docx or .csv) (Optional)"}
                        </Text>
                        <Text style={{ fontSize: 11, color: darkMode ? "#9e9e9e" : "#757575", textAlign: "center" }}>
                          {akFilename ? `✓ Selected: ${akFilename}` : "Extracts correct choices (A, B, C, D) automatically"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Schedule Fields - visible before extraction */}
                  <View style={{ backgroundColor: darkMode ? "#1a1a1a" : "#f5f5f5", padding: 12, borderRadius: 10, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: "#1565c0" }}>
                    <Text style={{ fontWeight: "bold", color: darkMode ? "#90caf9" : "#1565c0", fontSize: 12, marginBottom: 8 }}>📅 SCHEDULE TEST (Mandatory)</Text>
                    <DateTimePickerSelect
                      label="Start Date & Time:"
                      value={newPdfTest.startTime}
                      onChange={t => setNewPdfTest({ ...newPdfTest, startTime: t })}
                      darkMode={darkMode}
                    />
                    <DateTimePickerSelect
                      label="End Date & Time:"
                      value={newPdfTest.endTime}
                      onChange={t => setNewPdfTest({ ...newPdfTest, endTime: t })}
                      darkMode={darkMode}
                    />
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity onPress={extractQuestionsFromText} disabled={isExtracting} style={[styles.primaryBtn, { flex: 1 }, isExtracting && { opacity: 0.6 }]}>
                      <Text style={styles.primaryBtnTxt}>
                        {isExtracting
                          ? "Extracting Questions..."
                          : extractMode === "local"
                          ? "Extract Questions (Local Regex)"
                          : extractMode === "ai"
                          ? "Extract Questions (Groq AI)"
                          : "Extract Questions (Auto Mode)"}
                      </Text>
                    </TouchableOpacity>
                    {isExtracting && (
                      <TouchableOpacity onPress={cancelExtraction} style={[styles.primaryBtn, { backgroundColor: "#c62828", minWidth: 80 }]}>
                        <Ionicons name="close-circle-outline" size={16} color="#fff" />
                        <Text style={[styles.primaryBtnTxt, { marginLeft: 4 }]}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {extractedQuestions.length > 0 && (
                  <View style={[styles.card, darkMode && styles.cardDark]}>
                    <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>Extracted Questions Workspace</Text>
                    
                    {/* Settings Panel */}
                    <View style={{ backgroundColor: darkMode ? "#222" : "#f9f9f9", padding: 15, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: "#2e7d32" }}>
                      <Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121", marginBottom: 10 }}>Test Settings (Marking Scheme)</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                        <View style={{ flex: 1, minWidth: 100 }}>
                          <Text style={[styles.label, darkMode && styles.labelDark]}>Correct Answer Marks:</Text>
                          <TextInput
                            style={[styles.input, darkMode && styles.inputDark]}
                            placeholder="+1"
                            placeholderTextColor="#999"
                            value={newPdfTest.marksPerQ}
                            onChangeText={v => {
                              let clean = v.replace(/[+]/g, "");
                              let formatted = clean;
                              const parseFloatVal = parseFloat(clean);
                              if (!isNaN(parseFloatVal) && parseFloatVal > 0) {
                                formatted = "+" + clean;
                              } else if (clean === "0") {
                                formatted = "0";
                              }
                              setNewPdfTest({ ...newPdfTest, marksPerQ: formatted });
                            }}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 100 }}>
                          <Text style={[styles.label, darkMode && styles.labelDark]}>Wrong Answer Marks:</Text>
                          <TextInput
                            style={[styles.input, darkMode && styles.inputDark]}
                            placeholder="-0.33"
                            placeholderTextColor="#999"
                            value={newPdfTest.negMarks}
                            onChangeText={v => {
                              let clean = v.replace(/[+]/g, "");
                              let formatted = clean;
                              const parseFloatVal = parseFloat(clean);
                              if (!isNaN(parseFloatVal) && parseFloatVal > 0) {
                                formatted = "+" + clean;
                              } else if (parseFloatVal < 0) {
                                formatted = clean;
                              } else if (clean === "0") {
                                formatted = "0";
                              } else if (clean && !clean.startsWith("-")) {
                                formatted = "-" + clean;
                              }
                              setNewPdfTest({ ...newPdfTest, negMarks: formatted });
                            }}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 100 }}>
                          <Text style={[styles.label, darkMode && styles.labelDark]}>Unattended Marks:</Text>
                          <TextInput
                            style={[styles.input, darkMode && styles.inputDark]}
                            placeholder="0"
                            placeholderTextColor="#999"
                            value={newPdfTest.unattendedMarks || "0"}
                            onChangeText={v => {
                              let clean = v.replace(/[+]/g, "");
                              let formatted = clean;
                              const parseFloatVal = parseFloat(clean);
                              if (clean === "0") {
                                formatted = "0";
                              } else if (!isNaN(parseFloatVal) && parseFloatVal > 0) {
                                formatted = "+" + clean;
                              }
                              setNewPdfTest({ ...newPdfTest, unattendedMarks: formatted });
                            }}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Question List */}
                    <Text style={{ fontWeight: "bold", fontSize: 13, color: darkMode ? "#ef9a9a" : "#c62828", marginBottom: 10 }}>
                      Questions List ({extractedQuestions.length} extracted):
                    </Text>

                    {/* Inline Question Editor */}
                    {editingQIdx !== null && editingQData !== null && (
                      <View style={{ backgroundColor: darkMode ? "#1a2a1a" : "#f1f8e9", borderWidth: 1, borderColor: "#2e7d32", borderRadius: 12, padding: 15, marginBottom: 15 }}>
                        <Text style={{ fontWeight: "bold", color: "#2e7d32", marginBottom: 10, fontSize: 13 }}>
                          Editing Question #{editingQIdx + 1}
                        </Text>
                        
                        <Text style={[styles.label, darkMode && styles.labelDark]}>English Question Text:</Text>
                        <TextInput
                          style={[styles.input, darkMode && styles.inputDark, { height: 60 }]}
                          multiline
                          value={editingQData.questionEn}
                          onChangeText={text => setEditingQData({ ...editingQData, questionEn: text })}
                        />

                        <Text style={[styles.label, darkMode && styles.labelDark]}>Tamil Question Text:</Text>
                        <TextInput
                          style={[styles.input, darkMode && styles.inputDark, { height: 60 }]}
                          multiline
                          value={editingQData.questionTa}
                          onChangeText={text => setEditingQData({ ...editingQData, questionTa: text })}
                        />

                        {["A", "B", "C", "D"].map(opt => (
                          <View key={opt} style={{ marginBottom: 10, borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingBottom: 8 }}>
                            <Text style={{ fontWeight: "bold", fontSize: 11, color: "#2e7d32" }}>Option {opt}:</Text>
                            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                              <TextInput
                                style={[styles.input, darkMode && styles.inputDark, { flex: 1, marginBottom: 0, fontSize: 12 }]}
                                placeholder={`English Option ${opt}`}
                                value={editingQData.options?.[opt]?.en || ""}
                                onChangeText={text => {
                                  const updatedOptions = { ...editingQData.options };
                                  updatedOptions[opt] = { ...updatedOptions[opt], en: text };
                                  setEditingQData({ ...editingQData, options: updatedOptions });
                                }}
                              />
                              <TextInput
                                style={[styles.input, darkMode && styles.inputDark, { flex: 1, marginBottom: 0, fontSize: 12 }]}
                                placeholder={`Tamil Option ${opt}`}
                                value={editingQData.options?.[opt]?.ta || ""}
                                onChangeText={text => {
                                  const updatedOptions = { ...editingQData.options };
                                  updatedOptions[opt] = { ...updatedOptions[opt], ta: text };
                                  setEditingQData({ ...editingQData, options: updatedOptions });
                                }}
                              />
                            </View>
                          </View>
                        ))}

                        <Text style={[styles.label, darkMode && styles.labelDark]}>Correct Answer:</Text>
                        <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
                          {["A", "B", "C", "D"].map(opt => (
                            <TouchableOpacity
                              key={opt}
                              onPress={() => setEditingQData({ ...editingQData, correctAnswer: opt })}
                              style={[
                                styles.roleBtn,
                                editingQData.correctAnswer === opt && { backgroundColor: "#2e7d32", borderColor: "#2e7d32" }
                              ]}
                            >
                              <Text style={[
                                styles.roleBtnTxt,
                                editingQData.correctAnswer === opt && { color: "#ffffff" }
                              ]}>
                                Option {opt}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <TouchableOpacity 
                            onPress={() => { setEditingQIdx(null); setEditingQData(null); }} 
                            style={[styles.outlineBtn, { flex: 1, borderColor: "#757575" }]}
                          >
                            <Text style={[styles.outlineBtnTxt, { color: "#757575" }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => {
                              const updated = [...extractedQuestions];
                              updated[editingQIdx] = editingQData;
                              setExtractedQuestions(updated);
                              setEditingQIdx(null);
                              setEditingQData(null);
                              Alert.alert("Updated", "Question updated in list successfully.");
                            }} 
                            style={[styles.primaryBtn, { flex: 1, backgroundColor: "#2e7d32" }]}
                          >
                            <Text style={styles.primaryBtnTxt}>Save Changes</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* List of Questions */}
                    <ScrollView style={{ maxHeight: 500 }} nestedScrollEnabled>
                      {extractedQuestions.map((q: any, idx: number) => {
                        const isCorrect = (opt: string) => q.correctAnswer === opt;
                        return (
                          <View 
                            key={idx} 
                            style={{ 
                              padding: 12, 
                              backgroundColor: darkMode ? "#1e1e1e" : "#fdfdfd", 
                              borderWidth: 1, 
                              borderColor: darkMode ? "#333" : "#e0e0e0", 
                              borderRadius: 12, 
                              marginBottom: 10, 
                              borderLeftWidth: 4, 
                              borderLeftColor: isExtracting ? "#aaa" : "#c62828" 
                            }}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <View style={{ backgroundColor: "#c62828", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                                <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 10 }}>Q{q.questionNo || idx + 1}</Text>
                              </View>
                              
                              <View style={{ flexDirection: "row", gap: 8 }}>
                                <TouchableOpacity 
                                  onPress={() => {
                                    setEditingQIdx(idx);
                                    setEditingQData(JSON.parse(JSON.stringify(q)));
                                  }}
                                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#1976d2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 }}
                                >
                                  <Ionicons name="create-outline" size={14} color="#ffffff" />
                                  <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "bold" }}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  onPress={() => {
                                    Alert.alert(
                                      "Delete Question",
                                      `Are you sure you want to delete Question #${idx + 1}?`,
                                      [
                                        { text: "Cancel", style: "cancel" },
                                        { 
                                          text: "Delete", 
                                          style: "destructive", 
                                          onPress: () => {
                                            const updated = extractedQuestions.filter((_, i) => i !== idx);
                                            const reindexed = updated.map((item, i) => ({ ...item, questionNo: i + 1 }));
                                            setExtractedQuestions(reindexed);
                                          } 
                                        }
                                      ]
                                    );
                                  }}
                                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#c62828", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 }}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#ffffff" />
                                  <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "bold" }}>Delete</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            <Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121", fontSize: 12 }}>{q.questionEn || q.question}</Text>
                            {q.questionTa && <Text style={{ color: darkMode ? "#aaa" : "#555", fontSize: 11, marginTop: 2, fontStyle: "italic" }}>{q.questionTa}</Text>}
                            
                            {/* Options */}
                            <View style={{ marginTop: 8, gap: 4 }}>
                              {["A", "B", "C", "D"].map(opt => {
                                const optionData = q.options?.[opt];
                                const hasEn = !!optionData?.en;
                                const hasTa = !!optionData?.ta;
                                if (!hasEn && !hasTa) return null;
                                return (
                                  <View 
                                    key={opt} 
                                    style={{ 
                                      flexDirection: "row", 
                                      padding: 6, 
                                      borderRadius: 6, 
                                      borderWidth: 1, 
                                      borderColor: isCorrect(opt) ? "#2e7d32" : (darkMode ? "#333" : "#f0f0f0"), 
                                      backgroundColor: isCorrect(opt) ? (darkMode ? "#1b2e1b" : "#e8f5e9") : (darkMode ? "#121212" : "#fafafa") 
                                    }}
                                  >
                                    <Text style={{ fontWeight: "bold", fontSize: 11, color: isCorrect(opt) ? "#2e7d32" : (darkMode ? "#9e9e9e" : "#555"), marginRight: 6 }}>{opt}.</Text>
                                    <View style={{ flex: 1 }}>
                                      {hasEn && <Text style={{ fontSize: 11, color: darkMode ? "#fff" : "#212121", fontWeight: isCorrect(opt) ? "bold" : "normal" }}>{optionData.en}</Text>}
                                      {hasTa && <Text style={{ fontSize: 10, color: darkMode ? "#aaa" : "#666", fontStyle: "italic" }}>{optionData.ta}</Text>}
                                    </View>
                                    {isCorrect(opt) && <Ionicons name="checkmark-circle" size={14} color="#2e7d32" style={{ marginLeft: 4 }} />}
                                  </View>
                                );
                              })}
                            </View>

                            {/* Quick Answer Changer */}
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, borderTopWidth: 0.5, borderTopColor: darkMode ? "#333" : "#eee", paddingTop: 8 }}>
                              <Text style={{ fontSize: 10, color: darkMode ? "#9e9e9e" : "#757575", fontWeight: "bold" }}>Correct Ans:</Text>
                              <View style={{ flexDirection: "row", gap: 4 }}>
                                {["A", "B", "C", "D"].map(opt => (
                                  <TouchableOpacity
                                    key={opt}
                                    onPress={() => {
                                      const updated = [...extractedQuestions];
                                      updated[idx] = { ...updated[idx], correctAnswer: opt };
                                      setExtractedQuestions(updated);
                                    }}
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: 12,
                                      backgroundColor: isCorrect(opt) ? "#2e7d32" : (darkMode ? "#333" : "#e0e0e0"),
                                      alignItems: "center",
                                      justifyContent: "center"
                                    }}
                                  >
                                    <Text style={{ fontSize: 10, fontWeight: "bold", color: isCorrect(opt) ? "#ffffff" : (darkMode ? "#9e9e9e" : "#424242") }}>{opt}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>

                    <TouchableOpacity onPress={createTestFromExtraction} style={[styles.primaryBtn, { marginTop: 15, backgroundColor: "#2e7d32" }]}>
                      <Text style={styles.primaryBtnTxt}>Create Test Paper ({extractedQuestions.length} Questions)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}


            {testSub === "results" && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Evaluated Submissions</Text>
                <View style={styles.tableRow}>
                  <Text style={[styles.th, { flex: 2 }]}>Exam Title</Text>
                  <Text style={styles.th}>Score</Text>
                  <Text style={styles.th}>Result</Text>
                </View>
                <View style={styles.tableRow}>
                  <Text style={{ flex: 2, color: "#212121" }}>Polity Mock Assessment</Text>
                  <Text style={{ color: "#212121" }}>3 / 3</Text>
                  <Text style={{ color: "#2e7d32", fontWeight: "bold" }}>PASSED</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* ================== 3. ERP SYSTEM (Sidebar Layout) ================== */}
        {activeTab === "erp" && (
          <View style={styles.splitLayout}>
            {/* Sidebar on the left */}
            {!erpSidebarCollapsed && (
              <View style={[styles.sidebar, darkMode && styles.sidebarDark]}>

                {/* ADMIN / STAFF ONLY TABS */}
                {(user.role === "admin" || user.role === "staff") && (
                  <>
                    <TouchableOpacity onPress={() => setErpSub("students")} style={[styles.sidebarTab, erpSub === "students" && styles.sidebarTabActive]}>
                      <Ionicons name="people-outline" size={20} color={erpSub === "students" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "students" && styles.sidebarTabTxtActive]}>Students</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setErpSub("staff")} style={[styles.sidebarTab, erpSub === "staff" && styles.sidebarTabActive]}>
                      <Ionicons name="briefcase-outline" size={20} color={erpSub === "staff" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "staff" && styles.sidebarTabTxtActive]}>Staff</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setErpSub("id-card")} style={[styles.sidebarTab, erpSub === "id-card" && styles.sidebarTabActive]}>
                      <Ionicons name="card-outline" size={20} color={erpSub === "id-card" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "id-card" && styles.sidebarTabTxtActive]}>ID Cards</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setErpSub("announcements")} style={[styles.sidebarTab, erpSub === "announcements" && styles.sidebarTabActive]}>
                      <Ionicons name="megaphone-outline" size={20} color={erpSub === "announcements" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "announcements" && styles.sidebarTabTxtActive]}>Notices</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setErpSub("analytics")} style={[styles.sidebarTab, erpSub === "analytics" && styles.sidebarTabActive]}>
                      <Ionicons name="analytics-outline" size={20} color={erpSub === "analytics" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "analytics" && styles.sidebarTabTxtActive]}>Analytics</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setErpSub("fees")} style={[styles.sidebarTab, erpSub === "fees" && styles.sidebarTabActive]}>
                      <Ionicons name="cash-outline" size={20} color={erpSub === "fees" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "fees" && styles.sidebarTabTxtActive]}>Fees</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setErpSub("marks"); if (tests.length > 0) { setSelectedErpTestId(tests[0].id); loadErpTestResults(tests[0].id); } }} style={[styles.sidebarTab, erpSub === "marks" && styles.sidebarTabActive]}>
                      <Ionicons name="checkbox-outline" size={20} color={erpSub === "marks" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "marks" && styles.sidebarTabTxtActive]}>Marks</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* STUDENT-ONLY TABS */}
                {user.role === "student" && (
                  <>
                    <TouchableOpacity onPress={() => setErpSub("analytics")} style={[styles.sidebarTab, erpSub === "analytics" && styles.sidebarTabActive]}>
                      <Ionicons name="analytics-outline" size={20} color={erpSub === "analytics" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "analytics" && styles.sidebarTabTxtActive]}>My Analytics</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setErpSub("marks"); if (tests.length > 0) { setSelectedErpTestId(tests[0].id); loadErpTestResults(tests[0].id); } }} style={[styles.sidebarTab, erpSub === "marks" && styles.sidebarTabActive]}>
                      <Ionicons name="checkbox-outline" size={20} color={erpSub === "marks" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "marks" && styles.sidebarTabTxtActive]}>My Marks</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setErpSub("fees")} style={[styles.sidebarTab, erpSub === "fees" && styles.sidebarTabActive]}>
                      <Ionicons name="cash-outline" size={20} color={erpSub === "fees" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "fees" && styles.sidebarTabTxtActive]}>My Fees</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setErpSub("id-card")} style={[styles.sidebarTab, erpSub === "id-card" && styles.sidebarTabActive]}>
                      <Ionicons name="card-outline" size={20} color={erpSub === "id-card" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "id-card" && styles.sidebarTabTxtActive]}>My ID Card</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setErpSub("my-profile")} style={[styles.sidebarTab, erpSub === "my-profile" && styles.sidebarTabActive]}>
                      <Ionicons name="person-outline" size={20} color={erpSub === "my-profile" ? "#c62828" : "#757575"} />
                      <Text style={[styles.sidebarTabTxt, erpSub === "my-profile" && styles.sidebarTabTxtActive]}>My Profile</Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Collapse Button */}
                <TouchableOpacity 
                  onPress={() => setErpSidebarCollapsed(true)} 
                  style={{ marginTop: "auto", paddingVertical: 10, width: "100%", alignItems: "center" }}
                >
                  <Ionicons name="arrow-back-circle-outline" size={24} color="#c62828" />
                  <Text style={{ fontSize: 9, color: "#c62828", fontWeight: "bold", marginTop: 2 }}>Hide Menu</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Subpage Content on the right */}
            <View style={{ flex: 1, position: "relative" }}>
              {erpSidebarCollapsed && (
                <TouchableOpacity 
                  onPress={() => setErpSidebarCollapsed(false)} 
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 10,
                    zIndex: 1000,
                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: "#e0e0e0",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2.5,
                    elevation: 4
                  }}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={20} color="#c62828" />
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: "#c62828" }}>Show Menu</Text>
                </TouchableOpacity>
              )}
              <ScrollView style={[styles.splitContent, erpSidebarCollapsed && { paddingTop: 50 }]} contentContainerStyle={{ paddingBottom: 80 }}>
              {erpSub === "students" && (user.role === "admin" || user.role === "staff") && (
                <View style={{ gap: 15 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <Text style={styles.sectionTitle}>Student Management Portal</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        if (showStudentForm) {
                          setEditingStudent(null);
                          setShowStudentForm(false);
                        } else {
                          setShowStudentForm(true);
                        }
                      }} 
                      style={[styles.primaryBtn, { minWidth: 150, marginVertical: 0, height: 36, paddingVertical: 0, justifyContent: "center" }]}
                    >
                      <Text style={[styles.primaryBtnTxt, { fontSize: 13 }]}>
                        {showStudentForm ? "Close Form" : "➕ Create New Student"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showStudentForm && (
                    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: editingStudent ? "#0288d1" : "#c62828" }]}>
                      <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>{editingStudent ? "✏️ Edit Student Profile" : "Register New Student Profile"}</Text>
                      {editingStudent ? (
                        <>
                          <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#999" value={editingStudent.firstName} onChangeText={f => setEditingStudent({ ...editingStudent, firstName: f })} />
                          <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#999" value={editingStudent.lastName} onChangeText={l => setEditingStudent({ ...editingStudent, lastName: l })} />
                          <TextInput style={styles.input} placeholder="Admission Number" placeholderTextColor="#999" value={editingStudent.admissionNumber} onChangeText={ad => setEditingStudent({ ...editingStudent, admissionNumber: ad })} />
                          <TextInput style={styles.input} placeholder="Roll Number" placeholderTextColor="#999" value={editingStudent.rollNumber} onChangeText={r => setEditingStudent({ ...editingStudent, rollNumber: r })} />
                          <TextInput style={styles.input} placeholder="Batch" placeholderTextColor="#999" value={editingStudent.batch} onChangeText={b => setEditingStudent({ ...editingStudent, batch: b })} />
                          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={editingStudent.email} onChangeText={e => setEditingStudent({ ...editingStudent, email: e })} keyboardType="email-address" />
                          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#999" value={editingStudent.phone} onChangeText={p => setEditingStudent({ ...editingStudent, phone: p })} keyboardType="phone-pad" />
                          <TextInput style={styles.input} placeholder="Login Username" placeholderTextColor="#999" value={editingStudent.loginUsername} onChangeText={u => setEditingStudent({ ...editingStudent, loginUsername: u })} />
                          <TextInput style={styles.input} placeholder="Login Password (leave empty to keep current)" secureTextEntry placeholderTextColor="#999" value={editingStudent.loginPassword || ""} onChangeText={pw => setEditingStudent({ ...editingStudent, loginPassword: pw })} />
                          
                          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                            <TouchableOpacity onPress={updateStudentRecord} style={[styles.primaryBtn, { flex: 1, backgroundColor: "#0288d1", justifyContent: "center" }]}>
                              <Text style={styles.primaryBtnTxt}>Update Record</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setEditingStudent(null); setShowStudentForm(false); }} style={[styles.outlineBtn, { flex: 1, justifyContent: "center" }]}>
                              <Text style={styles.outlineBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <>
                          <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#999" value={newStudent.firstName} onChangeText={f => setNewStudent({ ...newStudent, firstName: f })} />
                          <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#999" value={newStudent.lastName} onChangeText={l => setNewStudent({ ...newStudent, lastName: l })} />
                          <TextInput style={styles.input} placeholder="Admission Number" placeholderTextColor="#999" value={newStudent.admissionNumber} onChangeText={ad => setNewStudent({ ...newStudent, admissionNumber: ad })} />
                          <TextInput style={styles.input} placeholder="Roll Number" placeholderTextColor="#999" value={newStudent.rollNumber} onChangeText={r => setNewStudent({ ...newStudent, rollNumber: r })} />
                          <TextInput style={styles.input} placeholder="Batch" placeholderTextColor="#999" value={newStudent.batch} onChangeText={b => setNewStudent({ ...newStudent, batch: b })} />
                          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={newStudent.email} onChangeText={e => setNewStudent({ ...newStudent, email: e })} keyboardType="email-address" />
                          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#999" value={newStudent.phone} onChangeText={p => setNewStudent({ ...newStudent, phone: p })} keyboardType="phone-pad" />
                          <TextInput style={styles.input} placeholder="Login Username *" placeholderTextColor="#999" value={newStudent.loginUsername} onChangeText={u => setNewStudent({ ...newStudent, loginUsername: u })} />
                          <TextInput style={styles.input} placeholder="Login Password *" secureTextEntry placeholderTextColor="#999" value={newStudent.loginPassword} onChangeText={pw => setNewStudent({ ...newStudent, loginPassword: pw })} />
                          
                          <TouchableOpacity onPress={createStudentRecord} style={styles.primaryBtn}>
                            <Text style={styles.primaryBtnTxt}>Save Student Record</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}

                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Registered Student Directory ({students.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View style={{ minWidth: 600 }}>
                        <View style={[styles.tableRow, { backgroundColor: "#f5f5f5", paddingVertical: 8, paddingHorizontal: 12 }]}>
                          <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Name</Text>
                          <Text style={[styles.th, { flex: 1.2, fontWeight: "bold" }]}>Roll / Batch</Text>
                          <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Contact</Text>
                          <Text style={[styles.th, { flex: 1, fontWeight: "bold", textAlign: "center" }]}>Actions</Text>
                        </View>
                        {students.length === 0 ? (
                          <Text style={[styles.emptyText, { padding: 15 }]}>No student records found.</Text>
                        ) : (
                          students.map((s, idx) => (
                            <View key={s.id} style={[styles.tableRow, { borderBottomWidth: 1, borderColor: "#eeeeee", paddingVertical: 10, paddingHorizontal: 12, backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa", alignItems: "center" }]}>
                              <Text style={{ flex: 1.5, color: "#212121", fontWeight: "600" }}>{s.firstName} {s.lastName}</Text>
                              <Text style={{ flex: 1.2, color: "#757575", fontSize: 12 }}>{s.rollNumber}{"\n"}{s.batch || "N/A"}</Text>
                              <Text style={{ flex: 1.5, color: "#757575", fontSize: 12 }}>{s.email}{"\n"}{s.phone}</Text>
                              <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                                <TouchableOpacity onPress={() => { setEditingStudent(s); setShowStudentForm(true); }} style={{ padding: 6, backgroundColor: "#0288d1", borderRadius: 4 }}>
                                  <Ionicons name="create-outline" size={16} color="#ffffff" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteStudentRecord(s.id)} style={{ padding: 6, backgroundColor: "#d32f2f", borderRadius: 4 }}>
                                  <Ionicons name="trash-outline" size={16} color="#ffffff" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              )}

              {erpSub === "announcements" && (user.role === "admin" || user.role === "staff") && (
                <View style={{ gap: 15 }}>
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Create New Announcement</Text>
                    <TextInput style={styles.input} placeholder="Notice Title" placeholderTextColor="#999" value={newNotice.title} onChangeText={t => setNewNotice({ ...newNotice, title: t })} />
                    <TextInput style={[styles.input, { height: 80 }]} placeholder="Notice Message Details" placeholderTextColor="#999" multiline value={newNotice.content} onChangeText={c => setNewNotice({ ...newNotice, content: c })} />
                    
                    <Text style={styles.label}>Select Priority:</Text>
                    <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
                      {["normal", "high"].map(p => (
                        <TouchableOpacity key={p} onPress={() => setNewNotice({ ...newNotice, priority: p })} style={[styles.roleBtn, newNotice.priority === p && styles.roleBtnActive]}>
                          <Text style={[styles.roleBtnTxt, newNotice.priority === p && styles.roleBtnTxtActive]}>{p.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity onPress={createNotice} style={styles.primaryBtn}>
                      <Text style={styles.primaryBtnTxt}>Publish Announcement</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Active Notice Registry ({announcements.length})</Text>
                    {announcements.length === 0 ? (
                      <Text style={styles.emptyText}>No notices published yet.</Text>
                    ) : (
                      announcements.map(notice => (
                        <View key={notice.id} style={{ borderBottomWidth: 1, borderColor: "#eeeeee", paddingVertical: 10 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                            <Text style={{ fontWeight: "bold", color: "#212121" }}>{notice.title}</Text>
                            <Text style={{ fontSize: 11, fontWeight: "bold", color: notice.priority === "high" ? "#c62828" : "#757575" }}>
                              {notice.priority.toUpperCase()}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 13, color: "#212121", marginTop: 4 }}>{notice.content}</Text>
                          <Text style={{ fontSize: 11, color: "#757575", marginTop: 4 }}>By: {notice.createdBy || "Admin"}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {erpSub === "staff" && (user.role === "admin" || user.role === "staff") && (
                <View style={{ gap: 15 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <Text style={styles.sectionTitle}>Staff Management Portal</Text>
                    <TouchableOpacity 
                      onPress={() => {
                        if (showStaffForm) {
                          setEditingStaff(null);
                          setShowStaffForm(false);
                        } else {
                          setShowStaffForm(true);
                        }
                      }} 
                      style={[styles.primaryBtn, { minWidth: 150, marginVertical: 0, height: 36, paddingVertical: 0, justifyContent: "center" }]}
                    >
                      <Text style={[styles.primaryBtnTxt, { fontSize: 13 }]}>
                        {showStaffForm ? "Close Form" : "➕ Create New Staff"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showStaffForm && (
                    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: editingStaff ? "#0288d1" : "#c62828" }]}>
                      <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>{editingStaff ? "✏️ Edit Staff Profile" : "Add Academy Faculty Member"}</Text>
                      {editingStaff ? (
                        <>
                          <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#999" value={editingStaff.firstName} onChangeText={f => setEditingStaff({ ...editingStaff, firstName: f })} />
                          <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#999" value={editingStaff.lastName} onChangeText={l => setEditingStaff({ ...editingStaff, lastName: l })} />
                          <TextInput style={styles.input} placeholder="Employee ID" placeholderTextColor="#999" value={editingStaff.employeeId} onChangeText={e => setEditingStaff({ ...editingStaff, employeeId: e })} />
                          <TextInput style={styles.input} placeholder="Designation" placeholderTextColor="#999" value={editingStaff.designation} onChangeText={d => setEditingStaff({ ...editingStaff, designation: d })} />
                          <TextInput style={styles.input} placeholder="Department" placeholderTextColor="#999" value={editingStaff.department} onChangeText={dp => setEditingStaff({ ...editingStaff, department: dp })} />
                          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={editingStaff.email} onChangeText={e => setEditingStaff({ ...editingStaff, email: e })} keyboardType="email-address" />
                          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#999" value={editingStaff.phone} onChangeText={p => setEditingStaff({ ...editingStaff, phone: p })} keyboardType="phone-pad" />
                          <TextInput style={styles.input} placeholder="Login Username" placeholderTextColor="#999" value={editingStaff.loginUsername} onChangeText={u => setEditingStaff({ ...editingStaff, loginUsername: u })} />
                          <TextInput style={styles.input} placeholder="Login Password (leave empty to keep current)" secureTextEntry placeholderTextColor="#999" value={editingStaff.loginPassword || ""} onChangeText={pw => setEditingStaff({ ...editingStaff, loginPassword: pw })} />
                          
                          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                            <TouchableOpacity onPress={updateStaffRecord} style={[styles.primaryBtn, { flex: 1, backgroundColor: "#0288d1", justifyContent: "center" }]}>
                              <Text style={styles.primaryBtnTxt}>Update Record</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => { setEditingStaff(null); setShowStaffForm(false); }} style={[styles.outlineBtn, { flex: 1, justifyContent: "center" }]}>
                              <Text style={styles.outlineBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <>
                          <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#999" value={newStaff.firstName} onChangeText={f => setNewStaff({ ...newStaff, firstName: f })} />
                          <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#999" value={newStaff.lastName} onChangeText={l => setNewStaff({ ...newStaff, lastName: l })} />
                          <TextInput style={styles.input} placeholder="Employee ID" placeholderTextColor="#999" value={newStaff.employeeId} onChangeText={e => setNewStaff({ ...newStaff, employeeId: e })} />
                          <TextInput style={styles.input} placeholder="Designation" placeholderTextColor="#999" value={newStaff.designation} onChangeText={d => setNewStaff({ ...newStaff, designation: d })} />
                          <TextInput style={styles.input} placeholder="Department" placeholderTextColor="#999" value={newStaff.department} onChangeText={dp => setNewStaff({ ...newStaff, department: dp })} />
                          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={newStaff.email} onChangeText={e => setNewStaff({ ...newStaff, email: e })} keyboardType="email-address" />
                          <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#999" value={newStaff.phone} onChangeText={p => setNewStaff({ ...newStaff, phone: p })} keyboardType="phone-pad" />
                          <TextInput style={styles.input} placeholder="Login Username *" placeholderTextColor="#999" value={newStaff.loginUsername} onChangeText={u => setNewStaff({ ...newStaff, loginUsername: u })} />
                          <TextInput style={styles.input} placeholder="Login Password *" secureTextEntry placeholderTextColor="#999" value={newStaff.loginPassword} onChangeText={pw => setNewStaff({ ...newStaff, loginPassword: pw })} />
                          
                          <TouchableOpacity onPress={createStaffRecord} style={styles.primaryBtn}>
                            <Text style={styles.primaryBtnTxt}>Add Staff Record</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  )}

                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Staff Directory ({staff.length})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                      <View style={{ minWidth: 600 }}>
                        <View style={[styles.tableRow, { backgroundColor: "#f5f5f5", paddingVertical: 8, paddingHorizontal: 12 }]}>
                          <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Name</Text>
                          <Text style={[styles.th, { flex: 1.2, fontWeight: "bold" }]}>Role / Department</Text>
                          <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Contact</Text>
                          <Text style={[styles.th, { flex: 1, fontWeight: "bold", textAlign: "center" }]}>Actions</Text>
                        </View>
                        {staff.length === 0 ? (
                          <Text style={[styles.emptyText, { padding: 15 }]}>No staff records found.</Text>
                        ) : (
                          staff.map((st, idx) => (
                            <View key={st.id} style={[styles.tableRow, { borderBottomWidth: 1, borderColor: "#eeeeee", paddingVertical: 10, paddingHorizontal: 12, backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa", alignItems: "center" }]}>
                              <Text style={{ flex: 1.5, color: "#212121", fontWeight: "600" }}>{st.firstName} {st.lastName}</Text>
                              <Text style={{ flex: 1.2, color: "#757575", fontSize: 12 }}>{st.designation}{"\n"}{st.department}</Text>
                              <Text style={{ flex: 1.5, color: "#757575", fontSize: 12 }}>{st.email}{"\n"}{st.phone}</Text>
                              <View style={{ flex: 1, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                                <TouchableOpacity onPress={() => { setEditingStaff(st); setShowStaffForm(true); }} style={{ padding: 6, backgroundColor: "#0288d1", borderRadius: 4 }}>
                                  <Ionicons name="create-outline" size={16} color="#ffffff" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => deleteStaffRecord(st.id)} style={{ padding: 6, backgroundColor: "#d32f2f", borderRadius: 4 }}>
                                  <Ionicons name="trash-outline" size={16} color="#ffffff" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    </ScrollView>
                  </View>
                </View>
              )}

              {erpSub === "fees" && (() => {
                const myStudent = user.role === "student"
                  ? students.find((s: any) => s.email === user.email || s.phone === user.phone || s.rollNumber === user.username || s.id === user.userId)
                  : null;
                const displayFees = user.role === "student"
                  ? fees.filter((f: any) => f.studentId === user.userId || f.studentUsername === user.username || (myStudent && (f.studentId === myStudent.id || f.studentUsername === myStudent.rollNumber)))
                  : fees;
                return (
                  <View style={{ gap: 15 }}>
                    {user.role === "student" && myStudent && (
                      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#c62828" }]}>
                        <Text style={styles.sectionTitle}>My Profile</Text>
                        <Text style={{ color: "#212121", fontWeight: "bold" }}>{myStudent.firstName} {myStudent.lastName}</Text>
                        <Text style={{ color: "#757575", fontSize: 12, marginTop: 2 }}>Roll: {myStudent.rollNumber} | Batch: {myStudent.batch || "N/A"}</Text>
                        <Text style={{ color: "#757575", fontSize: 12 }}>Course: {myStudent.course}</Text>
                      </View>
                    )}
                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>{user.role === "student" ? "My Fee Details" : "Tuition Ledger Assignments"}</Text>
                      {displayFees.length === 0 ? (
                        <Text style={styles.emptyText}>{user.role === "student" ? "No fee records found for your account." : "No active fee records assigned."}</Text>
                      ) : (
                        displayFees.map((f: any) => {
                          const stud = students.find((s: any) => s.id === f.studentId);
                          const isPaid = f.status === "paid";
                          return (
                            <View key={f.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eeeeee" }}>
                              {user.role !== "student" && (
                                <Text style={{ fontWeight: "bold", color: "#212121", marginBottom: 4 }}>
                                  {stud ? `${stud.firstName} ${stud.lastName}` : `ID: ${f.studentId}`}
                                </Text>
                              )}
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                <View>
                                  <Text style={{ color: "#555", fontSize: 13 }}>Total Fee: <Text style={{ fontWeight: "bold", color: "#212121" }}>₹{f.totalAmount}</Text></Text>
                                  <Text style={{ color: "#555", fontSize: 12 }}>Paid: ₹{f.paidAmount || 0} | Due: ₹{(f.totalAmount || 0) - (f.paidAmount || 0)}</Text>
                                  {f.dueDate && <Text style={{ color: "#888", fontSize: 11 }}>Due Date: {f.dueDate}</Text>}
                                </View>
                                <View style={{ backgroundColor: isPaid ? "#e8f5e9" : "#fff3e0", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
                                  <Text style={{ color: isPaid ? "#2e7d32" : "#e65100", fontWeight: "bold", fontSize: 12 }}>
                                    {(f.status || "pending").toUpperCase()}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  </View>
                );
              })()}

              {erpSub === "id-card" && (
                <>
                {user.role !== "student" ? (
                  <View style={{ gap: 15 }}>
                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>Select Student – Generate ID Card</Text>
                      {students.length === 0 ? (
                        <Text style={styles.emptyText}>No student profiles available.</Text>
                      ) : (
                        students.map((s: any) => (
                          <TouchableOpacity key={s.id} onPress={() => setSelectedIdStudent(s)} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eeeeee" }}>
                            <Text style={{ color: selectedIdStudent?.id === s.id ? "#c62828" : "#212121", fontWeight: "bold" }}>
                              {s.firstName} {s.lastName}
                            </Text>
                            <Text style={{ fontSize: 11, color: "#888" }}>Roll: {s.rollNumber} | {s.batch}</Text>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                    {selectedIdStudent && (
                      <View style={{ alignItems: "center", gap: 15 }}>
                        <View style={styles.idCard}>
                          <Text style={styles.idCardHeader}>NERMAI IAS ACADEMY</Text>
                          <View style={styles.idCardAvatar}>
                            {selectedIdStudent.photoBase64 ? (
                              <Image source={{ uri: selectedIdStudent.photoBase64 }} style={{ width: 70, height: 70, borderRadius: 35 }} />
                            ) : (
                              <Ionicons name="person" size={40} color="#c62828" />
                            )}
                          </View>
                          <Text style={styles.idCardName}>{selectedIdStudent.firstName} {selectedIdStudent.lastName}</Text>
                          <Text style={{ color: "#c62828", fontSize: 12, fontWeight: "bold", marginBottom: 10 }}>IAS CANDIDATE</Text>
                          <View style={{ width: "100%", borderTopWidth: 1, borderColor: "#e0e0e0", paddingTop: 8, gap: 2 }}>
                            <Text style={styles.idCardMeta}>Roll No: {selectedIdStudent.rollNumber}</Text>
                            <Text style={styles.idCardMeta}>Admission: {selectedIdStudent.admissionNumber}</Text>
                            <Text style={styles.idCardMeta}>Batch: {selectedIdStudent.batch || "UPSC 2026"}</Text>
                            <Text style={styles.idCardMeta}>Course: {selectedIdStudent.course}</Text>
                          </View>
                          <View style={styles.idBarcode}>
                            <Text style={{ letterSpacing: 3, fontSize: 10, color: "#ffffff", fontWeight: "bold" }}>|||| BARCODE ||||</Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              const newStatus = !selectedIdStudent.idCardGenerated;
                              await api.put(`/erp/student/${selectedIdStudent.id}`, {
                                idCardGenerated: newStatus
                              });
                              Alert.alert("Success", newStatus ? "ID Card / Hall Ticket Generated!" : "ID Card / Hall Ticket Revoked!");
                              setSelectedIdStudent({ ...selectedIdStudent, idCardGenerated: newStatus });
                              loadStudents();
                            } catch (e: any) {
                              Alert.alert("Error", e.message || "Failed to update ID card status.");
                            }
                          }}
                          style={[styles.primaryBtn, { backgroundColor: selectedIdStudent.idCardGenerated ? "#2e7d32" : "#c62828" }]}
                        >
                          <Text style={styles.primaryBtnTxt}>
                            {selectedIdStudent.idCardGenerated ? "Revoke ID Card / Hall Ticket" : "Generate ID Card / Hall Ticket"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  /* ---- STUDENT: only see own card if admin has generated it ---- */
                  (() => {
                    const myRecord = students.find((s: any) => s.email === user.email || s.phone === user.phone);
                    const hasCard = myRecord && (myRecord.idCardGenerated === true || myRecord.hallTicketGenerated === true);
                    if (!hasCard) {
                      return (
                        <View style={styles.emptyContainer}>
                          <Ionicons name="card-outline" size={44} color="#bdbdbd" />
                          <Text style={{ fontSize: 15, fontWeight: "bold", color: "#555", textAlign: "center", marginTop: 8 }}>
                            No Card Generated Yet
                          </Text>
                          <Text style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 5 }}>
                            Your ID card will appear here once the admin generates it.
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View style={{ alignItems: "center" }}>
                        <View style={styles.idCard}>
                          <Text style={styles.idCardHeader}>NERMAI IAS ACADEMY</Text>
                          <View style={styles.idCardAvatar}>
                            {myRecord.photoBase64 ? (
                              <Image source={{ uri: myRecord.photoBase64 }} style={{ width: 70, height: 70, borderRadius: 35 }} />
                            ) : (
                              <Ionicons name="person" size={40} color="#c62828" />
                            )}
                          </View>
                          <Text style={styles.idCardName}>{myRecord.firstName} {myRecord.lastName}</Text>
                          <Text style={{ color: "#c62828", fontSize: 12, fontWeight: "bold", marginBottom: 10 }}>IAS CANDIDATE</Text>
                          <View style={{ width: "100%", borderTopWidth: 1, borderColor: "#e0e0e0", paddingTop: 8, gap: 2 }}>
                            <Text style={styles.idCardMeta}>Roll No: {myRecord.rollNumber}</Text>
                            <Text style={styles.idCardMeta}>Admission: {myRecord.admissionNumber}</Text>
                            <Text style={styles.idCardMeta}>Batch: {myRecord.batch || "UPSC 2026"}</Text>
                            <Text style={styles.idCardMeta}>Course: {myRecord.course}</Text>
                          </View>
                          <View style={styles.idBarcode}>
                    <Text style={{ letterSpacing: 3, fontSize: 10, color: "#ffffff", fontWeight: "bold" }}>|||| BARCODE ||||</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()
                )}
                </>
              )}

              {erpSub === "my-profile" && (
                <ScrollView contentContainerStyle={{ gap: 15, paddingBottom: 30 }}>
                  <Text style={styles.sectionTitle}>My Profile</Text>

                  {/* Status Banner */}
                  {myProfileRequest && (
                    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: myProfileRequest.status === "approved" ? "#2e7d32" : myProfileRequest.status === "pending" ? "#f57c00" : "#c62828" }]}>
                      {myProfileRequest.status === "approved" && (
                        <Text style={{ color: "#2e7d32", fontWeight: "bold" }}>
                          ✅ Your profile is approved! Welcome, {myProfileRequest.name}.
                        </Text>
                      )}
                      {myProfileRequest.status === "pending" && (
                        <Text style={{ color: "#f57c00", fontWeight: "bold" }}>
                          ⏳ Profile completion request is pending admin review.
                        </Text>
                      )}
                      {myProfileRequest.status === "rejected" && (
                        <View>
                          <Text style={{ color: "#c62828", fontWeight: "bold", marginBottom: 4 }}>
                            ❌ Profile rejected. Please resubmit.
                          </Text>
                          {myProfileRequest.rejectionReason && (
                            <Text style={{ color: "#757575", fontSize: 12 }}>
                              Reason: {myProfileRequest.rejectionReason}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}

                  {/* Profile Form */}
                  {(!myProfileRequest || myProfileRequest.status === "rejected") && (() => {
                    const myStudent = students.find((s: any) => s.email === user.email || s.phone === user.phone || s.rollNumber === user.username || s.id === user.userId);
                    const rawCount = myStudent?.profileSubmitCount;
                    const count = typeof rawCount === "number" ? rawCount : 0;
                    if (count >= 3) {
                      return (
                        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#c62828" }]}>
                          <Text style={{ fontWeight: "bold", fontSize: 14, color: "#c62828", marginBottom: 12 }}>
                            ⚠️ Profile Completion Blocked
                          </Text>
                          <Text style={{ color: "#c62828", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>
                            You have reached the maximum limit of 3 profile submission attempts.
                          </Text>
                          <Text style={{ color: "#757575", fontSize: 12 }}>
                            Please contact the administrator directly to complete your profile registration details.
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#0288d1", gap: 12 }]}>
                        <Text style={{ fontWeight: "bold", fontSize: 14, color: "#0288d1", marginBottom: 4 }}>
                          📋 Complete Your Profile
                        </Text>
                        <Text style={{ color: "#c62828", fontSize: 11, fontWeight: "600" }}>
                          ⚠️ Note: You have used {count} of 3 submission attempts.
                        </Text>
                        <Text style={{ color: "#757575", fontSize: 12 }}>
                          Fill all fields and upload documents. Admin will review and approve your profile.
                        </Text>

                        <TextInput
                          style={styles.input}
                          placeholder="Full Name *"
                          placeholderTextColor="#999"
                          value={profileForm.name}
                          onChangeText={v => setProfileForm({ ...profileForm, name: v })}
                        />

                        <TextInput
                          style={styles.input}
                          placeholder="Date of Birth (YYYY-MM-DD) *"
                          placeholderTextColor="#999"
                          value={profileForm.dob}
                          onChangeText={v => setProfileForm({ ...profileForm, dob: v })}
                        />

                        <TextInput
                          style={styles.input}
                          placeholder="Blood Group (e.g. O+, A+)"
                          placeholderTextColor="#999"
                          value={profileForm.bloodGroup}
                          onChangeText={v => setProfileForm({ ...profileForm, bloodGroup: v })}
                        />

                        <TextInput
                          style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                          placeholder="Full Address *"
                          placeholderTextColor="#999"
                          multiline={true}
                          value={profileForm.address}
                          onChangeText={v => setProfileForm({ ...profileForm, address: v })}
                        />

                        {/* Photo Upload */}
                        <View style={{ marginVertical: 6 }}>
                          <Text style={{ color: "#757575", fontSize: 12, marginBottom: 6, fontWeight: "bold" }}>
                            📸 Passport Size Photo *
                          </Text>
                          <TouchableOpacity
                            onPress={() => pickImage("passportPhotoBase64")}
                            style={{
                              padding: 10,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: "#bdbdbd",
                              backgroundColor: "#f5f5f5",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <Text style={{ color: "#333", fontWeight: "bold" }}>Select from Gallery</Text>
                          </TouchableOpacity>
                          {profileForm.passportPhotoBase64 ? (
                            <Image
                              source={{ uri: profileForm.passportPhotoBase64 }}
                              style={{ width: 80, height: 80, borderRadius: 8, alignSelf: "center", borderWidth: 1, borderColor: "#ccc" }}
                            />
                          ) : (
                            <Text style={{ color: "#888", fontSize: 11, fontStyle: "italic", textAlign: "center" }}>
                              No photo selected
                            </Text>
                          )}
                        </View>

                        {/* ID Upload */}
                        <View style={{ marginVertical: 6 }}>
                          <Text style={{ color: "#757575", fontSize: 12, marginBottom: 6, fontWeight: "bold" }}>
                            🪪 Valid Photo ID *
                          </Text>
                          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                            {["Aadhar", "PAN", "Driving Licence"].map(t => (
                              <TouchableOpacity
                                key={t}
                                onPress={() => setProfileForm({ ...profileForm, photoIdType: t })}
                                style={{
                                  flex: 1,
                                  padding: 8,
                                  borderRadius: 6,
                                  borderWidth: 2,
                                  borderColor: profileForm.photoIdType === t ? "#0288d1" : "#e0e0e0",
                                  backgroundColor: profileForm.photoIdType === t ? "#e3f2fd" : "#f9f9f9",
                                  alignItems: "center",
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: "bold", color: profileForm.photoIdType === t ? "#0288d1" : "#757575" }}>
                                  {t}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <TouchableOpacity
                            onPress={() => pickImage("photoIdBase64")}
                            style={{
                              padding: 10,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: "#bdbdbd",
                              backgroundColor: "#f5f5f5",
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <Text style={{ color: "#333", fontWeight: "bold" }}>Select ID Document</Text>
                          </TouchableOpacity>
                          {profileForm.photoIdBase64 ? (
                            <Image
                              source={{ uri: profileForm.photoIdBase64 }}
                              style={{ width: 120, height: 80, borderRadius: 8, alignSelf: "center", borderWidth: 1, borderColor: "#ccc", resizeMode: "contain" }}
                            />
                          ) : (
                            <Text style={{ color: "#888", fontSize: 11, fontStyle: "italic", textAlign: "center" }}>
                              No ID document selected
                            </Text>
                          )}
                        </View>

                        <TouchableOpacity
                          onPress={submitProfileCompletion}
                          style={[styles.primaryBtn, { marginTop: 10, backgroundColor: "#0288d1" }]}
                        >
                          <Text style={styles.primaryBtnTxt}>Submit Profile Completion</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </ScrollView>
              )}

              {erpSub === "analytics" && (() => {
                /* ---- STUDENT: personal analytics ---- */
                if (user.role === "student") {
                  const myStudent = students.find((s: any) => s.email === user.email || s.phone === user.phone || s.rollNumber === user.username || s.id === user.userId);
                  const myAttempts = studentAttempts.filter((a: any) => a.isSubmitted && a.score !== null && a.score !== undefined);
                  
                  // Base categories and recommendations for the subjects
                  const baseSubjects: Record<string, { avg: number, category: string, recommendation: string, status: string, color: string, count: number }> = {
                    "Polity": { avg: 0, category: "General Studies", recommendation: "No tests taken yet", status: "No Data", color: "#757575", count: 0 },
                    "History": { avg: 0, category: "General Studies", recommendation: "No tests taken yet", status: "No Data", color: "#757575", count: 0 },
                    "Geography": { avg: 0, category: "General Studies", recommendation: "No tests taken yet", status: "No Data", color: "#757575", count: 0 },
                    "Science": { avg: 0, category: "General Studies", recommendation: "No tests taken yet", status: "No Data", color: "#757575", count: 0 },
                    "Maths": { avg: 0, category: "CSAT", recommendation: "No tests taken yet", status: "No Data", color: "#757575", count: 0 },
                    "Reasoning": { avg: 0, category: "CSAT", recommendation: "No tests taken yet", status: "No Data", color: "#757575", count: 0 },
                  };

                  // If we have actual test score submissions, recalculate the subject average dynamically
                  myAttempts.forEach((a: any) => {
                    const title = a.testTitle || "";
                    let matchedSubject = "";
                    if (title.toLowerCase().includes("polity")) matchedSubject = "Polity";
                    else if (title.toLowerCase().includes("history")) matchedSubject = "History";
                    else if (title.toLowerCase().includes("geography")) matchedSubject = "Geography";
                    else if (title.toLowerCase().includes("science")) matchedSubject = "Science";
                    else if (title.toLowerCase().includes("math") || title.toLowerCase().includes("aptitude")) matchedSubject = "Maths";
                    else if (title.toLowerCase().includes("reasoning")) matchedSubject = "Reasoning";

                    if (matchedSubject && baseSubjects[matchedSubject]) {
                      const scorePct = a.totalMarks > 0 ? Math.round((a.score / a.totalMarks) * 100) : a.percentage || 0;
                      if (baseSubjects[matchedSubject].count === 0) {
                        baseSubjects[matchedSubject].avg = scorePct;
                      } else {
                        baseSubjects[matchedSubject].avg = Math.round((baseSubjects[matchedSubject].avg + scorePct) / 2);
                      }
                      baseSubjects[matchedSubject].count += 1;

                      // Reevaluate status & color
                      const avg = baseSubjects[matchedSubject].avg;
                      if (avg >= 75) {
                        baseSubjects[matchedSubject].status = "Performing Well";
                        baseSubjects[matchedSubject].color = "#2e7d32";
                        baseSubjects[matchedSubject].recommendation = "Performing well";
                      } else if (avg >= 50) {
                        baseSubjects[matchedSubject].status = "On Track";
                        baseSubjects[matchedSubject].color = "#f57f17";
                        baseSubjects[matchedSubject].recommendation = "On Track";
                      } else {
                        baseSubjects[matchedSubject].status = "Improvement Needed";
                        baseSubjects[matchedSubject].color = "#c62828";
                        baseSubjects[matchedSubject].recommendation = "Additional practice required";
                      }
                    }
                  });

                  const filteredSubjects = Object.entries(baseSubjects).filter(([_, info]) => {
                    if (selectedCategory === "All") return true;
                    return info.category === selectedCategory;
                  });

                  const gradedSubjects = Object.values(baseSubjects).filter(s => s.count > 0);
                  const overallAvg = gradedSubjects.length > 0
                    ? Math.round(gradedSubjects.reduce((sum, s) => sum + s.avg, 0) / gradedSubjects.length)
                    : 0;
                  
                  const getLabel = (avg: number) => {
                    if (gradedSubjects.length === 0) return { label: "No Tests Attempted", color: "#757575" };
                    return avg >= 75 ? { label: "Performing Well", color: "#2e7d32" } : avg >= 50 ? { label: "On Track", color: "#f57f17" } : { label: "Needs Improvement", color: "#c62828" };
                  };
                  const overall = getLabel(overallAvg);

                  return (
                    <View style={{ gap: 15 }}>
                      {/* Summary header */}
                      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: overall.color }]}>
                        <Text style={styles.sectionTitle}>My Performance Summary</Text>
                        <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 10 }}>
                          <View style={{ alignItems: "center" }}>
                            <Text style={{ fontSize: 28, fontWeight: "bold", color: overall.color }}>{overallAvg}%</Text>
                            <Text style={{ fontSize: 11, color: "#757575" }}>Overall Average</Text>
                          </View>
                          <View style={{ alignItems: "center" }}>
                            <Text style={{ fontSize: 28, fontWeight: "bold", color: "#c62828" }}>{myAttempts.length}</Text>
                            <Text style={{ fontSize: 11, color: "#757575" }}>Tests Attempted</Text>
                          </View>
                          <View style={{ alignItems: "center" }}>
                            <Text style={{ fontSize: 28, fontWeight: "bold", color: "#1565c0" }}>{tests.length}</Text>
                            <Text style={{ fontSize: 11, color: "#757575" }}>Total Tests</Text>
                          </View>
                        </View>
                        <View style={{ backgroundColor: overall.color + "20", borderRadius: 8, padding: 8 }}>
                          <Text style={{ color: overall.color, fontWeight: "bold", textAlign: "center" }}>{overall.label}</Text>
                        </View>
                      </View>

                      {/* Filter Controls */}
                      <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Filter Subjects by Category</Text>
                        <View style={{ flexDirection: "row", gap: 8, marginVertical: 5 }}>
                          {["All", "General Studies", "CSAT"].map((cat) => (
                            <TouchableOpacity
                              key={cat}
                              onPress={() => setSelectedCategory(cat)}
                              style={[
                                styles.rectTab,
                                selectedCategory === cat && styles.rectTabActive
                              ]}
                            >
                              <Text style={[styles.rectTabTxt, selectedCategory === cat && styles.rectTabTxtActive, { fontSize: 11 }]}>
                                {cat}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* Subject-wise data science breakdown */}
                      <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Data Science Subject Analytics</Text>
                        <View style={{ gap: 14 }}>
                          {filteredSubjects.map(([subject, info]) => {
                            return (
                              <View key={subject} style={{ gap: 4 }}>
                                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                  <Text style={{ color: "#212121", fontWeight: "600", fontSize: 13 }}>{subject} ({info.category})</Text>
                                  <Text style={{ color: info.color, fontWeight: "bold", fontSize: 12 }}>{info.status}</Text>
                                </View>
                                <View style={{ height: 8, backgroundColor: "#eeeeee", borderRadius: 4, overflow: "hidden" }}>
                                  <View style={{ width: `${info.avg}%`, height: "100%", backgroundColor: info.color }} />
                                </View>
                                <Text style={{ color: "#757575", fontSize: 11, textAlign: "right" }}>
                                  Average Score: {info.avg}% | {info.recommendation}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      {/* Attendance */}
                      <View style={styles.card}>
                        <Text style={styles.sectionTitle}>My Attendance</Text>
                        {(() => {
                          const attended = myStudent?.attendedDays !== undefined ? myStudent.attendedDays : 24;
                          const total = myStudent?.totalDays !== undefined ? myStudent.totalDays : 28;
                          const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
                          const atColor = pct >= 75 ? "#2e7d32" : pct >= 60 ? "#f57f17" : "#c62828";
                          return (
                            <View style={{ gap: 8 }}>
                              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <Text style={{ color: "#555" }}>Days Present: <Text style={{ fontWeight: "bold" }}>{attended}</Text></Text>
                                <Text style={{ color: "#555" }}>Total Days: <Text style={{ fontWeight: "bold" }}>{total}</Text></Text>
                              </View>
                              <View style={{ height: 10, backgroundColor: "#eeeeee", borderRadius: 5, overflow: "hidden" }}>
                                <View style={{ width: `${pct}%`, height: "100%", backgroundColor: atColor }} />
                              </View>
                              <Text style={{ color: atColor, fontWeight: "bold", textAlign: "right" }}>{pct}% Attendance</Text>
                              {pct < 75 && <Text style={{ color: "#c62828", fontSize: 12 }}>Below 75% threshold. Please attend regularly.</Text>}
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                  );
                }

                /* ---- ADMIN / STAFF: institution-wide analytics ---- */
                return (
                  <View style={{ gap: 15 }}>
                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>Academy Enrollments Overview</Text>
                      <View style={{ flexDirection: "row", justifyContent: "space-around", marginVertical: 10 }}>
                        <View style={{ alignItems: "center", backgroundColor: "#fff5f5", padding: 15, borderRadius: 8, flex: 1, marginRight: 8, borderWidth: 1, borderColor: "#ffebee" }}>
                          <Ionicons name="people" size={24} color="#c62828" />
                          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#c62828", marginTop: 5 }}>{students.length}</Text>
                          <Text style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>IAS Candidates</Text>
                        </View>
                        <View style={{ alignItems: "center", backgroundColor: "#fff5f5", padding: 15, borderRadius: 8, flex: 1, marginRight: 8, borderWidth: 1, borderColor: "#ffebee" }}>
                          <Ionicons name="briefcase" size={24} color="#c62828" />
                          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#c62828", marginTop: 5 }}>{staff.length}</Text>
                          <Text style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>Faculty Members</Text>
                        </View>
                        <View style={{ alignItems: "center", backgroundColor: "#fff5f5", padding: 15, borderRadius: 8, flex: 1, borderWidth: 1, borderColor: "#ffebee" }}>
                          <Ionicons name="checkbox" size={24} color="#c62828" />
                          <Text style={{ fontSize: 20, fontWeight: "bold", color: "#c62828", marginTop: 5 }}>{questions.length}</Text>
                          <Text style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>Question Bank</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>Tuition Ledger Metrics</Text>
                      {(() => {
                        const totalPaid = fees.filter((f: any) => f.status === "paid").reduce((sum: number, f: any) => sum + (f.totalAmount || 0), 0);
                        const totalExpected = fees.reduce((sum: number, f: any) => sum + (f.totalAmount || 0), 0);
                        const collectionRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
                        return (
                          <View style={{ gap: 8 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                              <Text style={{ color: "#212121" }}>Total Collected:</Text>
                              <Text style={{ fontWeight: "bold", color: "#2e7d32" }}>₹{totalPaid}</Text>
                            </View>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                              <Text style={{ color: "#212121" }}>Total Outstanding:</Text>
                              <Text style={{ fontWeight: "bold", color: "#c62828" }}>₹{totalExpected - totalPaid}</Text>
                            </View>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                              <Text style={{ color: "#212121" }}>Expected Revenue:</Text>
                              <Text style={{ fontWeight: "bold", color: "#212121" }}>₹{totalExpected}</Text>
                            </View>
                            <View style={{ height: 8, backgroundColor: "#eeeeee", borderRadius: 4, overflow: "hidden", marginTop: 5 }}>
                              <View style={{ width: `${collectionRate}%`, height: "100%", backgroundColor: "#2e7d32" }} />
                            </View>
                            <Text style={{ fontSize: 11, color: "#757575", textAlign: "right" }}>Collection rate: {collectionRate}%</Text>
                          </View>
                        );
                      })()}
                    </View>

                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>Course Distributions</Text>
                      {(() => {
                        const courseList = ["UPSC GS Course", "UPSC CSAT Special", "Mock Test Series Only", "TNPSC Group 1", "TNPSC Group 2"];
                        const totalStudents = students.length || 1;
                        return (
                          <View style={{ gap: 12 }}>
                            {courseList.map(c => {
                              const keyword = c.toLowerCase().split(" ")[0];
                              const count = students.filter((s: any) => String(s.course || "").toLowerCase().includes(keyword)).length;
                              const pct = Math.round((count / totalStudents) * 100);
                              return (
                                <View key={c} style={{ gap: 4 }}>
                                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                    <Text style={{ color: "#212121", fontSize: 13, fontWeight: "600" }}>{c}</Text>
                                    <Text style={{ color: "#757575", fontSize: 12 }}>{count} ({pct}%)</Text>
                                  </View>
                                  <View style={{ height: 6, backgroundColor: "#eeeeee", borderRadius: 3, overflow: "hidden" }}>
                                    <View style={{ width: `${pct}%`, height: "100%", backgroundColor: "#c62828" }} />
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        );
                      })()}
                    </View>

                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>Batch Attendance Overview</Text>
                      <View style={{ gap: 12 }}>
                        {[{ name: "UPSC Batch A (Polity/History)", pct: 94 }, { name: "UPSC Batch B (Geography/CSAT)", pct: 89 }, { name: "TNPSC Batch C (GS Tamil)", pct: 81 }].map(b => (
                          <View key={b.name} style={{ gap: 4 }}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                              <Text style={{ color: "#212121", fontSize: 13 }}>{b.name}</Text>
                              <Text style={{ color: b.pct >= 75 ? "#2e7d32" : "#c62828", fontSize: 12, fontWeight: "bold" }}>{b.pct}%</Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: "#eeeeee", borderRadius: 3, overflow: "hidden" }}>
                              <View style={{ width: `${b.pct}%`, height: "100%", backgroundColor: b.pct >= 75 ? "#2e7d32" : "#c62828" }} />
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                );
              })()}

              {erpSub === "marks" && (
                <View style={{ gap: 15 }}>
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Select Mock Exam Registry</Text>
                    {tests.length === 0 ? (
                      <Text style={styles.emptyText}>No mock tests available.</Text>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", gap: 8, paddingVertical: 10 }}>
                        {tests.map(t => {
                          const selected = selectedErpTestId === t.id;
                          return (
                            <TouchableOpacity 
                              key={t.id} 
                              onPress={() => {
                                setSelectedErpTestId(t.id);
                                loadErpTestResults(t.id);
                              }}
                              style={[
                                styles.rectTab, 
                                selected && styles.rectTabActive,
                                { marginRight: 8 }
                              ]}
                            >
                              <Text style={[styles.rectTabTxt, selected && styles.rectTabTxtActive]}>{t.title}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Student Performance Marks Registry</Text>
                    {(() => {
                      const myStudent = students.find((s: any) => s.email === user.email || s.phone === user.phone || s.rollNumber === user.username || s.id === user.userId);
                      const displayResults = user.role === "student"
                        ? erpTestResults.filter((r: any) => r.studentId === user.userId || r.studentName === user.name || (myStudent && r.studentId === myStudent.id))
                        : erpTestResults;

                      if (displayResults.length === 0) {
                        return <Text style={styles.emptyText}>No evaluation submissions recorded for this mock test yet.</Text>;
                      }

                      return (
                        <View style={{ gap: 10 }}>
                          <View style={styles.tableRow}>
                            <Text style={[styles.th, { flex: 2 }]}>Student Name</Text>
                            <Text style={styles.th}>Score</Text>
                            <Text style={styles.th}>Rank</Text>
                            <Text style={styles.th}>Status</Text>
                          </View>
                          {displayResults.map(r => {
                            const stud = students.find((s: any) => s.id === r.studentId);
                            const name = user.role === "student" ? "My Score" : (stud ? `${stud.firstName} ${stud.lastName}` : `Student ID: ${r.studentId}`);
                            const isPass = r.status === "pass";
                            return (
                              <View key={r.id} style={styles.tableRow}>
                                <Text style={{ flex: 2, color: "#212121", fontSize: 13 }}>{name}</Text>
                                <Text style={{ color: "#212121", fontSize: 13 }}>{r.obtainedMarks} / {r.totalMarks}</Text>
                                <Text style={{ color: "#212121", fontSize: 13 }}>#{r.rank || 1}</Text>
                                <Text style={{ color: isPass ? "#2e7d32" : "#c62828", fontWeight: "bold", fontSize: 12 }}>
                                  {isPass ? "PASS" : "FAIL"}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      );
                    })()}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}

        {/* ================== 4. LMS LEARNING (Sidebar Layout) ================== */}
        {activeTab === "lms" && (
          <View style={styles.splitLayout}>

            {/* LMS Sidebar */}
            {!lmsTabsCollapsed && (
              <View style={[styles.sidebar, darkMode && styles.sidebarDark]}>
                <TouchableOpacity onPress={() => setLmsSub("quiz")} style={[styles.sidebarTab, lmsSub === "quiz" && styles.sidebarTabActive, lmsSub === "quiz" && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="help-circle-outline" size={22} color={lmsSub === "quiz" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, lmsSub === "quiz" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Quiz</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setLmsSub("all-quizzes"); loadAllQuizzes(); }} style={[styles.sidebarTab, lmsSub === "all-quizzes" && styles.sidebarTabActive, lmsSub === "all-quizzes" && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="list-outline" size={22} color={lmsSub === "all-quizzes" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, lmsSub === "all-quizzes" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>All Quiz</Text>
                </TouchableOpacity>
                {user?.role !== "student" && (
                  <TouchableOpacity onPress={() => setLmsSub("create-quiz")} style={[styles.sidebarTab, lmsSub === "create-quiz" && styles.sidebarTabActive, lmsSub === "create-quiz" && darkMode && styles.sidebarTabActiveDark]}>
                    <Ionicons name="add-circle-outline" size={22} color={lmsSub === "create-quiz" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                    <Text style={[styles.sidebarTabTxt, lmsSub === "create-quiz" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Publish</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setLmsSub("resources")} style={[styles.sidebarTab, lmsSub === "resources" && styles.sidebarTabActive, lmsSub === "resources" && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="folder-outline" size={22} color={lmsSub === "resources" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, lmsSub === "resources" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Resources</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLmsSub("live-classes")} style={[styles.sidebarTab, lmsSub === "live-classes" && styles.sidebarTabActive, lmsSub === "live-classes" && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="videocam-outline" size={22} color={lmsSub === "live-classes" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, lmsSub === "live-classes" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Live</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setLmsSub("recorded")} style={[styles.sidebarTab, lmsSub === "recorded" && styles.sidebarTabActive, lmsSub === "recorded" && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="play-circle-outline" size={22} color={lmsSub === "recorded" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, lmsSub === "recorded" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Recorded</Text>
                </TouchableOpacity>

                {/* Collapse Button */}
                <TouchableOpacity onPress={() => setLmsTabsCollapsed(true)} style={{ marginTop: "auto", paddingVertical: 12, alignItems: "center", width: "100%" }}>
                  <Ionicons name="chevron-back" size={18} color={darkMode ? "#555" : "#bdbdbd"} />
                  <Text style={{ fontSize: 8, color: darkMode ? "#555" : "#bdbdbd", marginTop: 2, fontWeight: "bold" }}>HIDE</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Show Sidebar Button */}
            {lmsTabsCollapsed && (
              <TouchableOpacity
                onPress={() => setLmsTabsCollapsed(false)}
                style={{ position: "absolute", top: 12, left: 8, zIndex: 10, backgroundColor: darkMode ? "#1e1e1e" : "#ffffff", borderWidth: 1, borderColor: "#c62828", borderRadius: 8, padding: 6, flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Ionicons name="chevron-forward" size={14} color="#c62828" />
                <Text style={{ fontSize: 9, color: "#c62828", fontWeight: "bold" }}>MENU</Text>
              </TouchableOpacity>
            )}

            <ScrollView style={[styles.splitContent, lmsTabsCollapsed && { paddingTop: 50 }, darkMode && styles.splitContentDark]} contentContainerStyle={{ paddingBottom: 80 }}>

              {/* Publish Quiz (Admin/Staff) */}
              {lmsSub === "create-quiz" && user?.role !== "student" && (
                <View style={[styles.card, darkMode && styles.cardDark]}>
                  <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>Publish Daily Quiz Question</Text>
                  <Text style={[styles.label, darkMode && styles.labelDark]}>Quiz Title</Text>
                  <TextInput style={[styles.input, darkMode && styles.inputDark]} value={newPdfTest.title} onChangeText={t => setNewPdfTest({ ...newPdfTest, title: t })} placeholder="e.g. UPSC Daily Quiz - Polity" placeholderTextColor="#999" />
                  <Text style={[styles.label, darkMode && styles.labelDark]}>Quiz Target Date (YYYY-MM-DD)</Text>
                  <TextInput style={[styles.input, darkMode && styles.inputDark]} value={quizDateInput} onChangeText={setQuizDateInput} placeholder="YYYY-MM-DD" placeholderTextColor="#999" />
                  <View style={{ borderWidth: 1, borderColor: darkMode ? "#333" : "#e0e0e0", borderRadius: 10, padding: 14, marginTop: 10, gap: 10 }}>
                    <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 13 }}>Question Details</Text>
                    <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Question Statement Text" placeholderTextColor="#999" value={newQuizQ.questionText} onChangeText={t => setNewQuizQ({ ...newQuizQ, questionText: t })} />
                    <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Option 1" placeholderTextColor="#999" value={newQuizQ.opt0} onChangeText={t => setNewQuizQ({ ...newQuizQ, opt0: t })} />
                    <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Option 2" placeholderTextColor="#999" value={newQuizQ.opt1} onChangeText={t => setNewQuizQ({ ...newQuizQ, opt1: t })} />
                    <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Option 3" placeholderTextColor="#999" value={newQuizQ.opt2} onChangeText={t => setNewQuizQ({ ...newQuizQ, opt2: t })} />
                    <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Option 4" placeholderTextColor="#999" value={newQuizQ.opt3} onChangeText={t => setNewQuizQ({ ...newQuizQ, opt3: t })} />
                    <Text style={[styles.label, darkMode && styles.labelDark]}>Correct Option (1–4)</Text>
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      {[0, 1, 2, 3].map(idx => (
                        <TouchableOpacity key={idx} onPress={() => setNewQuizQ({ ...newQuizQ, correctIdx: idx })} style={[styles.roleBtn, newQuizQ.correctIdx === idx && styles.roleBtnActive, darkMode && styles.roleBtnDark]}>
                          <Text style={[styles.roleBtnTxt, newQuizQ.correctIdx === idx && styles.roleBtnTxtActive, darkMode && styles.roleBtnTxtDark]}>Opt {idx + 1}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity onPress={publishQuizQuestionDirectly} style={[styles.primaryBtn, { marginTop: 10 }]}>
                      <Text style={styles.primaryBtnTxt}>Publish to Database</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Today's Quiz */}
              {(lmsSub === "quiz" || lmsSub === undefined) && (
                <View style={[styles.card, darkMode && styles.cardDark]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                    <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>
                      {user?.role === "student" ? "Daily IAS Practice Quiz" : "Today's Published Quiz"}
                    </Text>
                    {user?.role !== "student" && todayQuiz && (
                      <TouchableOpacity onPress={deleteLmsQuiz} style={[styles.outlineBtn, { paddingHorizontal: 12, paddingVertical: 6, marginVertical: 0 }]}>
                        <Text style={styles.outlineBtnTxt}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {!todayQuiz ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="calendar-outline" size={40} color={darkMode ? "#555" : "#757575"} />
                      <Text style={[styles.emptyText, darkMode && styles.emptyTextDark]}>No Daily Quiz available for today.</Text>
                      <TouchableOpacity onPress={loadTodayQuiz} style={[styles.primaryBtn, { marginTop: 10 }]}>
                        <Text style={styles.primaryBtnTxt}>Refresh Quiz</Text>
                      </TouchableOpacity>
                    </View>
                  ) : user?.role !== "student" ? (
                    <View>
                      <Text style={{ color: "#c62828", fontSize: 12, marginBottom: 12, fontWeight: "bold" }}>Quiz Date: {todayQuiz.quizDate}</Text>
                      {todayQuiz.questions.map((q: any, idx: number) => (
                        <View key={idx} style={{ padding: 12, backgroundColor: darkMode ? "#2a2a2a" : "#f9f9f9", borderRadius: 8, borderLeftWidth: 4, borderLeftColor: "#c62828", marginBottom: 15 }}>
                          <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontWeight: "700", fontSize: 14, marginBottom: 8 }}>{idx + 1}. {q.questionText}</Text>
                          <View style={{ gap: 8, marginVertical: 6 }}>
                            {q.options.map((opt: string, oIdx: number) => {
                              const isCorrect = oIdx === q.correctOptionIndex;
                              const pct = q.optionPercentages ? q.optionPercentages[oIdx] : 0;
                              return (
                                <View key={oIdx} style={{ backgroundColor: darkMode ? "#1e1e1e" : "#ffffff", borderWidth: 1, borderColor: isCorrect ? "#2e7d32" : darkMode ? "#333" : "#e0e0e0", borderRadius: 6, padding: 8 }}>
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                                    <Text style={{ fontSize: 12, color: isCorrect ? "#2e7d32" : darkMode ? "#e0e0e0" : "#212121", fontWeight: isCorrect ? "bold" : "normal" }}>
                                      {opt}{isCorrect ? " (Correct)" : ""}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: "#757575", fontWeight: "bold" }}>{pct}%</Text>
                                  </View>
                                  <View style={{ height: 4, backgroundColor: darkMode ? "#333" : "#eeeeee", borderRadius: 2 }}>
                                    <View style={{ width: `${pct}%`, height: "100%", backgroundColor: isCorrect ? "#2e7d32" : "#bdbdbd", borderRadius: 2 }} />
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : quizScore !== null ? (
                    <View style={{ alignItems: "center", paddingVertical: 20 }}>
                      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: "#fff3e0", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                        <Ionicons name="trophy" size={36} color="#FFA000" />
                      </View>
                      <Text style={{ fontSize: 18, fontWeight: "bold", color: darkMode ? "#e0e0e0" : "#212121", marginBottom: 6 }}>Quiz Completed!</Text>
                      <Text style={{ fontSize: 20, color: "#c62828", fontWeight: "bold" }}>Score: {quizScore} / {todayQuiz.questions.length}</Text>
                      <View style={{ width: "100%", marginTop: 20, gap: 15 }}>
                        <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontWeight: "bold", fontSize: 14 }}>Answers Review</Text>
                        {quizFeedbackQuestions.map((q, idx) => (
                          <View key={idx} style={{ padding: 12, backgroundColor: darkMode ? "#2a2a2a" : "#f9f9f9", borderRadius: 8, borderLeftWidth: 4, borderLeftColor: "#c62828" }}>
                            <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontWeight: "700", fontSize: 14, marginBottom: 8 }}>{idx + 1}. {q.questionText}</Text>
                            <View style={{ gap: 8, marginVertical: 6 }}>
                              {q.options.map((opt: string, oIdx: number) => {
                                const isCorrect = oIdx === q.correctOptionIndex;
                                const isUserChoice = oIdx === q.userAnswer;
                                const pct = q.optionPercentages ? q.optionPercentages[oIdx] : 0;
                                return (
                                  <View key={oIdx} style={{ borderWidth: 1.5, borderColor: isCorrect ? "#2e7d32" : isUserChoice && !isCorrect ? "#c62828" : darkMode ? "#333" : "#e0e0e0", borderRadius: 6, padding: 8, backgroundColor: isCorrect ? "#e8f5e9" : isUserChoice && !isCorrect ? "#ffebee" : darkMode ? "#1e1e1e" : "#ffffff" }}>
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                                      <Text style={{ fontSize: 12, color: isCorrect ? "#2e7d32" : isUserChoice && !isCorrect ? "#c62828" : darkMode ? "#e0e0e0" : "#212121", fontWeight: (isCorrect || isUserChoice) ? "bold" : "normal", flex: 1 }}>
                                        {opt}
                                      </Text>
                                      <Text style={{ fontSize: 11, color: "#757575", fontWeight: "bold" }}>{pct}%</Text>
                                    </View>
                                    <View style={{ height: 4, backgroundColor: darkMode ? "#333" : "#eeeeee", borderRadius: 2 }}>
                                      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: isCorrect ? "#2e7d32" : isUserChoice && !isCorrect ? "#c62828" : "#bdbdbd", borderRadius: 2 }} />
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    // Active Quiz Attempt (Student)
                    (() => {
                      const allQIds = todayQuiz.questions.map((_: any, i: number) => i);
                      const answered = Object.keys(quizAnswers).length;
                      return (
                        <View>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                            <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 12 }}>Date: {todayQuiz.quizDate}</Text>
                            <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 12 }}>{answered}/{todayQuiz.questions.length} answered</Text>
                          </View>
                          {todayQuiz.questions.map((q: any, idx: number) => (
                            <View key={idx} style={{ padding: 12, backgroundColor: darkMode ? "#2a2a2a" : "#f9f9f9", borderRadius: 10, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: quizAnswers[idx] !== undefined ? "#2e7d32" : "#e0e0e0" }}>
                              <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontWeight: "700", fontSize: 14, marginBottom: 10 }}>{idx + 1}. {q.questionText}</Text>
                              <View style={{ gap: 8 }}>
                                {q.options.map((opt: string, oIdx: number) => {
                                  const selected = quizAnswers[idx] === oIdx;
                                  return (
                                    <TouchableOpacity key={oIdx} onPress={() => setQuizAnswers((prev: any) => ({ ...prev, [idx]: oIdx }))} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 8, borderWidth: 1.5, borderColor: selected ? "#c62828" : darkMode ? "#333" : "#e0e0e0", backgroundColor: selected ? "#ffebee" : darkMode ? "#1e1e1e" : "#ffffff" }}>
                                      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selected ? "#c62828" : darkMode ? "#555" : "#bdbdbd", alignItems: "center", justifyContent: "center" }}>
                                        {selected && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#c62828" }} />}
                                      </View>
                                      <Text style={{ fontSize: 13, color: selected ? "#c62828" : darkMode ? "#e0e0e0" : "#212121", flex: 1, fontWeight: selected ? "bold" : "normal" }}>{opt}</Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </View>
                            </View>
                          ))}
                          <TouchableOpacity onPress={submitLmsQuiz} style={[styles.primaryBtn, { width: "100%", marginTop: 10 }]}>
                            <Text style={styles.primaryBtnTxt}>Submit Quiz</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })()
                  )}
                </View>
              )}

              {/* All Quizzes */}
              {lmsSub === "all-quizzes" && (
                <View style={[styles.card, darkMode && styles.cardDark]}>
                  <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>All Published Quizzes ({allQuizzes.length})</Text>
                  {allQuizzes.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="document-outline" size={40} color={darkMode ? "#555" : "#757575"} />
                      <Text style={[styles.emptyText, darkMode && styles.emptyTextDark]}>No quizzes published yet.</Text>
                    </View>
                  ) : (
                    allQuizzes.map((quiz: any) => {
                      const isCompleted = quiz.studentStatus === "completed";
                      const isMissed = quiz.studentStatus === "missed";
                      const isPending = quiz.studentStatus === "pending";
                      const statusColor = isCompleted ? "#2e7d32" : isMissed ? "#c62828" : "#1565c0";
                      const statusLabel = isCompleted ? `Completed (${quiz.score || ""})` : isMissed ? "Missed" : "Pending";
                      return (
                        <View key={quiz.id} style={{ borderBottomWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#eeeeee", paddingVertical: 14 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: "bold", color: darkMode ? "#e0e0e0" : "#212121" }}>{quiz.title || quiz.quizDate}</Text>
                              <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 12, marginTop: 2 }}>Questions: {quiz.questions?.length || 0}</Text>
                              {quiz.autoDisableAt && <Text style={{ color: darkMode ? "#616161" : "#888", fontSize: 11, marginTop: 2 }}>Expires: {new Date(quiz.autoDisableAt).toLocaleString()}</Text>}
                            </View>
                            <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: isCompleted ? "#e8f5e9" : isPending ? "#e3f2fd" : "#f5f5f5" }}>
                              <Text style={{ color: statusColor, fontWeight: "bold", fontSize: 11 }}>{statusLabel}</Text>
                            </View>
                          </View>
                          {user?.role === "student" && (
                            <TouchableOpacity onPress={() => loadSpecificQuiz(quiz.id)} style={[styles.primaryBtn, { marginTop: 10, backgroundColor: isCompleted ? "#2e7d32" : "#1565c0" }]}>
                              <Text style={styles.primaryBtnTxt}>{isCompleted ? "Review Results" : "Attempt Quiz"}</Text>
                            </TouchableOpacity>
                          )}
                          {user?.role !== "student" && (
                            <TouchableOpacity onPress={async () => { try { await api.delete(`/lms/daily-quiz/${quiz.id}`); loadAllQuizzes(); Alert.alert("Deleted", "Quiz removed."); } catch (e: any) { Alert.alert("Error", e.message); }}} style={[styles.outlineBtn, { marginTop: 8, borderColor: "#c62828" }]}>
                              <Text style={[styles.outlineBtnTxt, { color: "#c62828" }]}>Delete Quiz</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* Resources (Coming Soon) */}
              {lmsSub === "resources" && (
                <View style={[styles.card, darkMode && styles.cardDark, { alignItems: "center", paddingVertical: 50 }]}>
                  <Ionicons name="folder-open-outline" size={52} color={darkMode ? "#444" : "#e0e0e0"} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: darkMode ? "#555" : "#9e9e9e", marginTop: 16 }}>Resources</Text>
                  <Text style={{ fontSize: 13, color: darkMode ? "#444" : "#bdbdbd", marginTop: 8, textAlign: "center" }}>Study materials, PDFs, and notes will be available here.</Text>
                  <View style={{ marginTop: 20, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: darkMode ? "#1e1e1e" : "#f5f5f5" }}>
                    <Text style={{ fontSize: 11, color: darkMode ? "#555" : "#bdbdbd", fontWeight: "700", letterSpacing: 1 }}>COMING SOON</Text>
                  </View>
                </View>
              )}

              {/* Live Classes (Coming Soon) */}
              {lmsSub === "live-classes" && (
                <View style={[styles.card, darkMode && styles.cardDark, { alignItems: "center", paddingVertical: 50 }]}>
                  <Ionicons name="videocam-outline" size={52} color={darkMode ? "#444" : "#e0e0e0"} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: darkMode ? "#555" : "#9e9e9e", marginTop: 16 }}>Live Classes</Text>
                  <Text style={{ fontSize: 13, color: darkMode ? "#444" : "#bdbdbd", marginTop: 8, textAlign: "center" }}>Live interactive sessions with faculty will be streamed here.</Text>
                  <View style={{ marginTop: 20, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: darkMode ? "#1e1e1e" : "#f5f5f5" }}>
                    <Text style={{ fontSize: 11, color: darkMode ? "#555" : "#bdbdbd", fontWeight: "700", letterSpacing: 1 }}>COMING SOON</Text>
                  </View>
                </View>
              )}

              {/* Recorded Classes (Coming Soon) */}
              {lmsSub === "recorded" && (
                <View style={[styles.card, darkMode && styles.cardDark, { alignItems: "center", paddingVertical: 50 }]}>
                  <Ionicons name="play-circle-outline" size={52} color={darkMode ? "#444" : "#e0e0e0"} />
                  <Text style={{ fontSize: 16, fontWeight: "700", color: darkMode ? "#555" : "#9e9e9e", marginTop: 16 }}>Recorded Classes</Text>
                  <Text style={{ fontSize: 13, color: darkMode ? "#444" : "#bdbdbd", marginTop: 8, textAlign: "center" }}>Watch past class recordings at your own pace.</Text>
                  <View style={{ marginTop: 20, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: darkMode ? "#1e1e1e" : "#f5f5f5" }}>
                    <Text style={{ fontSize: 11, color: darkMode ? "#555" : "#bdbdbd", fontWeight: "700", letterSpacing: 1 }}>COMING SOON</Text>
                  </View>
                </View>
              )}

            </ScrollView>
          </View>
        )}




        {/* ================== 5. CRM PORTAL (Sidebar Layout) ================== */}
        {activeTab === "crm" && (
          <View style={styles.splitLayout}>
            {/* Sidebar on the left */}
            {!crmSidebarCollapsed && (
              <View style={[styles.sidebar, darkMode && styles.sidebarDark]}>
                <TouchableOpacity 
                  onPress={() => setCrmSub("admissions")} 
                  style={[styles.sidebarTab, crmSub === "admissions" && styles.sidebarTabActive]}
                >
                  <Ionicons name="mail-outline" size={20} color={crmSub === "admissions" ? "#c62828" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, crmSub === "admissions" && styles.sidebarTabTxtActive]}>Inquiries</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setCrmSub("leads")} 
                  style={[styles.sidebarTab, crmSub === "leads" && styles.sidebarTabActive]}
                >
                  <Ionicons name="funnel-outline" size={20} color={crmSub === "leads" ? "#c62828" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, crmSub === "leads" && styles.sidebarTabTxtActive]}>Leads</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setCrmSub("campaigns")} 
                  style={[styles.sidebarTab, crmSub === "campaigns" && styles.sidebarTabActive]}
                >
                  <Ionicons name="megaphone-outline" size={20} color={crmSub === "campaigns" ? "#c62828" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, crmSub === "campaigns" && styles.sidebarTabTxtActive]}>Campaigns</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setCrmSub("feedback")} 
                  style={[styles.sidebarTab, crmSub === "feedback" && styles.sidebarTabActive]}
                >
                  <Ionicons name="star-outline" size={20} color={crmSub === "feedback" ? "#c62828" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, crmSub === "feedback" && styles.sidebarTabTxtActive]}>Feedbacks</Text>
                </TouchableOpacity>

                {/* Collapse Button */}
                <TouchableOpacity 
                  onPress={() => setCrmSidebarCollapsed(true)} 
                  style={{ marginTop: "auto", paddingVertical: 10, width: "100%", alignItems: "center" }}
                >
                  <Ionicons name="arrow-back-circle-outline" size={24} color="#c62828" />
                  <Text style={{ fontSize: 9, color: "#c62828", fontWeight: "bold", marginTop: 2 }}>Hide Menu</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Subpage Content on the right */}
            <View style={{ flex: 1, position: "relative" }}>
              {crmSidebarCollapsed && (
                <TouchableOpacity 
                  onPress={() => setCrmSidebarCollapsed(false)} 
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 10,
                    zIndex: 1000,
                    backgroundColor: "#ffffff",
                    borderRadius: 20,
                    padding: 8,
                    borderWidth: 1,
                    borderColor: "#e0e0e0",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2.5,
                    elevation: 4
                  }}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={20} color="#c62828" />
                  <Text style={{ fontSize: 10, fontWeight: "bold", color: "#c62828" }}>Show Menu</Text>
                </TouchableOpacity>
              )}
              <ScrollView style={[styles.splitContent, crmSidebarCollapsed && { paddingTop: 50 }]} contentContainerStyle={{ paddingBottom: 80 }}>
              {crmSub === "admissions" && (
                <View style={{ gap: 15 }}>
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Admissions Received</Text>
                    {/* Date Filter */}
                    <Text style={styles.label}>Filter by Date (YYYY-MM-DD):</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12, alignItems: "center" }}>
                      <TextInput style={[styles.input, { flex: 1, minWidth: 120, marginBottom: 0, height: 40 }]} placeholder="From Date" placeholderTextColor="#999" value={admissionDateFilter} onChangeText={setAdmissionDateFilter} />
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity onPress={() => loadAdmissions(admissionDateFilter)} style={[styles.primaryBtn, { minWidth: 60, paddingVertical: 0, paddingHorizontal: 12, height: 40, justifyContent: "center" }]}>
                          <Text style={[styles.primaryBtnTxt, { fontSize: 13 }]}>Filter</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setAdmissionDateFilter(""); loadAdmissions(); }} style={[styles.outlineBtn, { minWidth: 60, paddingVertical: 0, paddingHorizontal: 12, height: 40, justifyContent: "center" }]}>
                          <Text style={[styles.outlineBtnTxt, { fontSize: 13 }]}>Clear</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    {admissions.length === 0 ? (
                      <Text style={styles.emptyText}>No admissions inquiries logged.</Text>
                    ) : (
                      admissions.map(ad => (
                        <View key={ad.id} style={{ borderBottomWidth: 1, borderColor: "#eeeeee", paddingVertical: 10 }}>
                          <Text style={{ fontWeight: "bold", color: "#212121" }}>{ad.name}</Text>
                          <Text style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Phone: {ad.phone}{ad.email ? ` | Email: ${ad.email}` : ""}</Text>
                          <Text style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Course: {ad.preferredCourse || ad.course || "-"}{ad.city ? ` | Location: ${ad.city}` : ""}</Text>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                            <Text style={{ fontSize: 11, color: ad.status === "approved" ? "#2e7d32" : ad.status === "rejected" ? "#c62828" : "#f57c00", fontWeight: "bold" }}>
                              ● {(ad.status || "pending").toUpperCase()}
                            </Text>
                            <Text style={{ fontSize: 10, color: "#aaa" }}>{ad.createdAt ? new Date(ad.createdAt).toLocaleDateString() : ""}</Text>
                          </View>
                        </View>
                      ))

                    )}
                  </View>
                </View>
              )}

              {crmSub === "leads" && (
                <View style={{ gap: 15 }}>
                  {/* Send Notification to Leads */}
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Send Notification to Leads</Text>
                    <TextInput style={styles.input} placeholder="Notification Title" placeholderTextColor="#999" value={notifyMsg.title} onChangeText={t => setNotifyMsg({ ...notifyMsg, title: t })} />
                    <TextInput style={[styles.input, { height: 70, textAlignVertical: "top" }]} placeholder="Message..." placeholderTextColor="#999" multiline value={notifyMsg.message} onChangeText={m => setNotifyMsg({ ...notifyMsg, message: m })} />
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <TouchableOpacity onPress={() => { setSelectedLeadIds([]); sendLeadNotification(); }} style={[styles.primaryBtn, { flex: 1 }]}>
                        <Text style={styles.primaryBtnTxt}>Send to All Leads</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Guest Users Pipeline ({leads.length})</Text>
                    {leads.length === 0 ? (
                      <Text style={styles.emptyText}>No leads under pipeline tracking.</Text>
                    ) : (
                      leads.map(ld => (
                        <View key={ld.id} style={{ borderBottomWidth: 1, borderColor: "#eeeeee", paddingVertical: 10 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <Text style={{ fontWeight: "bold", color: "#212121" }}>{ld.name}</Text>
                            <Text style={{ fontSize: 11, color: ld.status === "converted" ? "#2e7d32" : "#f57c00", fontWeight: "bold" }}>
                              {ld.status === "converted" ? "Converted" : "Active Lead"}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Phone: {ld.phone}{ld.email ? ` | Email: ${ld.email}` : ""}</Text>
                          <Text style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Source: {ld.source || "Guest Login"}</Text>
                          {ld.courseInterest?.length > 0 && (
                            <Text style={{ fontSize: 11, color: "#1565c0", marginTop: 2 }}>
                              Interested in: {ld.courseInterest.map((c: any) => c.courseName).join(", ")}
                            </Text>
                          )}
                          <Text style={{ fontSize: 10, color: "#aaa", marginTop: 3 }}>{ld.registeredAt ? new Date(ld.registeredAt).toLocaleDateString() : ""}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}


              {crmSub === "campaigns" && (
                <View style={{ gap: 15 }}>
                  {/* Create Campaign Card */}
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Launch Marketing Campaign</Text>
                    
                    <Text style={styles.label}>Campaign Title *</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. UPSC Prelims Crash Course Launch" 
                      placeholderTextColor="#999" 
                      value={newCampaign.title} 
                      onChangeText={t => setNewCampaign({ ...newCampaign, title: t })} 
                    />

                    <Text style={styles.label}>Campaign Message / Description</Text>
                    <TextInput 
                      style={[styles.input, { height: 60, textAlignVertical: "top" }]} 
                      placeholder="Enter details of the campaign offer or message..." 
                      placeholderTextColor="#999" 
                      multiline 
                      value={newCampaign.description} 
                      onChangeText={d => setNewCampaign({ ...newCampaign, description: d })} 
                    />

                    <Text style={styles.label}>Poster Image URL (Ad Banner)</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="https://example.com/banner.png" 
                      placeholderTextColor="#999" 
                      value={newCampaign.posterUrl} 
                      onChangeText={u => setNewCampaign({ ...newCampaign, posterUrl: u })} 
                    />

                    <Text style={styles.label}>Target User Segment *</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                      {[
                        { label: "All Users", value: "all" },
                        { label: "Free Users Only", value: "free" },
                        { label: "Paid Students Only", value: "paid" }
                      ].map(seg => (
                        <TouchableOpacity 
                          key={seg.value} 
                          onPress={() => setNewCampaign({ ...newCampaign, targetUsers: seg.value })} 
                          style={[styles.roleBtn, newCampaign.targetUsers === seg.value && styles.roleBtnActive, { flex: 1 }]}
                        >
                          <Text style={[styles.roleBtnTxt, newCampaign.targetUsers === seg.value && styles.roleBtnTxtActive, { fontSize: 11 }]}>
                            {seg.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Delivery Channels */}
                    <Text style={[styles.label, { marginTop: 4, fontWeight: "bold" }]}>Delivery Settings</Text>
                    
                    {/* Show in Dashboard toggle */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: "#eeeeee" }}>
                      <Text style={{ color: "#212121", fontSize: 13 }}>Show Ad Container in Dashboard</Text>
                      <TouchableOpacity 
                        onPress={() => setNewCampaign({ ...newCampaign, showInDashboard: !newCampaign.showInDashboard })} 
                        style={[styles.toggleTrack, newCampaign.showInDashboard && styles.toggleTrackOn]}
                      >
                        <View style={[styles.toggleThumb, newCampaign.showInDashboard && styles.toggleThumbOn]} />
                      </TouchableOpacity>
                    </View>

                    {newCampaign.showInDashboard && (
                      <View style={{ marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#c62828" }}>
                        <Text style={styles.label}>Ad Container Placement Location:</Text>
                        <View style={{ flexDirection: "row", gap: 8, marginVertical: 6 }}>
                          {[
                            { label: "Guest Home", value: "free_home" },
                            { label: "Student Dash", value: "paid_dashboard" },
                            { label: "Both Placement", value: "both" }
                          ].map(loc => (
                            <TouchableOpacity 
                              key={loc.value} 
                              onPress={() => setNewCampaign({ ...newCampaign, posterDisplay: loc.value })} 
                              style={[styles.roleBtn, newCampaign.posterDisplay === loc.value && styles.roleBtnActive, { flex: 1 }]}
                            >
                              <Text style={[styles.roleBtnTxt, newCampaign.posterDisplay === loc.value && styles.roleBtnTxtActive, { fontSize: 10 }]}>
                                {loc.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* Send Notification toggle */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, marginTop: 4 }}>
                      <Text style={{ color: "#212121", fontSize: 13 }}>Send Push Notification</Text>
                      <TouchableOpacity 
                        onPress={() => setNewCampaign({ ...newCampaign, sendNotification: !newCampaign.sendNotification })} 
                        style={[styles.toggleTrack, newCampaign.sendNotification && styles.toggleTrackOn]}
                      >
                        <View style={[styles.toggleThumb, newCampaign.sendNotification && styles.toggleThumbOn]} />
                      </TouchableOpacity>
                    </View>

                    {newCampaign.sendNotification && (
                      <View style={{ marginTop: 10, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: "#2e7d32" }}>
                        <Text style={styles.label}>Custom Notification Alert Message</Text>
                        <TextInput 
                          style={styles.input} 
                          placeholder="If left blank, title will be used" 
                          placeholderTextColor="#999" 
                          value={newCampaign.notificationMessage} 
                          onChangeText={n => setNewCampaign({ ...newCampaign, notificationMessage: n })} 
                        />
                      </View>
                    )}

                    <TouchableOpacity onPress={saveCampaign} style={[styles.primaryBtn, { marginTop: 15 }]}>
                      <Text style={styles.primaryBtnTxt}>Publish Campaign Broadcast</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Active Campaigns Log Card */}
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Campaign Broadcasts Logs ({campaigns.length})</Text>
                    {campaigns.length === 0 ? (
                      <Text style={styles.emptyText}>No marketing campaigns sent.</Text>
                    ) : (
                      campaigns.map(cp => (
                        <View key={cp.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eeeeee" }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                              <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 14 }}>{cp.title}</Text>
                              {cp.description ? <Text style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{cp.description}</Text> : null}
                            </View>
                            <TouchableOpacity onPress={() => deleteCampaign(cp.id)} style={{ padding: 4 }}>
                              <Ionicons name="trash-outline" size={18} color="#c62828" />
                            </TouchableOpacity>
                          </View>
                          
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            <View style={{ backgroundColor: "#f5f5f5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, color: "#616161" }}>Target: {cp.targetUsers.toUpperCase()}</Text>
                            </View>
                            {cp.showInDashboard && (
                              <View style={{ backgroundColor: "#e3f2fd", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, color: "#1565c0" }}>Ad Container: {cp.posterDisplay}</Text>
                              </View>
                            )}
                            {cp.sendNotification && (
                              <View style={{ backgroundColor: "#e8f5e9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                                <Text style={{ fontSize: 10, color: "#2e7d32" }}>Notification: Yes</Text>
                              </View>
                            )}
                          </View>

                          {cp.posterUrl ? (
                            <View style={{ marginTop: 8, borderRadius: 6, overflow: "hidden" }}>
                              <Image source={{ uri: cp.posterUrl }} style={{ width: "100%", height: 80, resizeMode: "cover" }} />
                            </View>
                          ) : null}

                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                            <Text style={{ fontSize: 10, color: cp.isActive ? "#2e7d32" : "#757575", fontWeight: "bold" }}>
                              ● {cp.isActive ? "ACTIVE" : "INACTIVE"}
                            </Text>
                            <Text style={{ fontSize: 10, color: "#aaa" }}>
                              Sent: {cp.createdAt ? new Date(cp.createdAt).toLocaleDateString() : ""}
                            </Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}

              {crmSub === "feedback" && (
                <View style={{ gap: 15 }}>
                  <View style={styles.card}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                      <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Student Feedbacks Received ({feedbacks.length})</Text>
                      <TouchableOpacity onPress={loadFeedback} style={{ padding: 4 }}>
                        <Ionicons name="refresh" size={20} color="#c62828" />
                      </TouchableOpacity>
                    </View>
                    {feedbacks.length === 0 ? (
                      <Text style={styles.emptyText}>No student feedbacks logged.</Text>
                    ) : (
                      feedbacks.map(f => (
                        <View key={f.id} style={{ borderBottomWidth: 1, borderColor: "#eeeeee", paddingVertical: 10 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            <View>
                              <Text style={{ fontWeight: "bold", color: "#212121" }}>{f.name}</Text>
                              <Text style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>
                                Type: {f.batch || "Student"}
                              </Text>
                            </View>
                            <Text style={{ color: "#FFA000" }}>{"★".repeat(f.rating || 5)}</Text>
                          </View>
                          <Text style={{ fontSize: 13, marginTop: 6, color: "#212121", fontStyle: "italic" }}>
                            "{f.feedback || f.comments || ""}"
                          </Text>
                          {f.createdAt && (
                            <Text style={{ fontSize: 10, color: "#aaa", marginTop: 6, textAlign: "right" }}>
                              {(() => {
                                try {
                                  const rawDate = f.createdAt.toDate ? f.createdAt.toDate() : f.createdAt;
                                  const d = new Date(rawDate);
                                  return isNaN(d.getTime()) ? "" : "Submitted: " + d.toLocaleDateString();
                                } catch (e) {
                                  return "";
                                }
                              })()}
                            </Text>
                          )}
                        </View>
                      ))
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
      </View>

      {/* Bottom Tab Bar */}
      <View style={[styles.bottomTabBar, darkMode && styles.bottomTabBarDark]}>
        <TouchableOpacity 
          onPress={() => { setActiveTab("dashboard"); loadTodayQuiz(); }} 
          style={[styles.bottomTab, activeTab === "dashboard" && styles.bottomTabSelected, activeTab === "dashboard" && darkMode && styles.sidebarTabActiveDark]}
        >
          <Ionicons 
            name={activeTab === "dashboard" ? "home" : "home-outline"} 
            size={22} 
            color={activeTab === "dashboard" ? "#c62828" : darkMode ? "#555" : "#757575"} 
          />
          <Text style={[styles.bottomTabLabel, activeTab === "dashboard" && styles.bottomTabLabelActive, !( activeTab === "dashboard") && darkMode && styles.bottomTabLabelDark]}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab("test")} 
          style={[styles.bottomTab, activeTab === "test" && styles.bottomTabSelected, activeTab === "test" && darkMode && styles.sidebarTabActiveDark]}
        >
          <Ionicons 
            name={activeTab === "test" ? "document-text" : "document-text-outline"} 
            size={22} 
            color={activeTab === "test" ? "#c62828" : darkMode ? "#555" : "#757575"} 
          />
          <Text style={[styles.bottomTabLabel, activeTab === "test" && styles.bottomTabLabelActive, !(activeTab === "test") && darkMode && styles.bottomTabLabelDark]}>Test Portal</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab("erp")} 
          style={[styles.bottomTab, activeTab === "erp" && styles.bottomTabSelected, activeTab === "erp" && darkMode && styles.sidebarTabActiveDark]}
        >
          <Ionicons 
            name={activeTab === "erp" ? "grid" : "grid-outline"} 
            size={22} 
            color={activeTab === "erp" ? "#c62828" : darkMode ? "#555" : "#757575"} 
          />
          <Text style={[styles.bottomTabLabel, activeTab === "erp" && styles.bottomTabLabelActive, !(activeTab === "erp") && darkMode && styles.bottomTabLabelDark]}>ERP</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => setActiveTab("lms")} 
          style={[styles.bottomTab, activeTab === "lms" && styles.bottomTabSelected, activeTab === "lms" && darkMode && styles.sidebarTabActiveDark]}
        >
          <Ionicons 
            name={activeTab === "lms" ? "book" : "book-outline"} 
            size={22} 
            color={activeTab === "lms" ? "#c62828" : darkMode ? "#555" : "#757575"} 
          />
          <Text style={[styles.bottomTabLabel, activeTab === "lms" && styles.bottomTabLabelActive, !(activeTab === "lms") && darkMode && styles.bottomTabLabelDark]}>LMS</Text>
        </TouchableOpacity>

        {(user.role === "admin" || user.role === "staff") && (
          <TouchableOpacity 
            onPress={() => setActiveTab("crm")} 
            style={[styles.bottomTab, activeTab === "crm" && styles.bottomTabSelected, activeTab === "crm" && darkMode && styles.sidebarTabActiveDark]}
          >
            <Ionicons 
              name={activeTab === "crm" ? "people" : "people-outline"} 
              size={22} 
              color={activeTab === "crm" ? "#c62828" : darkMode ? "#555" : "#757575"} 
            />
            <Text style={[styles.bottomTabLabel, activeTab === "crm" && styles.bottomTabLabelActive, !(activeTab === "crm") && darkMode && styles.bottomTabLabelDark]}>CRM</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modal containers removed and handled via top-level returns */}

      {/* ────────────────── Admin Live Test Monitor & Leaderboard Modal ────────────────── */}
      {selectedMonitorTestId && (
        <Modal visible={true} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <View style={[styles.header, { backgroundColor: "#c62828" }]}>
              <Text style={styles.headerTitle}>Live Proctoring & Leaderboard</Text>
              <TouchableOpacity onPress={() => { setSelectedMonitorTestId(""); setLiveCount(null); setLeaderboard([]); }} style={{ padding: 8 }}>
                <Ionicons name="close-circle-outline" size={26} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 15, backgroundColor: "#ffebee", borderBottomWidth: 1, borderColor: "#ffcdd2" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: "#c62828" }}>
                    Live Attending: {liveCount?.liveCount ?? 0} Students
                  </Text>
                  <Text style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                    Completed: {liveCount?.submittedCount ?? 0} | Total: {liveCount?.totalAttempts ?? 0}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => monitorTest(selectedMonitorTestId)} style={{ backgroundColor: "#c62828", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                  <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 11 }}>Refresh</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ flex: 1, backgroundColor: "#ffffff" }} contentContainerStyle={{ padding: 15 }}>
              <Text style={{ fontSize: 15, fontWeight: "bold", color: "#212121", marginBottom: 10 }}>
                Test Leaderboard (Highest to Lowest)
              </Text>

              {leaderboard.length === 0 ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <Ionicons name="trophy-outline" size={36} color="#757575" />
                  <Text style={{ color: "#757575", marginTop: 10 }}>No completed attempts yet.</Text>
                </View>
              ) : (
                <View style={{ borderTopWidth: 1, borderColor: "#eee" }}>
                  {leaderboard.map((entry: any, index: number) => {
                    const studentObj = students.find((s: any) => s.id === entry.studentId || s.userId === entry.studentId);
                    const studentName = studentObj ? `${studentObj.firstName} ${studentObj.lastName}` : `Student (${entry.studentId})`;
                    
                    return (
                      <View key={entry.id || index} style={{ 
                        flexDirection: "row", 
                        alignItems: "center", 
                        paddingVertical: 12, 
                        borderBottomWidth: 1, 
                        borderColor: "#eee" 
                      }}>
                        <Text style={{ width: 30, fontWeight: "bold", color: index === 0 ? "#fbc02d" : "#757575", fontSize: 14 }}>
                          #{index + 1}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "bold", color: "#212121" }}>{studentName}</Text>
                          <Text style={{ fontSize: 11, color: "#757575" }}>Status: {entry.status}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontWeight: "bold", color: "#2e7d32", fontSize: 14 }}>
                            {entry.obtainedMarks} / {entry.totalMarks}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#757575" }}>
                            {Math.round(entry.percentage)}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  authContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    justifyContent: "center",
    alignItems: "center",
  },
  authCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  authTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#c62828",
    textAlign: "center",
    marginBottom: 4,
  },
  authSubtitle: {
    fontSize: 13,
    color: "#757575",
    textAlign: "center",
    marginBottom: 24,
  },
  ipConfigBox: {
    backgroundColor: "#ffebee",
    borderWidth: 1,
    borderColor: "#c62828",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  ipConfigLabel: {
    fontSize: 11,
    color: "#c62828",
    fontWeight: "bold",
    marginBottom: 6,
  },
  ipSaveBtn: {
    backgroundColor: "#c62828",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  authTabs: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 4,
    marginBottom: 20,
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  authTabBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  authTabTxt: {
    fontSize: 14,
    fontWeight: "600",
    color: "#757575",
  },
  authTabTxtActive: {
    color: "#c62828",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fcfcfc",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#212121",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#757575",
    marginBottom: 6,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingVertical: 6,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#fcfcfc",
  },
  roleBtnActive: {
    backgroundColor: "#ffebee",
    borderColor: "#c62828",
  },
  roleBtnTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: "#757575",
  },
  roleBtnTxtActive: {
    color: "#c62828",
  },
  primaryBtn: {
    backgroundColor: "#c62828",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  primaryBtnTxt: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    textAlign: "center",
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: "#c62828",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnTxt: {
    fontSize: 12,
    color: "#c62828",
    fontWeight: "bold",
  },
  demoBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#c62828",
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  demoBtnTxt: {
    fontSize: 12,
    color: "#c62828",
    fontWeight: "bold",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerDark: {
    backgroundColor: "#1a1a1a",
    borderBottomColor: "#2a2a2a",
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#ffebee",
    borderWidth: 1.5,
    borderColor: "#c62828",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#212121",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 9,
  },
  hamburgerLine: {
    height: 2,
    width: 22,
    backgroundColor: "#424242",
    borderRadius: 2,
  },
  logoutBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logoutBtnTxt: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "bold",
  },
  drawerPanel: {
    width: 300,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  drawerPanelDark: {
    backgroundColor: "#1e1e1e",
  },
  drawerHeader: {
    backgroundColor: "#c62828",
    paddingTop: 55,
    paddingBottom: 25,
    paddingHorizontal: 20,
    alignItems: "flex-start",
  },
  drawerHeaderDark: {
    backgroundColor: "#8b0000",
  },
  drawerAvatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
  },
  drawerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  drawerSection: {
    fontSize: 10,
    fontWeight: "800",
    color: "#9e9e9e",
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
  },
  drawerItemDark: {
    backgroundColor: "#1e1e1e",
  },
  drawerItemTxt: {
    fontSize: 14,
    fontWeight: "600",
    color: "#212121",
  },
  drawerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerDivider: {
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
    marginVertical: 8,
  },
  toggleTrack: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  toggleTrackOn: {
    backgroundColor: "#c62828",
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    alignSelf: "flex-start",
  },
  toggleThumbOn: {
    alignSelf: "flex-end",
  },
  feedbackSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
  },
  feedbackSheetDark: {
    backgroundColor: "#1e1e1e",
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212121",
  },
  mainBody: {
    flex: 1,
    backgroundColor: "#f4f4f8",
  },
  body: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  rectBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: "transparent",
    marginBottom: 10,
  },
  rectTab: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  rectTabActive: {
    borderColor: "#c62828",
    backgroundColor: "#ffebee",
  },
  rectTabTxt: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#757575",
  },
  rectTabTxtActive: {
    color: "#c62828",
  },
  row: {
    flexDirection: "row",
    gap: 15,
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#f0f0f0",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardVal: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#c62828",
  },
  cardLbl: {
    fontSize: 12,
    color: "#757575",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#c62828",
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
    paddingBottom: 8,
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#c62828",
  },
  noticeContent: {
    fontSize: 13,
    color: "#212121",
    marginTop: 6,
    lineHeight: 18,
  },
  noticeMeta: {
    fontSize: 10,
    color: "#757575",
    marginTop: 8,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  th: {
    fontWeight: "bold",
    color: "#c62828",
  },
  idCard: {
    width: 260,
    borderWidth: 2,
    borderColor: "#c62828",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  idCardHeader: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#c62828",
    marginBottom: 12,
  },
  idCardAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#ffebee",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  idCardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#212121",
  },
  idCardMeta: {
    fontSize: 11,
    color: "#757575",
  },
  idBarcode: {
    marginTop: 15,
    backgroundColor: "#c62828",
    paddingHorizontal: 15,
    paddingVertical: 4,
    borderRadius: 4,
  },
  optionBtn: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fcfcfc",
  },
  optionBtnSelected: {
    backgroundColor: "#c62828",
    borderColor: "#c62828",
  },
  mockVideo: {
    height: 120,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#212121",
    marginTop: 8,
  },
  videoMeta: {
    fontSize: 11,
    color: "#757575",
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  modalOptionBtn: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: "#fcfcfc",
  },
  modalOptionBtnSelected: {
    backgroundColor: "#c62828",
    borderColor: "#c62828",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    color: "#757575",
    fontSize: 13,
  },
  // Professional Bottom Tab Bar
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    height: Platform.OS === "ios" ? 82 : 68,
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
    paddingBottom: Platform.OS === "ios" ? 20 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -3 },
    elevation: 8,
  },
  bottomTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 4,
  },
  bottomTabSelected: {
    backgroundColor: "#ffebee",
  },
  bottomTabLabel: {
    fontSize: 10,
    color: "#9e9e9e",
    fontWeight: "600",
    marginTop: 3,
  },
  bottomTabLabelActive: {
    color: "#c62828",
    fontWeight: "700",
  },
  // Split Layout for subpages with sidebar
  splitLayout: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 80,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderColor: "#e0e0e0",
    paddingVertical: 15,
    alignItems: "center",
    gap: 12,
  },
  sidebarTab: {
    width: 70,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  sidebarTabActive: {
    backgroundColor: "#ffebee",
  },
  sidebarTabTxt: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#757575",
    marginTop: 4,
    textAlign: "center",
  },
  sidebarTabTxtActive: {
    color: "#c62828",
  },
  splitContent: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 15,
  },

  // ============ Dark Mode Variants ============
  cardDark: {
    backgroundColor: "#1e1e1e",
    borderColor: "#2a2a2a",
  },
  inputDark: {
    backgroundColor: "#2a2a2a",
    borderColor: "#3a3a3a",
    color: "#e0e0e0",
  },
  sectionTitleDark: {
    color: "#ef9a9a",
    borderColor: "#2a2a2a",
  },
  labelDark: {
    color: "#9e9e9e",
  },
  bodyTextDark: {
    color: "#e0e0e0",
  },
  subTextDark: {
    color: "#9e9e9e",
  },
  bottomTabBarDark: {
    backgroundColor: "#1a1a1a",
    borderTopColor: "#2a2a2a",
  },
  bottomTabLabelDark: {
    color: "#616161",
  },
  sidebarDark: {
    backgroundColor: "#1a1a1a",
    borderRightColor: "#2a2a2a",
  },
  sidebarTabActiveDark: {
    backgroundColor: "#2a2a2a",
  },
  sidebarTabTxtDark: {
    color: "#9e9e9e",
  },
  splitContentDark: {
    backgroundColor: "#121212",
  },
  rectTabDark: {
    backgroundColor: "#1e1e1e",
    borderColor: "#333",
  },
  rectTabTxtDark: {
    color: "#9e9e9e",
  },
  noticeTitleDark: {
    color: "#ef9a9a",
  },
  noticeContentDark: {
    color: "#e0e0e0",
  },
  noticeMetaDark: {
    color: "#757575",
  },
  thDark: {
    color: "#ef9a9a",
  },
  tableRowDark: {
    borderBottomColor: "#2a2a2a",
  },
  emptyTextDark: {
    color: "#616161",
  },
  optionBtnDark: {
    backgroundColor: "#1e1e1e",
    borderColor: "#333",
  },
  roleBtnDark: {
    backgroundColor: "#1e1e1e",
    borderColor: "#333",
  },
  roleBtnTxtDark: {
    color: "#9e9e9e",
  },
});
