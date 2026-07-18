import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  useWindowDimensions
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

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

export default function App() {
  const { width: screenWidth } = useWindowDimensions();
  const isMobile = screenWidth < 768;
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("home");

  
    const [erpSub, setErpSub] = useState("students");
  const [lmsSub, setLmsSub] = useState("quiz");
  const [crmSub, setCrmSub] = useState("leads");
  const [darkMode, setDarkMode] = useState(false);
  const [hostIp, setHostIp] = useState(DEFAULT_HOST_IP);
  const hostIpRef = useRef(DEFAULT_HOST_IP);
  const [hostIpInput, setHostIpInput] = useState(DEFAULT_HOST_IP);
  const [loginForm, setLoginForm] = useState({ username: "", password: "", role: "student" });
  const [registerForm, setRegisterForm] = useState({ username: "", password: "", name: "", email: "", role: "student" });
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [profileRequests, setProfileRequests] = useState<any[]>([]);
  const [myProfileRequest, setMyProfileRequest] = useState<any | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const getStudentName = (s: any) => {
    if (!s) return "";
    const first = s.firstName || "";
    const last = s.lastName || "";
    const full = (first + " " + last).trim();
    return full || s.fullName || s.name || "";
  };
  const getLoggedInStudent = (userObj: any, studentList: any[]) => {
    if (!userObj || !studentList || studentList.length === 0) return null;
    return studentList.find((s: any) => {
      if (userObj.studentId && s.id === userObj.studentId) return true;
      if (userObj.username && s.rollNumber && String(s.rollNumber).toLowerCase() === String(userObj.username).toLowerCase()) return true;
      if (userObj.username && s.loginUsername && String(s.loginUsername).toLowerCase() === String(userObj.username).toLowerCase()) return true;
      if (userObj.userId && s.id === userObj.userId) return true;
      if (userObj.email && String(userObj.email).trim() !== "" && s.email && String(s.email).trim().toLowerCase() === String(userObj.email).trim().toLowerCase()) return true;
      if (userObj.phone && String(userObj.phone).trim() !== "" && s.phone && String(s.phone).trim() === String(userObj.phone).trim()) return true;
      return false;
    }) || null;
  };
  const [guestNotifications, setGuestNotifications] = useState<any[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [admissionSubmitted, setAdmissionSubmitted] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({ name: "", phone: "", email: "", city: "", preferredCourse: "UPSC GS" });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", priority: "normal", targetDashboard: "all", targetBatch: "" });
  const [newStudent, setNewStudent] = useState({ loginUsername: "", loginPassword: "", batch: "", course: "", type: "offline", totalFees: "", feesPaid: "", joiningDate: "", firstName: "", lastName: "", email: "", phone: "", rollNumber: "", admissionNumber: "", dob: "", attendedDays: "", totalDays: "" });
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [feeEditStudent, setFeeEditStudent] = useState<any | null>(null);
  const [feeFilterStatus, setFeeFilterStatus] = useState<"all" | "pending" | "paid">("all");
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<any>({});
  const [showDrawer, setShowDrawer] = useState(false);
  const [todayQuiz, setTodayQuiz] = useState<any>(null);
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [activeAttempt, setActiveAttempt] = useState<any>(null);
  const [examEndTime, setExamEndTime] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [showIpConfig, setShowIpConfig] = useState(false);
  const [showHamburger, setShowHamburger] = useState(false);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", dob: "", bloodGroup: "", address: "", passportPhotoBase64: "", photoIdBase64: "", photoIdType: "Aadhar" });
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>("Preview");
  const [editingStaff, setEditingStaff] = useState<any | null>(null);
  const [authTab, setAuthTab] = useState<"login" | "register" | "guest">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestTab, setGuestTab] = useState<string>("home");
  const [noticeTab, setNoticeTab] = useState<"notices" | "notifications">("notices");
  const [searchNoticeQuery, setSearchNoticeQuery] = useState("");
  const [searchNoticeDate, setSearchNoticeDate] = useState("");
  const [pdfFilename, setPdfFilename] = useState("");
  const [akFilename, setAkFilename] = useState("");
  const [newNotification, setNewNotification] = useState({ title: "", message: "", targetGroup: "all", targetBatch: "" });
  const [newNotice, setNewNotice] = useState({ title: "", content: "", priority: "normal", publishedAt: "", targetDashboard: "all", targetBatch: "" });
  const [showTargetDropdown, setShowTargetDropdown] = useState(false);
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [selectedDirectoryStudent, setSelectedDirectoryStudent] = useState<any | null>(null);
  const [showBatchFilterDropdown, setShowBatchFilterDropdown] = useState(false);
  const [showTypeFilterDropdown, setShowTypeFilterDropdown] = useState(false);
  const [searchDirQuery, setSearchDirQuery] = useState("");
  const [filterDirBatch, setFilterDirBatch] = useState("all");
  const [filterDirType, setFilterDirType] = useState("all");
  const [newBatch, setNewBatch] = useState({ batchName: "", course: "", description: "" });
  const [showTestBatchDropdown, setShowTestBatchDropdown] = useState(false);
  const [showManualTestBatchDropdown, setShowManualTestBatchDropdown] = useState(false);
  const [newPdfTest, setNewPdfTest] = useState(() => {
    const start = new Date(Date.now() + 15 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const startStr = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-" + String(start.getDate()).padStart(2, "0") + "T" + String(start.getHours()).padStart(2, "0") + ":" + String(Math.floor(start.getMinutes() / 5) * 5).padStart(2, "0");
    const endStr = end.getFullYear() + "-" + String(end.getMonth() + 1).padStart(2, "0") + "-" + String(end.getDate()).padStart(2, "0") + "T" + String(end.getHours()).padStart(2, "0") + ":" + String(Math.floor(end.getMinutes() / 5) * 5).padStart(2, "0");
    return { title: "", startTime: startStr, endTime: endStr, marksPerQ: "1", negMarks: "0.33", unattendedMarks: "0", totalMarks: "", targetAudience: "all", targetBatch: "" };
  });
  const [pdfBase64, setPdfBase64] = useState("");
  const [akBase64, setAkBase64] = useState("");
  const [devTab, setDevTab] = useState("collections");
  const [devCollections, setDevCollections] = useState<any[]>([]);
  const [devCollectionSearch, setDevCollectionSearch] = useState("");
  const [devSelectedDoc, setDevSelectedDoc] = useState<any | null>(null);
  const [devSelectedDocId, setDevSelectedDocId] = useState<string | null>("");
  const [devDocs, setDevDocs] = useState<any[]>([]);
  const [devDocsLoading, setDevDocsLoading] = useState(false);
  const [devEditMode, setDevEditMode] = useState<"view" | "edit" | "create" | "query">("view");
  const [devEditJson, setDevEditJson] = useState("");
  const [devNewDocJson, setDevNewDocJson] = useState("");
  const [devSearch, setDevSearch] = useState("");
  const [devActiveCollection, setDevActiveCollection] = useState("");
  const [devOffset, setDevOffset] = useState(0);
  const [devLimit, setDevLimit] = useState(20);
  const [devQueryField, setDevQueryField] = useState("");
  const [devQueryValue, setDevQueryValue] = useState("");
  const [devQueryOp, setDevQueryOp] = useState("");
  const [devQueryResults, setDevQueryResults] = useState<any[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [extractMode, setExtractMode] = useState<"auto" | "local" | "ai">("auto");
  const [extractDraftId, setExtractDraftId] = useState<string | null>(null);
  const [pdfExtractText, setPdfExtractText] = useState("");
  const [genMode, setGenMode] = useState<"file" | "text">("file");
  const [editingNotice, setEditingNotice] = useState<any | null>(null);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [editingQData, setEditingQData] = useState<any | null>(null);
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null);
  const [activePermissionRole, setActivePermissionRole] = useState("");
  const [lmsTabsCollapsed, setLmsTabsCollapsed] = useState(true);
  const [erpSidebarCollapsed, setErpSidebarCollapsed] = useState(true);
  const [crmSidebarCollapsed, setCrmSidebarCollapsed] = useState(true);
  const [testTabsCollapsed, setTestTabsCollapsed] = useState(true);
  const changeErpSub = (sub: string) => {
    setErpSub(sub);
    setErpSidebarCollapsed(true);
  };
  const changeLmsSub = (sub: string) => {
    setLmsSub(sub);
    setLmsTabsCollapsed(true);
  };
  const changeCrmSub = (sub: string) => {
    setCrmSub(sub);
    setCrmSidebarCollapsed(true);
  };
  const [testSub, setTestSub] = useState("available");
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [selectedMonitorTestId, setSelectedMonitorTestId] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [reviewData, setReviewData] = useState<any | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [attemptQuestions, setAttemptQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [notifyMsg, setNotifyMsg] = useState({ title: "", message: "" });
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackName, setFeedbackName] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [admissionDateFilter, setAdmissionDateFilter] = useState("");
  const [resultsKeyword, setResultsKeyword] = useState("");
  const [resultsDateFilter, setResultsDateFilter] = useState("");
  const [resultsLoading, setResultsLoading] = useState(false);
  const [allTestResults, setAllTestResults] = useState<any[]>([]);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [liveCount, setLiveCount] = useState<any | null>(null);
  const [guestEmailGateVisible, setGuestEmailGateVisible] = useState(false);
  const [guestEmailGateInput, setGuestEmailGateInput] = useState("");
  const [guestEmailGatePendingTab, setGuestEmailGatePendingTab] = useState<string | null>("");
  const [guestEmailUnlocked, setGuestEmailUnlocked] = useState(false);
  const [showGuestHallTicketModal, setShowGuestHallTicketModal] = useState(false);

  const getBaseUrl = () => `http://${hostIpRef.current || DEFAULT_HOST_IP}:5000/api`;
  const extractionAbortRef = useRef<AbortController | null>(null);

  const api = useRef({
    async get(path: string, headers?: any) {
      const baseUrl = getBaseUrl();
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          headers: { "Content-Type": "application/json", ...headers },
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    },
    async post(path: string, body: any, headers?: any, customTimeout?: number) {
      const baseUrl = getBaseUrl();
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), customTimeout || API_TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    },
    async put(path: string, body: any, headers?: any) {
      const baseUrl = getBaseUrl();
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    },
    async patch(path: string, body: any, headers?: any) {
      const baseUrl = getBaseUrl();
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    },
    async delete(path: string, headers?: any) {
      const baseUrl = getBaseUrl();
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", ...headers },
          signal: controller.signal
        });
        clearTimeout(id);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        return data.data !== undefined ? data.data : data;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    }
  }).current;

  const [calendarTarget, setCalendarTarget] = useState<"newStudent" | "editingStudent" | "profileForm">("newStudent");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"days" | "months" | "years">("days");

  const [newStaff, setNewStaff] = useState({ firstName: "", lastName: "", employeeId: "", designation: "Faculty", department: "Polity", email: "", phone: "", loginUsername: "", loginPassword: "", role: "admin" });

  // Permissions Helpers
  const getPermission = (feature: string): string => {
    if (user?.role === "developer") return "CRUD";
    if (!rolePermissions || !user?.role) return "CRUD"; // Default fallback
    const roleKey = user.role;
    return rolePermissions[roleKey]?.[feature] || "CRUD";
  };

  const hasPermission = (feature: string, action: "C" | "R" | "U" | "D"): boolean => {
    if (user?.role === "developer" || user?.role === "super_admin") return true;
    const perm = getPermission(feature);
    if (action === "C") return perm.includes("C");
    if (action === "R") return perm.includes("R");
    if (action === "U") return perm.includes("U");
    if (action === "D") {
      return perm.includes("D") || perm === "Delete but approval required from super admin";
    }
    return false;
  };

  const executeDelete = (feature: string, docId: string, deleteCallback: () => void) => {
    if (user?.role === "developer" || user?.role === "super_admin") {
      deleteCallback();
      return;
    }
    const perm = getPermission(feature);
    if (perm === "CRUD") {
      deleteCallback();
    } else if (perm === "Delete but approval required from super admin") {
      Alert.alert(
        "Approval Required",
        "Your role requires Super Admin approval to delete this item. Submit deletion request?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Submit Request",
            onPress: () => {
              Alert.alert("Request Submitted", "Delete request submitted successfully to Super Admin.");
              // Send a notification/log to firestore
              api.post("/developer/collection/notifications", {
                type: "delete_approval",
                feature,
                docId,
                requestedBy: user.username,
                status: "pending",
                createdAt: new Date().toISOString()
              }).catch(() => { });
            }
          }
        ]
      );
    } else {
      Alert.alert("Permission Denied", "You do not have permission to delete items in this section.");
    }
  };
  const [newQuestion, setNewQuestion] = useState({ question: "", optA: "", optB: "", optC: "", optD: "", answer: "A", explanation: "" });
  const [newTest, setNewTest] = useState(() => {
    const start = new Date(Date.now() + 15 * 60 * 1000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const startStr = start.getFullYear() + "-" + String(start.getMonth() + 1).padStart(2, "0") + "-" + String(start.getDate()).padStart(2, "0") + "T" + String(start.getHours()).padStart(2, "0") + ":" + String(Math.floor(start.getMinutes() / 5) * 5).padStart(2, "0");
    const endStr = end.getFullYear() + "-" + String(end.getMonth() + 1).padStart(2, "0") + "-" + String(end.getDate()).padStart(2, "0") + "T" + String(end.getHours()).padStart(2, "0") + ":" + String(Math.floor(end.getMinutes() / 5) * 5).padStart(2, "0");
    return { title: "", description: "", duration: "60", passingMarks: "5", startTime: startStr, endTime: endStr, selectedQIds: [] as string[], targetAudience: "all", targetBatch: "" };
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
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [generationMode, setGenerationMode] = useState<"individual" | "batch">("individual");
  const [selectedBatchForGen, setSelectedBatchForGen] = useState<string>("All Batches");
  const [bulkTargetGroup, setBulkTargetGroup] = useState<"all" | "paid" | "free">("all");
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  // ID Card & Hall Ticket Builder States
  const [cardSubTab, setCardSubTab] = useState<"idcard" | "hallticket">("idcard");
  const [myCardSubTab, setMyCardSubTab] = useState<"idcard" | "hallticket">("idcard");

  // ID Card Template values
  const [idCardExpiry, setIdCardExpiry] = useState("31/12/2026");
  const [idCardRole, setIdCardRole] = useState("IAS CANDIDATE");
  const [idCardTheme, setIdCardTheme] = useState("#c62828");

  // Hall Ticket Template values
  const [hallTicketExamName, setHallTicketExamName] = useState("UPSC Civil Services Prelims Mock");
  const [hallTicketExamDate, setHallTicketExamDate] = useState("24/05/2026");
  const [hallTicketVenue, setHallTicketVenue] = useState("NERMAI Academy Main Hall, Floor 2");
  const [hallTicketTime, setHallTicketTime] = useState("09:30 AM - 12:30 PM");
  const [hallTicketInstructions, setHallTicketInstructions] = useState("1. Bring printed copy of this Hall Ticket and original ID Proof.\n2. Standard blue/black ballpoint pen only.\n3. Electronic gadgets are strictly prohibited.");

  useEffect(() => {
    if (selectedIdStudent) {
      setIdCardExpiry(selectedIdStudent.idCardExpiry || "31/12/2026");
      setIdCardRole(selectedIdStudent.idCardRole || "IAS CANDIDATE");
      setIdCardTheme(selectedIdStudent.idCardTheme || "#c62828");

      setHallTicketExamName(selectedIdStudent.hallTicketExamName || "UPSC Civil Services Prelims Mock");
      setHallTicketExamDate(selectedIdStudent.hallTicketExamDate || "24/05/2026");
      setHallTicketVenue(selectedIdStudent.hallTicketVenue || "NERMAI Academy Main Hall, Floor 2");
      setHallTicketTime(selectedIdStudent.hallTicketTime || "09:30 AM - 12:30 PM");
      setHallTicketInstructions(selectedIdStudent.hallTicketInstructions || "1. Bring printed copy of this Hall Ticket and original ID Proof.\n2. Standard blue/black ballpoint pen only.\n3. Electronic gadgets are strictly prohibited.");
    }
  }, [selectedIdStudent]);

  const renderIDCard = (student: any, theme: string, role: string, expiry: string) => {
    const cardTheme = theme || "#c62828";
    const cardWidth = 260;
    const cardHeight = 380;
    const sidebarWidth = isMobile ? 0 : 80;
    const availableWidth = screenWidth - sidebarWidth - 40;
    const scale = availableWidth < cardWidth ? availableWidth / cardWidth : 1;

    return (
      <View style={{
        width: cardWidth * scale,
        height: cardHeight * scale,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        alignSelf: "center",
      }}>
        <View style={{
          width: cardWidth,
          height: cardHeight,
          transform: [{ scale: scale }],
          borderColor: cardTheme,
          borderWidth: 2,
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: 20,
          alignItems: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 12,
          elevation: 8,
          overflow: "hidden",
          position: "relative"
        }}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, backgroundColor: cardTheme }} />
          <Text style={[styles.idCardHeader, { color: cardTheme, marginTop: 5, letterSpacing: 0.5, fontWeight: "800" }]}>NERMAI IAS ACADEMY</Text>

          <View style={[styles.idCardAvatar, { backgroundColor: cardTheme + "15", overflow: "hidden", justifyContent: "center", alignItems: "center" }]}>
            {student.photoBase64 && student.photoBase64 !== "test" ? (
              <Image source={{ uri: student.photoBase64 }} style={{ width: 70, height: 70, borderRadius: 35 }} />
            ) : student.photoUrl ? (
              <Image source={{ uri: student.photoUrl }} style={{ width: 70, height: 70, borderRadius: 35 }} />
            ) : (
              <Ionicons name="person" size={40} color={cardTheme} />
            )}
          </View>

          <Text style={styles.idCardName}>{getStudentName(student)}</Text>
          <Text style={{ color: cardTheme, fontSize: 11, fontWeight: "bold", textTransform: "uppercase", marginBottom: 12, letterSpacing: 1 }}>{role || "IAS CANDIDATE"}</Text>

          <View style={{ width: "100%", borderTopWidth: 1, borderColor: "#eeeeee", paddingTop: 10, gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[styles.idCardMeta, { fontWeight: "600", fontSize: 11 }]}>Roll No:</Text>
              <Text style={[styles.idCardMeta, { color: "#212121", fontSize: 11 }]}>{student.rollNumber}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[styles.idCardMeta, { fontWeight: "600", fontSize: 11 }]}>Admission:</Text>
              <Text style={[styles.idCardMeta, { color: "#212121", fontSize: 11 }]}>{student.admissionNumber || student.id?.slice(0, 8)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[styles.idCardMeta, { fontWeight: "600", fontSize: 11 }]}>Batch:</Text>
              <Text style={[styles.idCardMeta, { color: "#212121", fontSize: 11 }]}>{student.batch || "General"}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={[styles.idCardMeta, { fontWeight: "600", fontSize: 11 }]}>Course:</Text>
              <Text style={[styles.idCardMeta, { color: "#212121", fontSize: 11 }]}>{student.course}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, borderTopWidth: 1, borderColor: "#f5f5f5", paddingTop: 4 }}>
              <Text style={[styles.idCardMeta, { fontWeight: "bold", color: "#d32f2f", fontSize: 11 }]}>Expiry Date:</Text>
              <Text style={[styles.idCardMeta, { fontWeight: "bold", color: "#d32f2f", fontSize: 11 }]}>{expiry || "31/12/2026"}</Text>
            </View>
          </View>

          <View style={[styles.idBarcode, { backgroundColor: cardTheme, marginTop: 15 }]}>
            <Text style={{ letterSpacing: 4, fontSize: 9, color: "#ffffff", fontWeight: "bold", fontFamily: "monospace" }}>* {student.rollNumber} *</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHallTicket = (student: any, examName: string, date: string, venue: string, time: string, instructions: string) => {
    const cardWidth = 340;
    const cardHeight = 480;
    const sidebarWidth = isMobile ? 0 : 80;
    const availableWidth = screenWidth - sidebarWidth - 40;
    const scale = availableWidth < cardWidth ? availableWidth / cardWidth : 1;

    const needsTwoPages = instructions && instructions.length > 180;

    const renderPageContent = (pageNumber: number) => {
      return (
        <View style={{
          width: cardWidth,
          height: cardHeight,
          borderWidth: 2,
          borderColor: "#424242",
          borderStyle: "dashed",
          borderRadius: 8,
          backgroundColor: "#fafafa",
          padding: 20,
          gap: 12,
          justifyContent: "space-between",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 3,
          position: "relative"
        }}>
          {pageNumber === 1 ? (
            <>
              <View style={{ gap: 10 }}>
                {/* Header */}
                <View style={{ alignItems: "center", borderBottomWidth: 1, borderColor: "#e0e0e0", paddingBottom: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: "#212121", letterSpacing: 0.5 }}>NERMAI IAS ACADEMY</Text>
                  <Text style={{ fontSize: 11, color: "#757575", fontWeight: "bold", marginTop: 2, letterSpacing: 2 }}>HALL TICKET / ADMIT CARD</Text>
                </View>

                {/* Candidate Details */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 15 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontSize: 10, color: "#757575", fontWeight: "bold" }}>CANDIDATE DETAILS</Text>
                    <Text style={{ fontSize: 14, fontWeight: "bold", color: "#212121" }}>{getStudentName(student)}</Text>
                    <Text style={{ fontSize: 11, color: "#424242" }}><Text style={{ fontWeight: "bold" }}>Roll No:</Text> {student.rollNumber}</Text>
                    <Text style={{ fontSize: 11, color: "#424242" }}><Text style={{ fontWeight: "bold" }}>Course:</Text> {student.course}</Text>
                    <Text style={{ fontSize: 11, color: "#424242" }}><Text style={{ fontWeight: "bold" }}>Batch:</Text> {student.batch || "General"}</Text>
                  </View>
                  <View style={{ width: 65, height: 75, borderWidth: 1.5, borderColor: "#bdbdbd", borderRadius: 4, backgroundColor: "#eeeeee", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
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
                  </View>
                </View>

                {/* Exam Details */}
                <View style={{ backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#e0e0e0", borderRadius: 6, padding: 12, gap: 6 }}>
                  <Text style={{ fontSize: 10, color: "#c62828", fontWeight: "bold" }}>EXAMINATION DETAILS</Text>
                  <Text style={{ fontSize: 12, fontWeight: "bold", color: "#212121" }}>{examName || "UPSC Mock Exam"}</Text>

                  <View style={{ flexDirection: "row", marginTop: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#616161", width: 80 }}>Date:</Text>
                    <Text style={{ fontSize: 11, color: "#212121", flex: 1 }}>{date || "24/05/2026"}</Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#616161", width: 80 }}>Time:</Text>
                    <Text style={{ fontSize: 11, color: "#212121", flex: 1 }}>{time || "09:30 AM - 12:30 PM"}</Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#616161", width: 80 }}>Venue:</Text>
                    <Text style={{ fontSize: 11, color: "#212121", flex: 1 }}>{venue || "Academy Campus"}</Text>
                  </View>
                </View>

                {/* Instructions Placeholder / Short Instructions */}
                {needsTwoPages ? (
                  <View style={{ gap: 4, padding: 8, backgroundColor: "#fffde7", borderWidth: 1, borderColor: "#fff59d", borderRadius: 6 }}>
                    <Text style={{ fontSize: 9, color: "#f57f17", fontWeight: "bold" }}>⚠️ IMPORTANT INSTRUCTIONS</Text>
                    <Text style={{ fontSize: 8, color: "#5d4037", fontWeight: "bold", lineHeight: 11 }}>Please refer to PAGE 2 for complete exam instructions, rules and code of conduct.</Text>
                  </View>
                ) : instructions ? (
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 10, color: "#757575", fontWeight: "bold" }}>IMPORTANT INSTRUCTIONS</Text>
                    <Text style={{ fontSize: 8, color: "#616161", lineHeight: 11 }} numberOfLines={4} selectable>{instructions}</Text>
                  </View>
                ) : null}
              </View>

              {/* Signatures */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: "#e0e0e0", paddingTop: 10 }}>
                <View style={{ alignItems: "center" }}>
                  <View style={{ height: 20 }} />
                  <Text style={{ fontSize: 9, color: "#757575" }}>Candidate's Signature</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <View style={{ height: 20 }} />
                  <Text style={{ fontSize: 9, color: "#757575" }}>Invigilator Signature</Text>
                </View>
              </View>

              {/* Page Indicator */}
              <View style={{ position: "absolute", bottom: 4, right: 10 }}>
                <Text style={{ fontSize: 8, color: "#9e9e9e", fontWeight: "bold" }}>{needsTwoPages ? "Page 1 of 2" : "Page 1 of 1"}</Text>
              </View>
            </>
          ) : (
            <>
              <View style={{ flex: 1, gap: 10 }}>
                {/* Page 2: Instructions Only */}
                <View style={{ alignItems: "center", borderBottomWidth: 1, borderColor: "#e0e0e0", paddingBottom: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: "bold", color: "#212121", letterSpacing: 0.5 }}>NERMAI IAS ACADEMY</Text>
                  <Text style={{ fontSize: 10, color: "#757575", fontWeight: "bold", marginTop: 2, letterSpacing: 1 }}>CANDIDATE INSTRUCTIONS (CONTINUED)</Text>
                </View>

                <View style={{ flex: 1, marginVertical: 4, gap: 6 }}>
                  <Text style={{ fontSize: 11, color: "#c62828", fontWeight: "bold" }}>RULES & CODE OF CONDUCT:</Text>
                  <ScrollView nestedScrollEnabled={true} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: "#424242", lineHeight: 13 }} selectable>{instructions}</Text>
                  </ScrollView>
                </View>
              </View>

              {/* Signatures repeated on Page 2 for official validation */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderColor: "#e0e0e0", paddingTop: 10 }}>
                <View style={{ alignItems: "center" }}>
                  <View style={{ height: 20 }} />
                  <Text style={{ fontSize: 9, color: "#757575" }}>Candidate's Signature</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <View style={{ height: 20 }} />
                  <Text style={{ fontSize: 9, color: "#757575" }}>Invigilator Signature</Text>
                </View>
              </View>

              {/* Page Indicator */}
              <View style={{ position: "absolute", bottom: 4, right: 10 }}>
                <Text style={{ fontSize: 8, color: "#9e9e9e", fontWeight: "bold" }}>Page 2 of 2</Text>
              </View>
            </>
          )}
        </View>
      );
    };

    if (needsTwoPages) {
      return (
        <View style={{ gap: 15, alignSelf: "center" }}>
          <View style={{
            width: cardWidth * scale,
            height: cardHeight * scale,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}>
            <View style={{ width: cardWidth, height: cardHeight, transform: [{ scale: scale }] }}>
              {renderPageContent(1)}
            </View>
          </View>
          <View style={{
            width: cardWidth * scale,
            height: cardHeight * scale,
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}>
            <View style={{ width: cardWidth, height: cardHeight, transform: [{ scale: scale }] }}>
              {renderPageContent(2)}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={{
        width: cardWidth * scale,
        height: cardHeight * scale,
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
        alignSelf: "center",
      }}>
        <View style={{
          width: cardWidth,
          height: cardHeight,
          transform: [{ scale: scale }],
        }}>
          {renderPageContent(1)}
        </View>
      </View>
    );
  };

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
              setGuestTab("home");

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
                const rawCamps = campJson.data || campJson || [];
                setCampaigns(rawCamps.filter((c: any) => {
                  const title = (c?.title || "").toLowerCase();
                  return !title.includes("state level test") && !title.includes("free entry");
                }));
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
      loadBatches();
      loadProfileRequests();
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
      loadRolePermissions();
      if (user.role && ["developer", "super_admin", "admin"].includes(user.role)) {
        loadPendingApprovals();
      }
    } else {
      loadAnnouncements();
      loadNotifications();
      loadGuestNotifications(user.leadId || user.userId || "");
      loadCampaigns();
      loadTests();
    }
    loadCourses();
  }, [user, hostIp]);

  // Auto-resolve student profile and load my profile request on login/data load
  useEffect(() => {
    if (!user || user.role !== "student" || students.length === 0) return;
    const myStudent = getLoggedInStudent(user, students);
    if (myStudent) {
      loadMyProfileRequest(myStudent.id);
    }
  }, [user, students]);

  useEffect(() => {
    if (showFeedbackModal && user) {
      setFeedbackName(user.name === "Guest" ? "" : (user.name || ""));
      setFeedbackEmail(user.email || "");
    }
  }, [showFeedbackModal, user]);

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
    setErpSidebarCollapsed(true);
    setLmsTabsCollapsed(true);
    setCrmSidebarCollapsed(true);
    setTestTabsCollapsed(true);
  }, [activeTab]);

  useEffect(() => {
    if (!user) return;
    if (erpSub === "students") {
      loadStudents();
      loadBatches();
    } else if (erpSub === "batch") {
      loadBatches();
    } else if (erpSub === "profile-requests") {
      loadProfileRequests();
    } else if (erpSub === "staff") {
      loadStaff();
    } else if (erpSub === "fees") {
      loadFees();
    } else if (erpSub === "approvals") {
      loadPendingApprovals();
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

  const [playedNoticeIds, setPlayedNoticeIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("played_notice_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const playNoticeSound = (priority: string) => {
    try {
      const url = priority === "high"
        ? "https://assets.mixkit.co/active_storage/sfx/911/911-500.wav"
        : "https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav";
      if (typeof Audio !== "undefined") {
        const audio = new Audio(url);
        audio.volume = 0.5;
        audio.play().catch(err => console.log("Audio play blocked by browser autoplay policy:", err));
      } else {
        console.log("Web Audio constructor is not available in this environment.");
      }
    } catch (e) {
      console.log("Audio error:", e);
    }
  };

  // API Call Loaders
  const loadAnnouncements = async () => {
    try {
      const role = user?.role || "guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch || "";
      const res = await api.get(`/announcement?role=${role}&batch=${batch}`);
      const notices = res || [];
      setAnnouncements(notices);

      // Play sound for any newly retrieved notices
      if (notices.length > 0 && user) {
        let hasNewHigh = false;
        let hasNewNormal = false;
        const newlyPlayed: string[] = [];

        notices.forEach((n: any) => {
          if (!playedNoticeIds.includes(n.id)) {
            newlyPlayed.push(n.id);
            if (n.priority === "high") {
              hasNewHigh = true;
            } else {
              hasNewNormal = true;
            }
          }
        });

        if (newlyPlayed.length > 0) {
          setPlayedNoticeIds(prev => {
            const next = [...prev, ...newlyPlayed];
            try {
              localStorage.setItem("played_notice_ids", JSON.stringify(next));
            } catch { }
            return next;
          });

          if (hasNewHigh) {
            playNoticeSound("high");
          } else if (hasNewNormal) {
            playNoticeSound("normal");
          }
        }
      }
    } catch (e) {
      console.log("Failed loading announcements:", e);
      setAnnouncements([]);
    }
  };

  const loadNotifications = async () => {
    try {
      const role = user?.role || "guest";
      const myStudent = getLoggedInStudent(user, students);
      const batch = myStudent?.batch || "";
      const res = await api.get(`/notification?role=${role}&batch=${batch}`);
      setNotifications(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading notifications:", e);
      setNotifications([]);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await api.get("/erp/student");
      setStudents(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading students:", e);
      setStudents([]);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await api.get("/erp/batch");
      setBatches(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading batches:", e);
      setBatches([]);
    }
  };

  const loadProfileRequests = async () => {
    try {
      const res = await api.get("/erp/profile-request");
      setProfileRequests(res?.data || res || []);
    } catch (e) {
      console.log("Failed loading profile requests:", e);
      setProfileRequests([]);
    }
  };

  const loadMyProfileRequest = async (studentId: string) => {
    try {
      const res = await api.get(`/erp/profile-request/student/${studentId}`);
      setMyProfileRequest(res?.data || null);
    } catch (e) {
      console.log("Failed loading my profile request:", e);
    }
  };

  const loadRolePermissions = async () => {
    try {
      const res = await api.get("/developer/role-permissions");
      setRolePermissions(res?.data || res || {});
    } catch (e) {
      console.log("Failed loading role permissions:", e);
    }
  };

  const loadPendingApprovals = async () => {
    try {
      const res = await api.get("/developer/collection/notifications");
      const list = res?.data || res || [];
      // Support both structure types
      const rawList = Array.isArray(list) ? list : Array.isArray(list?.docs) ? list.docs : [];
      const filtered = rawList.filter((n: any) => n.type === "delete_approval" && n.status === "pending");
      setPendingApprovals(filtered);
    } catch (e) {
      console.log("Failed loading pending approvals:", e);
    }
  };

  const handleApproveDelete = async (item: any, callback?: () => void) => {
    Alert.alert("Confirm Deletion", `Are you sure you want to approve this request and permanently delete this document from collection '${item.feature}'?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve & Delete", style: "destructive", onPress: async () => {
          try {
            let collectionName = item.feature;
            if (collectionName === "quiz") collectionName = "questions";
            if (collectionName === "tests") collectionName = "tests";

            await api.delete(`/developer/collection/${collectionName}/${item.docId}`);

            await api.put(`/developer/collection/notifications/${item._id}`, {
              ...item,
              status: "approved",
              updatedAt: new Date().toISOString()
            });

            Alert.alert("Success", "Deletion request approved and document deleted.");
            loadPendingApprovals();
            if (callback) callback();
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to process approval");
          }
        }
      }
    ]);
  };

  const handleRejectDelete = async (item: any, callback?: () => void) => {
    Alert.alert("Confirm Reject", "Reject this deletion request?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject", style: "destructive", onPress: async () => {
          try {
            await api.put(`/developer/collection/notifications/${item._id}`, {
              ...item,
              status: "rejected",
              updatedAt: new Date().toISOString()
            });

            Alert.alert("Success", "Deletion request rejected.");
            loadPendingApprovals();
            if (callback) callback();
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to reject request");
          }
        }
      }
    ]);
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
      if (user?.role === "student") {
        const myStudent = getLoggedInStudent(user, students);
        const studentBatchName = myStudent?.batch || user?.batch || "";
        const filtered = allTests.filter((t: any) => {
          if (!t.published) return false;
          if (t.targetAudience === "all" || !t.targetAudience) return true;
          if (t.targetAudience === "paid") return true;
          if (t.targetAudience === "batch") {
            const tBatch = String(t.targetBatch || "").trim().toLowerCase();
            const sBatch = String(studentBatchName).trim().toLowerCase();
            return tBatch !== "" && sBatch !== "" && tBatch === sBatch;
          }
          return false;
        });
        setTests(filtered);
      } else if (user?.role === "guest") {
        setTests(allTests.filter((t: any) => t.published && (t.targetAudience === "free" || t.targetAudience === "all")));
      } else {
        setTests(allTests);
      }

      if (user && (user.role === "student" || user.role === "guest")) {
        try {
          const attemptsRes = await api.get(`/test-portal/review/history/${user.userId}`);
          setStudentAttempts(attemptsRes?.data || attemptsRes || []);
        } catch (err) {
          console.log("Failed to load user attempts:", err);
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
      const rawRes = res?.data || res || [];
      setCampaigns(rawRes.filter((c: any) => {
        const title = (c?.title || "").toLowerCase();
        return !title.includes("state level test") && !title.includes("free entry");
      }));
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
        const attemptAnswers = quiz.existingAttempt.answers || quiz.existingAttempt.results || [];
        const feedback = quiz.questions.map((q: any, idx: number) => {
          let ansObj = null;
          if (Array.isArray(attemptAnswers)) {
            ansObj = attemptAnswers.find((a: any) => a.questionIndex === idx);
          } else if (attemptAnswers && typeof attemptAnswers === "object") {
            ansObj = attemptAnswers[idx];
          }
          const userAnswer = ansObj ? (ansObj.selectedOptionIndex !== undefined ? ansObj.selectedOptionIndex : ansObj) : undefined;
          return {
            ...q,
            userAnswer
          };
        });
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
        const attemptAnswers = quiz.existingAttempt.answers || quiz.existingAttempt.results || [];
        const feedback = quiz.questions.map((q: any, idx: number) => {
          let ansObj = null;
          if (Array.isArray(attemptAnswers)) {
            ansObj = attemptAnswers.find((a: any) => a.questionIndex === idx);
          } else if (attemptAnswers && typeof attemptAnswers === "object") {
            ansObj = attemptAnswers[idx];
          }
          const userAnswer = ansObj ? (ansObj.selectedOptionIndex !== undefined ? ansObj.selectedOptionIndex : ansObj) : undefined;
          return {
            ...q,
            userAnswer
          };
        });
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
    if (!guestName.trim() || !guestPhone.trim() || !guestEmail.trim()) {
      Alert.alert("Required", "Please enter your Name, Phone Number, and Email Address.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
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
        userId: data.leadId,
        hallTicketGenerated: data.hallTicketGenerated || false,
        hallTicketExamName: data.hallTicketExamName || "",
        hallTicketExamDate: data.hallTicketExamDate || "",
        hallTicketVenue: data.hallTicketVenue || "",
        hallTicketTime: data.hallTicketTime || "",
        hallTicketInstructions: data.hallTicketInstructions || ""
      });
      setGuestEmailUnlocked(true);
      setAdmissionSubmitted(data.hasApplied || false);
      setGuestTab("home");
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
        published: true,
        targetAudience: newPdfTest.targetAudience || "all",
        targetBatch: newPdfTest.targetAudience === "batch" ? newPdfTest.targetBatch || "" : ""
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
      setNewPdfTest({ title: "", startTime: startStr, endTime: endStr, marksPerQ: "1", negMarks: "0.33", unattendedMarks: "0", totalMarks: "", targetAudience: "all", targetBatch: "" });
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

    // Developer portal shortcut — handled client-side + validated server-side
    if (u === "developer@unistrix" && p === "Unistrix@24252630") {
      try {
        const res = await api.post("/developer/login", { username: u, password: p });
        const devData = res.data || res;
        setUser({ role: "developer", name: "Unistrix Developer", username: u, userId: "dev_unistrix" });
        setActiveTab("dashboard");
      } catch (e: any) {
        Alert.alert("Dev Login Failed", e.message || "Could not authenticate developer.");
      }
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
        publishedAt: newNotice.publishedAt ? new Date(newNotice.publishedAt).toISOString() : new Date().toISOString(),
        createdBy: user.name,
        targetDashboard: newNotice.targetDashboard,
        targetBatch: newNotice.targetBatch || null
      });
      Alert.alert("Success", "Notice published successfully!");
      setNewNotice({ title: "", content: "", priority: "normal", publishedAt: "", targetDashboard: "all", targetBatch: "" });
      loadAnnouncements();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to publish announcement.");
    }
  };

  const deleteNotice = async (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this notice?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/announcement/${id}`);
            Alert.alert("Success", "Notice deleted successfully!");
            loadAnnouncements();
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete notice.");
          }
        }
      }
    ]);
  };

  const startEditingNotice = (notice: any) => {
    setEditingNoticeId(notice.id);
    setEditingNotice({
      title: notice.title,
      content: notice.content,
      priority: notice.priority || "normal",
      publishedAt: notice.publishedAt ? notice.publishedAt.split("T")[0] : new Date().toISOString().split("T")[0]
    });
  };

  const saveEditedNotice = async () => {
    if (!editingNotice.title || !editingNotice.content) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    try {
      await api.put(`/announcement/${editingNoticeId}`, {
        title: editingNotice.title,
        content: editingNotice.content,
        priority: editingNotice.priority,
        publishedAt: new Date(editingNotice.publishedAt).toISOString(),
        updatedBy: user?.name || "admin"
      });
      Alert.alert("Success", "Notice updated successfully!");
      setEditingNoticeId(null);
      loadAnnouncements();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update notice.");
    }
  };

  const sendBroadcastNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      Alert.alert("Error", "Please fill in title and message.");
      return;
    }
    if (newNotification.targetGroup === "batch" && !newNotification.targetBatch) {
      Alert.alert("Error", "Please select a target batch.");
      return;
    }
    setIsSendingNotification(true);
    try {
      await api.post("/notification", {
        title: newNotification.title,
        message: newNotification.message,
        targetGroup: newNotification.targetGroup,
        targetBatch: newNotification.targetBatch || null,
        sentBy: user?.name || "admin"
      });
      Alert.alert("Success", "Notification broadcasted successfully!");
      setNewNotification({ title: "", message: "", targetGroup: "all", targetBatch: "" });
      loadNotifications();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to broadcast notification.");
    } finally {
      setIsSendingNotification(false);
    }
  };

  const deleteNotification = async (id: string) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this notification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/notification/${id}`);
            Alert.alert("Success", "Notification deleted successfully!");
            loadNotifications();
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete notification.");
          }
        }
      }
    ]);
  };

  const createStudentRecord = async () => {
    if (!newStudent.loginUsername || !newStudent.loginPassword) {
      Alert.alert("Error", "Username (Roll Number) and Password are required.");
      return;
    }
    if (!newStudent.batch) {
      Alert.alert("Error", "Please select a batch.");
      return;
    }
    try {
      await api.post("/erp/student", { ...newStudent, createdBy: user.name });
      Alert.alert("Success", "Student registered successfully! They can now log in to complete their profile.");
      setNewStudent({ loginUsername: "", loginPassword: "", batch: "", course: "", type: "offline", totalFees: "", feesPaid: "", joiningDate: "", firstName: "", lastName: "", email: "", phone: "", rollNumber: "", admissionNumber: "", dob: "", attendedDays: "", totalDays: "" });
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save student profile.");
    }
  };

  const createBatch = async () => {
    if (!newBatch.batchName || !newBatch.course) {
      Alert.alert("Error", "Batch name and course are required.");
      return;
    }
    try {
      await api.post("/erp/batch", { ...newBatch, createdBy: user.name });
      Alert.alert("Success", "Batch created successfully!");
      setNewBatch({ batchName: "", course: "", description: "" });
      loadBatches();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create batch.");
    }
  };

  const deleteBatch = async (id: string) => {
    try {
      await api.delete(`/erp/batch/${id}`);
      Alert.alert("Success", "Batch deleted.");
      loadBatches();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to delete batch.");
    }
  };

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const openCalendar = (target: "newStudent" | "editingStudent" | "profileForm", initialDateStr?: string) => {
    setCalendarTarget(target);
    setCalendarView("days");
    let initialDate = new Date();
    if (initialDateStr) {
      const parsed = new Date(initialDateStr);
      if (!isNaN(parsed.getTime())) {
        initialDate = parsed;
      }
    }
    setCalendarDate(initialDate);
    setShowCalendar(true);
  };

  const handleSelectDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const formatted = `${yyyy}-${mm}-${dd}`;

    if (calendarTarget === "newStudent") {
      setNewStudent(prev => ({ ...prev, joiningDate: formatted }));
    } else if (calendarTarget === "editingStudent") {
      setEditingStudent((prev: any) => prev ? { ...prev, joiningDate: formatted } : null);
    } else if (calendarTarget === "profileForm") {
      setProfileForm(prev => ({ ...prev, dob: formatted }));
    }
    setShowCalendar(false);
  };

  const submitProfileCompletion = async () => {
    const myStudent = getLoggedInStudent(user, students);
    const rawCount = myStudent?.profileSubmitCount;
    const count = typeof rawCount === "number" ? rawCount : (rawCount && typeof rawCount === "object" && typeof (rawCount as any).__increment === "number") ? (rawCount as any).__increment : 0;
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
        studentId: myStudent?.id || user.studentId || user.userId,
        username: user.username,
        ...profileForm,
        passportPhotoBase64: profileForm.passportPhotoBase64 || "test",
        photoIdBase64: profileForm.photoIdBase64 || "test"
      });
      Alert.alert("Success", "Profile completion request submitted! Admin will review and approve soon.");
      setShowProfileModal(false);
      loadMyProfileRequest(myStudent?.id || user.studentId || user.userId);
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to submit profile.");
    }
  };

  const approveProfileRequest = async (id: string) => {
    try {
      await api.put(`/erp/profile-request/${id}/approve`, { reviewedBy: user.name });
      Alert.alert("Success", "Profile approved and student record updated!");
      loadProfileRequests();
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to approve.");
    }
  };

  const rejectProfileRequest = async (id: string, reason: string) => {
    try {
      await api.put(`/erp/profile-request/${id}/reject`, { reviewedBy: user.name, rejectionReason: reason });
      Alert.alert("Done", "Profile request rejected.");
      loadProfileRequests();
      loadStudents();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to reject.");
    }
  };

  const createStaffRecord = async () => {
    if (!["developer", "super_admin", "admin"].includes(user?.role)) {
      Alert.alert("Permission Denied", "You do not have permission to create admin accounts.");
      return;
    }
    try {
      await api.post("/erp/staff", { ...newStaff, createdBy: user.name });
      Alert.alert("Success", "Admin record saved!");
      setNewStaff({ firstName: "", lastName: "", employeeId: "", designation: "Faculty", department: "Polity", email: "", phone: "", loginUsername: "", loginPassword: "", role: "admin" });
      loadStaff();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save admin record.");
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
    executeDelete("students", id, performDelete);
  };

  const updateStaffRecord = async () => {
    if (!["developer", "super_admin", "admin"].includes(user?.role)) {
      Alert.alert("Permission Denied", "You do not have permission to update admin accounts.");
      return;
    }
    if (!editingStaff) return;
    try {
      await api.put(`/erp/staff/${editingStaff.id}`, editingStaff);
      Alert.alert("Success", "Admin record updated!");
      setEditingStaff(null);
      setShowStaffForm(false);
      loadStaff();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update admin profile.");
    }
  };

  const deleteStaffRecord = async (id: string) => {
    if (!["developer", "super_admin", "admin"].includes(user?.role)) {
      Alert.alert("Permission Denied", "You do not have permission to delete admin accounts.");
      return;
    }
    const performDelete = async () => {
      try {
        await api.delete(`/erp/staff/${id}`);
        Alert.alert("Success", "Admin record deleted.");
        loadStaff();
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to delete admin record.");
      }
    };
    if (typeof window !== "undefined" && window.confirm) {
      if (window.confirm("Are you sure you want to delete this admin record?")) {
        await performDelete();
      }
    } else {
      Alert.alert("Delete", "Are you sure you want to delete this admin record?", [
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
        createdBy: user.name,
        targetAudience: newTest.targetAudience || "all",
        targetBatch: newTest.targetAudience === "batch" ? newTest.targetBatch || "" : ""
      });
      Alert.alert("Success", "Mock Test created & published!");
      setNewTest({ title: "", description: "", duration: "60", passingMarks: "5", startTime: "", endTime: "", selectedQIds: [], targetAudience: "all", targetBatch: "" });
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
    if (!feedbackText.trim()) {
      Alert.alert("Input Error", "Message is mandatory. Please enter a message.");
      return;
    }

    try {
      const name = user?.name || "Anonymous";
      const email = user?.email || user?.username || user?.phone || "no-email@nermaiacademy.com";
      await api.post("/crm/alumni-feedback", {
        name,
        email,
        batch: user?.role === "student" ? "student" : "guest",
        rating: feedbackRating,
        feedback: feedbackText.trim()
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
      loadAllQuizzes();
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
      const attemptAnswers = res.answers || res.results || formattedAnswers;
      const feedback = todayQuiz.questions.map((q: any, idx: number) => {
        let ansObj = null;
        if (Array.isArray(attemptAnswers)) {
          ansObj = attemptAnswers.find((a: any) => a.questionIndex === idx);
        } else if (attemptAnswers && typeof attemptAnswers === "object") {
          ansObj = attemptAnswers[idx];
        }
        const userAnswer = ansObj ? (ansObj.selectedOptionIndex !== undefined ? ansObj.selectedOptionIndex : ansObj) : undefined;
        return {
          ...q,
          userAnswer
        };
      });
      setQuizFeedbackQuestions(feedback);
      Alert.alert("Quiz Completed!", `You scored ${res.correctCount} / ${res.totalQuestions}`);

      // Clear answers state for the next quiz
      setQuizAnswers({});

      // Reload quizzes list in the background
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
              loadAllQuizzes();
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


  // ================== DEVELOPER PORTAL ==================
  if (user?.role === "developer") {
    const devLoadCollections = async () => {
      try {
        const res = await api.get("/developer/collections");
        setDevCollections(res?.data || res || []);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to load collections");
      }
    };

    const devLoadDocs = async (col: string, offset = 0) => {
      if (!col) return;
      setDevDocsLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(devLimit), offset: String(offset) });
        if (devSearch) params.append("search", devSearch);
        const res = await api.get(`/developer/collection/${col}?${params.toString()}`);
        const data = res?.data || res;
        setDevDocs(Array.isArray(data?.docs) ? data.docs : Array.isArray(data) ? data : []);
        setDevOffset(offset);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to load documents");
      } finally {
        setDevDocsLoading(false);
      }
    };

    const devOpenDoc = async (docId: string) => {
      try {
        const res = await api.get(`/developer/collection/${devActiveCollection}/${docId}`);
        const doc = res?.data || res;
        setDevSelectedDoc(doc);
        setDevSelectedDocId(docId);
        setDevEditJson(JSON.stringify(doc, null, 2));
        setDevEditMode("view");
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to load document");
      }
    };

    const devSaveDoc = async () => {
      try {
        const parsed = JSON.parse(devEditJson);
        await api.put(`/developer/collection/${devActiveCollection}/${devSelectedDocId}`, parsed);
        Alert.alert("Success", "Document updated.");
        devLoadDocs(devActiveCollection, devOffset);
        setDevEditMode("view");
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to update — check JSON syntax.");
      }
    };

    const devCreateDoc = async () => {
      try {
        const parsed = JSON.parse(devNewDocJson);
        await api.post(`/developer/collection/${devActiveCollection}`, parsed);
        Alert.alert("Success", "Document created.");
        setDevNewDocJson("{\n  \n}");
        setDevEditMode("view");
        devLoadDocs(devActiveCollection, 0);
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to create — check JSON syntax.");
      }
    };

    const devDeleteDoc = (docId: string) => {
      Alert.alert("Confirm Delete", `Permanently delete document '${docId}'?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete", style: "destructive", onPress: async () => {
            try {
              await api.delete(`/developer/collection/${devActiveCollection}/${docId}`);
              Alert.alert("Deleted", "Document permanently removed.");
              setDevSelectedDoc(null);
              setDevSelectedDocId(null);
              devLoadDocs(devActiveCollection, devOffset);
            } catch (e: any) {
              Alert.alert("Error", e.message);
            }
          }
        }
      ]);
    };

    const devRunQuery = async () => {
      try {
        let parsedValue: any = devQueryValue;
        try { parsedValue = JSON.parse(devQueryValue); } catch { }
        const res = await api.post(`/developer/query/${devActiveCollection}`, {
          field: devQueryField, op: devQueryOp, value: parsedValue, limit: 100
        });
        setDevQueryResults((res?.data || res)?.docs || []);
      } catch (e: any) {
        Alert.alert("Query Error", e.message || "Query failed.");
      }
    };

    const filteredCollections = devCollections.filter(c =>
      c.name.toLowerCase().includes(devCollectionSearch.toLowerCase())
    );

    const COL_COLORS: any = {
      users: "#1565c0", students: "#2e7d32", staff: "#6a1b9a", tests: "#c62828",
      results: "#e65100", questions: "#00838f", campaigns: "#827717", admissions: "#4a148c",
      notifications: "#d32f2f", role_permissions: "#00c853"
    };

    const rolesList = [
      { key: "super_admin", label: "Super Admin", color: "#d32f2f" },
      { key: "admin", label: "Admin", color: "#1976d2" },
      { key: "editor", label: "Editor", color: "#f57c00" },
      { key: "contributor", label: "Contributor", color: "#388e3c" }
    ];

    const featuresList = [
      { key: "students", label: "Student Directory" },
      { key: "batches", label: "Batches & Courses" },
      { key: "announcements", label: "Announcements / Notices" },
      { key: "fees", label: "Tuition Fees / Ledger" },
      { key: "tests", label: "Mock Tests & Leaderboards" },
      { key: "quiz", label: "LMS Daily Practice Quiz" },
      { key: "id-card", label: "ID Card Generation" }
    ];

    const permissionOptions = [
      { key: "CRUD", label: "Full Access (CRUD)" },
      { key: "CRU only", label: "Create, Read, Update (CRU)" },
      { key: "CR only", label: "Create, Read (CR)" },
      { key: "U only", label: "Update Only (U)" },
      { key: "Delete but approval required from super admin", label: "Delete with Super Admin Approval" }
    ];

    const saveRolePermissionsFromDev = async () => {
      setIsSavingPermissions(true);
      try {
        const currentPerms = rolePermissions?.[activePermissionRole] || {};
        await api.put(`/developer/role-permissions/${activePermissionRole}`, currentPerms);
        Alert.alert("Success", `Permissions for ${rolesList.find(r => r.key === activePermissionRole)?.label} saved successfully!`);
        loadRolePermissions();
      } catch (e: any) {
        Alert.alert("Error", e.message || "Failed to save permissions.");
      } finally {
        setIsSavingPermissions(false);
      }
    };

    const updateFeaturePermissionFromDev = (featureKey: string, optionKey: string) => {
      setRolePermissions((prev: any) => ({
        ...prev,
        [activePermissionRole]: {
          ...(prev?.[activePermissionRole] || {}),
          [featureKey]: optionKey
        }
      }));
    };

    return (
      <SafeAreaView style={[styles.container, darkMode && { backgroundColor: "#121212" }]}>
        <StatusBar style={darkMode ? "light" : "dark"} />

        {/* Top Header replicating Admin Panel style */}
        <View style={[styles.header, darkMode && styles.headerDark]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={[styles.headerLogo, { backgroundColor: "transparent", borderWidth: 0 }]}>
              <Image source={require("./assets/logo.png")} style={{ width: 34, height: 34, borderRadius: 17 }} />
            </View>
            <View>
              <Text style={[styles.headerTitle, darkMode && { color: "#f5f5f5" }]}>Nermai IAS</Text>
              <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 10 }}>Developer Portal</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ backgroundColor: darkMode ? "rgba(46, 125, 50, 0.15)" : "#e8f5e9", borderWidth: 1, borderColor: "#2e7d32", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: "#2e7d32", fontSize: 10, fontWeight: "bold" }}>● DB ONLINE</Text>
            </View>
            <TouchableOpacity
              onPress={() => { setUser(null); setDevCollections([]); setDevDocs([]); setDevActiveCollection(""); }}
              style={[styles.primaryBtn, { paddingVertical: 6, paddingHorizontal: 12, marginBottom: 0, backgroundColor: "#c62828" }]}
            >
              <Text style={styles.primaryBtnTxt}>Exit Portal</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.splitLayout}>
          {/* LEFT SIDEBAR NAVIGATION replicating Admin Panel sidebar */}
          <View style={[styles.sidebar, darkMode && styles.sidebarDark]}>
            <TouchableOpacity
              onPress={() => { setDevTab("explorer"); devLoadCollections(); }}
              style={[styles.sidebarTab, devTab === "explorer" && (darkMode ? styles.sidebarTabActiveDark : styles.sidebarTabActive)]}
            >
              <Ionicons name="folder-open-outline" size={20} color={devTab === "explorer" ? "#c62828" : (darkMode ? "#9e9e9e" : "#757575")} />
              <Text style={[styles.sidebarTabTxt, darkMode && styles.sidebarTabTxtDark, devTab === "explorer" && styles.sidebarTabTxtActive]}>Explorer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setDevTab("permissions"); loadRolePermissions(); }}
              style={[styles.sidebarTab, devTab === "permissions" && (darkMode ? styles.sidebarTabActiveDark : styles.sidebarTabActive)]}
            >
              <Ionicons name="key-outline" size={20} color={devTab === "permissions" ? "#c62828" : (darkMode ? "#9e9e9e" : "#757575")} />
              <Text style={[styles.sidebarTabTxt, darkMode && styles.sidebarTabTxtDark, devTab === "permissions" && styles.sidebarTabTxtActive]}>Roles</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setDevTab("approvals"); loadPendingApprovals(); }}
              style={[styles.sidebarTab, devTab === "approvals" && (darkMode ? styles.sidebarTabActiveDark : styles.sidebarTabActive)]}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={devTab === "approvals" ? "#c62828" : (darkMode ? "#9e9e9e" : "#757575")} />
              <Text style={[styles.sidebarTabTxt, darkMode && styles.sidebarTabTxtDark, devTab === "approvals" && styles.sidebarTabTxtActive]}>
                Approvals
                {pendingApprovals.length > 0 && (
                  <Text style={{ color: "#c62828", fontWeight: "bold" }}> ({pendingApprovals.length})</Text>
                )}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setDevTab("credentials"); loadStudents(); }}
              style={[styles.sidebarTab, devTab === "credentials" && (darkMode ? styles.sidebarTabActiveDark : styles.sidebarTabActive)]}
            >
              <Ionicons name="card-outline" size={20} color={devTab === "credentials" ? "#c62828" : (darkMode ? "#9e9e9e" : "#757575")} />
              <Text style={[styles.sidebarTabTxt, darkMode && styles.sidebarTabTxtDark, devTab === "credentials" && styles.sidebarTabTxtActive]}>Credentials</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setDevTab("manual-test"); }}
              style={[styles.sidebarTab, devTab === "manual-test" && (darkMode ? styles.sidebarTabActiveDark : styles.sidebarTabActive)]}
            >
              <Ionicons name="document-text-outline" size={20} color={devTab === "manual-test" ? "#c62828" : (darkMode ? "#9e9e9e" : "#757575")} />
              <Text style={[styles.sidebarTabTxt, darkMode && styles.sidebarTabTxtDark, devTab === "manual-test" && styles.sidebarTabTxtActive]}>Manual Test</Text>
            </TouchableOpacity>
          </View>

          {/* MAIN WORKING AREA replicating Admin Panel layout */}
          <View style={[styles.splitContent, darkMode && styles.splitContentDark, { paddingHorizontal: 0, paddingTop: 0 }]}>{/* WORKSPACE 1: DATABASE EXPLORER */}
            {devTab === "explorer" && (
              <View style={{ flex: 1, flexDirection: "row" }}>
                {/* Explorer Col 1: Collections list */}
                <View style={{ width: 200, backgroundColor: darkMode ? "#1a1a1a" : "#f9f9f9", borderRightWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0" }}>
                  <View style={{ padding: 10, borderBottomWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0" }}>
                    <TouchableOpacity
                      onPress={devLoadCollections}
                      style={[styles.primaryBtn, { paddingVertical: 6, marginBottom: 8, height: 32, justifyContent: "center" }]}
                    >
                      <Text style={[styles.primaryBtnTxt, { fontSize: 11 }]}>↻ Reload Collections</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, darkMode && styles.inputDark, { marginBottom: 0, height: 32, paddingVertical: 0, fontSize: 11 }]}
                      placeholder="Filter collections..."
                      placeholderTextColor={darkMode ? "#757575" : "#9e9e9e"}
                      value={devCollectionSearch}
                      onChangeText={setDevCollectionSearch}
                    />
                  </View>
                  <ScrollView style={{ flex: 1 }}>
                    {filteredCollections.map(col => (
                      <TouchableOpacity
                        key={col.name}
                        onPress={() => {
                          setDevActiveCollection(col.name);
                          setDevDocs([]);
                          setDevSelectedDoc(null);
                          setDevSelectedDocId(null);
                          setDevEditMode("view");
                          setDevSearch("");
                          devLoadDocs(col.name, 0);
                        }}
                        style={{
                          padding: 10,
                          borderBottomWidth: 1,
                          borderColor: darkMode ? "#2a2a2a" : "#eaeaea",
                          backgroundColor: devActiveCollection === col.name ? (darkMode ? "rgba(239, 154, 154, 0.12)" : "rgba(198, 40, 40, 0.08)") : "transparent"
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COL_COLORS[col.name] || "#757575" }} />
                          <Text style={{ color: devActiveCollection === col.name ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#e0e0e0" : "#212121"), fontSize: 12, fontWeight: "bold", flex: 1 }} numberOfLines={1}>{col.name}</Text>
                        </View>
                        <Text style={{ color: darkMode ? "#757575" : "#9e9e9e", fontSize: 10, marginTop: 2, paddingLeft: 14 }}>{col.count} documents</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Explorer Col 2: Documents List */}
                <View style={{ width: 240, backgroundColor: darkMode ? "#121212" : "#ffffff", borderRightWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0" }}>
                  {devActiveCollection ? (
                    <>
                      <View style={{ padding: 8, borderBottomWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0", gap: 6 }}>
                        <TextInput
                          style={[styles.input, darkMode && styles.inputDark, { marginBottom: 0, height: 32, paddingVertical: 0, fontSize: 11 }]}
                          placeholder="Search document IDs..."
                          placeholderTextColor={darkMode ? "#757575" : "#9e9e9e"}
                          value={devSearch}
                          onChangeText={setDevSearch}
                          onSubmitEditing={() => devLoadDocs(devActiveCollection, 0)}
                        />
                        <View style={{ flexDirection: "row", gap: 4 }}>
                          <TouchableOpacity onPress={() => { setDevEditMode("create"); setDevNewDocJson("{\n  \n}"); setDevSelectedDoc(null); }} style={{ flex: 1, backgroundColor: "#2e7d32", borderRadius: 5, padding: 6, alignItems: "center" }}>
                            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>+ New Doc</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setDevEditMode("query"); setDevQueryResults([]); }} style={{ flex: 1, backgroundColor: "#1565c0", borderRadius: 5, padding: 6, alignItems: "center" }}>
                            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>Query Builder</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
                          <TouchableOpacity onPress={() => devLoadDocs(devActiveCollection, 0)} style={{ flex: 1, backgroundColor: darkMode ? "#2a2a2a" : "#e0e0e0", borderRadius: 5, padding: 5, alignItems: "center", borderWidth: 1, borderColor: darkMode ? "#3a3a3a" : "#ccc" }}>
                            <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontSize: 10 }}>Reload</Text>
                          </TouchableOpacity>
                          {devOffset > 0 && (
                            <TouchableOpacity onPress={() => devLoadDocs(devActiveCollection, Math.max(0, devOffset - devLimit))} style={{ width: 30, backgroundColor: darkMode ? "#2a2a2a" : "#e0e0e0", borderRadius: 5, padding: 5, alignItems: "center", borderWidth: 1, borderColor: darkMode ? "#3a3a3a" : "#ccc" }}>
                              <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontSize: 10 }}>◀</Text>
                            </TouchableOpacity>
                          )}
                          {devDocs.length === devLimit && (
                            <TouchableOpacity onPress={() => devLoadDocs(devActiveCollection, devOffset + devLimit)} style={{ width: 30, backgroundColor: darkMode ? "#2a2a2a" : "#e0e0e0", borderRadius: 5, padding: 5, alignItems: "center", borderWidth: 1, borderColor: darkMode ? "#3a3a3a" : "#ccc" }}>
                              <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontSize: 10 }}>▶</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      {devDocsLoading ? (
                        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                          <ActivityIndicator size="small" color={darkMode ? "#ef9a9a" : "#c62828"} />
                          <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 11, marginTop: 8 }}>Querying Firestore...</Text>
                        </View>
                      ) : (
                        <ScrollView style={{ flex: 1 }}>
                          {devDocs.map((doc: any) => (
                            <TouchableOpacity
                              key={doc._id}
                              onPress={() => devOpenDoc(doc._id)}
                              style={{
                                padding: 8,
                                borderBottomWidth: 1,
                                borderColor: darkMode ? "#2a2a2a" : "#eaeaea",
                                backgroundColor: devSelectedDocId === doc._id ? (darkMode ? "rgba(239, 154, 154, 0.12)" : "rgba(198, 40, 40, 0.08)") : "transparent"
                              }}
                            >
                              <Text style={{ color: devSelectedDocId === doc._id ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#2196f3" : "#4caf50"), fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }} numberOfLines={1}>{doc._id}</Text>
                              <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 9, marginTop: 4 }} numberOfLines={2}>
                                {Object.keys(doc).filter(k => k !== "_id").slice(0, 3).map(k => `${k}: ${typeof doc[k] === "object" ? "{...}" : String(doc[k]).slice(0, 18)}`).join(" · ")}
                              </Text>
                            </TouchableOpacity>
                          ))}
                          {devDocs.length === 0 && (
                            <View style={{ padding: 20, alignItems: "center" }}>
                              <Text style={{ color: darkMode ? "#616161" : "#9e9e9e", fontSize: 11 }}>No documents found</Text>
                            </View>
                          )}
                        </ScrollView>
                      )}
                    </>
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 16 }}>
                      <Ionicons name="folder-outline" size={28} color={darkMode ? "#3a3a3a" : "#ccc"} />
                      <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 11, textAlign: "center", marginTop: 8 }}>Select a collection</Text>
                    </View>
                  )}
                </View>

                {/* Explorer Col 3: Document Content Area */}
                <View style={{ flex: 1, backgroundColor: darkMode ? "#1a1a1a" : "#fcfcfc" }}>
                  {devActiveCollection && (
                    <View style={{ flexDirection: "row", gap: 6, padding: 8, borderBottomWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0", backgroundColor: darkMode ? "#121212" : "#f5f5f5" }}>
                      {devSelectedDoc && (
                        <>
                          <TouchableOpacity onPress={() => setDevEditMode("view")} style={{ backgroundColor: devEditMode === "view" ? (darkMode ? "#2a2a2a" : "#e0e0e0") : "transparent", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: darkMode ? "#3a3a3a" : "#ccc" }}>
                            <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontSize: 11 }}>👁 View Content</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setDevEditMode("edit"); setDevEditJson(JSON.stringify(devSelectedDoc, null, 2)); }} style={{ backgroundColor: devEditMode === "edit" ? (darkMode ? "#2a2a2a" : "#e0e0e0") : "transparent", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: darkMode ? "#3a3a3a" : "#ccc" }}>
                            <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontSize: 11 }}>✏️ Raw Edit JSON</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => devDeleteDoc(devSelectedDocId!)} style={{ backgroundColor: "rgba(198, 40, 40, 0.1)", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: "#c62828" }}>
                            <Text style={{ color: "#c62828", fontSize: 11 }}>🗑 Delete</Text>
                          </TouchableOpacity>
                        </>
                      )}
                      {devEditMode === "edit" && (
                        <TouchableOpacity onPress={devSaveDoc} style={{ backgroundColor: "#2e7d32", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6 }}>
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>💾 Save JSON Changes</Text>
                        </TouchableOpacity>
                      )}
                      {devEditMode === "create" && (
                        <TouchableOpacity onPress={devCreateDoc} style={{ backgroundColor: "#2e7d32", borderRadius: 5, paddingHorizontal: 12, paddingVertical: 6 }}>
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>➕ Insert Document</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
                    {devEditMode === "view" && devSelectedDoc && (
                      <View>
                        <Text style={{ color: darkMode ? "#ef9a9a" : "#c62828", fontFamily: "monospace", fontSize: 12, marginBottom: 12, fontWeight: "700" }}>
                          {devActiveCollection} / {devSelectedDocId}
                        </Text>
                        <View style={{ backgroundColor: darkMode ? "#121212" : "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0", padding: 12 }}>
                          {Object.entries(devSelectedDoc).map(([k, v]) => (
                            <View key={k} style={{ marginBottom: 10, borderBottomWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#f0f0f0", paddingBottom: 8 }}>
                              <Text style={{ color: darkMode ? "#ef9a9a" : "#c62828", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }}>{k}</Text>
                              <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontSize: 11, fontFamily: "monospace", marginTop: 4, lineHeight: 16 }} selectable>
                                {typeof v === "object" ? JSON.stringify(v, null, 2) : String(v)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {devEditMode === "edit" && (
                      <View>
                        <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 12, marginBottom: 8 }}>Edit Raw Document Fields (JSON format):</Text>
                        <TextInput
                          multiline
                          style={{ backgroundColor: darkMode ? "#121212" : "#f8f9fa", color: darkMode ? "#e0e0e0" : "#212121", borderRadius: 8, borderWidth: 1, borderColor: darkMode ? "#3a3a3a" : "#ccc", padding: 12, fontFamily: "monospace", fontSize: 11, minHeight: 400, textAlignVertical: "top" }}
                          value={devEditJson}
                          onChangeText={setDevEditJson}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    )}

                    {devEditMode === "create" && (
                      <View>
                        <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 12, marginBottom: 8 }}>Define New Document JSON payload (must be valid JSON):</Text>
                        <TextInput
                          multiline
                          style={{ backgroundColor: darkMode ? "#121212" : "#f8f9fa", color: darkMode ? "#e0e0e0" : "#212121", borderRadius: 8, borderWidth: 1, borderColor: "#2e7d32", padding: 12, fontFamily: "monospace", fontSize: 11, minHeight: 400, textAlignVertical: "top" }}
                          value={devNewDocJson}
                          onChangeText={setDevNewDocJson}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    )}

                    {devEditMode === "query" && (
                      <View style={{ gap: 10 }}>
                        <Text style={{ color: darkMode ? "#ef9a9a" : "#c62828", fontWeight: "bold", fontSize: 14 }}>🔍 Firestore Query Builder</Text>
                        <TextInput
                          style={[styles.input, darkMode && styles.inputDark]}
                          placeholder="Field name (e.g. role)"
                          placeholderTextColor={darkMode ? "#757575" : "#9e9e9e"}
                          value={devQueryField}
                          onChangeText={setDevQueryField}
                          autoCapitalize="none"
                        />
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                          {["==", "!=", ">", ">=", "<", "<=", "array-contains", "in"].map(op => (
                            <TouchableOpacity key={op} onPress={() => setDevQueryOp(op)} style={{ backgroundColor: devQueryOp === op ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#2a2a2a" : "#f5f5f5"), borderRadius: 5, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: darkMode ? "#3a3a3a" : "#ccc" }}>
                              <Text style={{ color: devQueryOp === op ? "#fff" : (darkMode ? "#e0e0e0" : "#212121"), fontSize: 11, fontFamily: "monospace" }}>{op}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={[styles.input, darkMode && styles.inputDark]}
                          placeholder='Value (e.g. "admin" or 42)'
                          placeholderTextColor={darkMode ? "#757575" : "#9e9e9e"}
                          value={devQueryValue}
                          onChangeText={setDevQueryValue}
                          autoCapitalize="none"
                        />
                        <TouchableOpacity onPress={devRunQuery} style={[styles.primaryBtn, { backgroundColor: "#1565c0", marginHorizontal: 0 }]}>
                          <Text style={styles.primaryBtnTxt}>Execute Firestore Query</Text>
                        </TouchableOpacity>

                        {devQueryResults.length > 0 && (
                          <View style={{ marginTop: 12 }}>
                            <Text style={{ color: darkMode ? "#ef9a9a" : "#c62828", fontSize: 12, marginBottom: 8, fontWeight: "bold" }}>Query Output ({devQueryResults.length} records):</Text>
                            {devQueryResults.map((doc: any, i: number) => (
                              <TouchableOpacity key={i} onPress={() => { setDevSelectedDoc(doc); setDevSelectedDocId(doc._id); setDevEditMode("view"); }}
                                style={{ backgroundColor: darkMode ? "#121212" : "#ffffff", borderRadius: 6, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0" }}>
                                <Text style={{ color: darkMode ? "#ef9a9a" : "#1565c0", fontSize: 11, fontFamily: "monospace", fontWeight: "bold" }}>{doc._id}</Text>
                                <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 10, marginTop: 4 }} numberOfLines={2}>
                                  {Object.keys(doc).filter(k => k !== "_id").slice(0, 4).map(k => `${k}: ${typeof doc[k] === "object" ? "{...}" : String(doc[k]).slice(0, 30)}`).join(" · ")}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    {!devSelectedDoc && !devActiveCollection && (
                      <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 100 }}>
                        <Ionicons name="terminal-outline" size={48} color={darkMode ? "#3a3a3a" : "#ccc"} />
                        <Text style={{ color: darkMode ? "#ef9a9a" : "#c62828", fontSize: 13, marginTop: 12, fontWeight: "bold" }}>UNISTRIX DATABASE EXPLORER</Text>
                        <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 11, marginTop: 4, textAlign: "center" }}>Select a collection from the left panel to browse and query records</Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* WORKSPACE 2: ROLE PERMISSIONS MATRIX */}
            {devTab === "permissions" && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
                  <View style={{ flex: 1, minWidth: 240 }}>
                    <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark, { marginBottom: 4 }]}>Role Permissions Configurator</Text>
                    <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 11 }}>Setup and modify admin role permissions matrix persistently saved to role_permissions collection</Text>
                  </View>
                  <TouchableOpacity
                    disabled={isSavingPermissions}
                    onPress={saveRolePermissionsFromDev}
                    style={[styles.primaryBtn, { backgroundColor: "#2e7d32", paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 0 }]}
                  >
                    <Text style={styles.primaryBtnTxt}>
                      {isSavingPermissions ? "Saving..." : "💾 Save Permissions Matrix"}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Role Tabs styled like Admin Pills */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 15, flexWrap: "wrap" }}>
                  {rolesList.map(r => {
                    const isSelected = activePermissionRole === r.key;
                    return (
                      <TouchableOpacity
                        key={r.key}
                        onPress={() => setActivePermissionRole(r.key)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: isSelected ? r.color : (darkMode ? "#3a3a3a" : "#ccc"),
                          backgroundColor: isSelected ? (darkMode ? "rgba(239, 154, 154, 0.1)" : "rgba(198, 40, 40, 0.05)") : "transparent"
                        }}
                      >
                        <Text style={{ color: isSelected ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#e0e0e0" : "#212121"), fontWeight: "bold", fontSize: 12 }}>{r.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Permissions Grid Container */}
                <View style={{ backgroundColor: darkMode ? "#1e1e1e" : "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0", padding: 15 }}>
                  <Text style={{ color: darkMode ? "#ef9a9a" : "#c62828", fontSize: 13, fontWeight: "bold", marginBottom: 15 }}>
                    Configure permissions for: {rolesList.find(r => r.key === activePermissionRole)?.label}
                  </Text>

                  <View style={{ gap: 20 }}>
                    {featuresList.map(f => {
                      const currentRolePerms = rolePermissions?.[activePermissionRole] || {};
                      const activeVal = currentRolePerms[f.key] || "CRUD";
                      return (
                        <View key={f.key} style={{ paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: darkMode ? "#2a2a2a" : "#f0f0f0" }}>
                          <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontSize: 13, fontWeight: "bold", marginBottom: 8 }}>{f.label}</Text>
                          <View style={{ gap: 6 }}>
                            {permissionOptions.map(opt => {
                              const isSelected = activeVal === opt.key;
                              return (
                                <TouchableOpacity
                                  key={opt.key}
                                  onPress={() => updateFeaturePermissionFromDev(f.key, opt.key)}
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    padding: 10,
                                    borderRadius: 6,
                                    borderWidth: 1,
                                    borderColor: isSelected ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#3a3a3a" : "#e0e0e0"),
                                    backgroundColor: isSelected ? (darkMode ? "rgba(239, 154, 154, 0.1)" : "rgba(198, 40, 40, 0.05)") : (darkMode ? "#121212" : "#ffffff")
                                  }}
                                >
                                  <View style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 8,
                                    borderWidth: 2,
                                    borderColor: isSelected ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#757575" : "#bdbdbd"),
                                    alignItems: "center",
                                    justifyContent: "center",
                                    marginRight: 10
                                  }}>
                                    {isSelected && (
                                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: darkMode ? "#ef9a9a" : "#c62828" }} />
                                    )}
                                  </View>
                                  <Text style={{ fontSize: 12, color: isSelected ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#e0e0e0" : "#212121"), fontWeight: isSelected ? "bold" : "normal" }}>
                                    {opt.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* WORKSPACE 3: DELETE APPROVALS */}
            {devTab === "approvals" && (
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark, { marginBottom: 4 }]}>Pending Delete Approvals Manager</Text>
                    <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 11 }}>Review and approve deletion requests submitted by Editors / Contributors</Text>
                  </View>
                  <TouchableOpacity
                    onPress={loadPendingApprovals}
                    style={[styles.primaryBtn, { backgroundColor: "#1565c0", paddingHorizontal: 14, paddingVertical: 8, marginBottom: 0 }]}
                  >
                    <Text style={styles.primaryBtnTxt}>↻ Refresh Requests</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ backgroundColor: darkMode ? "#1e1e1e" : "#ffffff", borderRadius: 8, borderWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0", overflow: "hidden" }}>
                  <View style={{ flexDirection: "row", backgroundColor: darkMode ? "#1a1a1a" : "#f5f5f5", paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0" }}>
                    <Text style={{ flex: 1.5, color: darkMode ? "#ef9a9a" : "#37474f", fontSize: 11, fontWeight: "bold" }}>COLLECTION / FEATURE</Text>
                    <Text style={{ flex: 2.5, color: darkMode ? "#ef9a9a" : "#37474f", fontSize: 11, fontWeight: "bold" }}>DOCUMENT ID</Text>
                    <Text style={{ flex: 1.5, color: darkMode ? "#ef9a9a" : "#37474f", fontSize: 11, fontWeight: "bold" }}>REQUESTED BY</Text>
                    <Text style={{ flex: 1.5, color: darkMode ? "#ef9a9a" : "#37474f", fontSize: 11, fontWeight: "bold" }}>DATE REQUESTED</Text>
                    <Text style={{ flex: 1.5, color: darkMode ? "#ef9a9a" : "#37474f", fontSize: 11, fontWeight: "bold", textAlign: "center" }}>ACTIONS</Text>
                  </View>

                  {pendingApprovals.length === 0 ? (
                    <View style={{ padding: 40, alignItems: "center" }}>
                      <Ionicons name="checkmark-circle-outline" size={32} color="#2e7d32" />
                      <Text style={{ color: darkMode ? "#e0e0e0" : "#212121", fontSize: 12, marginTop: 8, fontWeight: "bold" }}>All requests cleared!</Text>
                      <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 11, marginTop: 2 }}>No pending deletion requests need approval.</Text>
                    </View>
                  ) : (
                    pendingApprovals.map((item, idx) => (
                      <View key={item._id} style={{ flexDirection: "row", paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: idx === pendingApprovals.length - 1 ? 0 : 1, borderColor: darkMode ? "#2a2a2a" : "#f0f0f0", alignItems: "center" }}>
                        <Text style={{ flex: 1.5, color: darkMode ? "#e0e0e0" : "#212121", fontSize: 12, textTransform: "capitalize", fontWeight: "600" }}>{item.feature}</Text>
                        <Text style={{ flex: 2.5, color: "#c62828", fontSize: 11, fontFamily: "monospace" }} selectable>{item.docId}</Text>
                        <Text style={{ flex: 1.5, color: darkMode ? "#e0e0e0" : "#212121", fontSize: 12 }} numberOfLines={1}>{item.requestedBy}</Text>
                        <Text style={{ flex: 1.5, color: darkMode ? "#9e9e9e" : "#757575", fontSize: 11 }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A"}</Text>
                        <View style={{ flex: 1.5, flexDirection: "row", justifyContent: "center", gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => handleApproveDelete(item, loadPendingApprovals)}
                            style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#2e7d32", borderRadius: 4 }}
                          >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleRejectDelete(item, loadPendingApprovals)}
                            style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#c62828", borderRadius: 4 }}
                          >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>Reject</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            )}

            {/* WORKSPACE 4: CREDENTIALS PREVIEW WORKSPACE */}
            {devTab === "credentials" && (
              <View style={{ flex: 1, flexDirection: "row" }}>

                {/* Student Selector */}
                <View style={{ width: 220, backgroundColor: darkMode ? "#1a1a1a" : "#f9f9f9", borderRightWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0" }}>
                  <View style={{ padding: 10, borderBottomWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0" }}>
                    <Text style={{ color: darkMode ? "#ef9a9a" : "#c62828", fontSize: 11, fontWeight: "bold", marginBottom: 6 }}>SELECT CANDIDATE</Text>
                    <TouchableOpacity
                      onPress={loadStudents}
                      style={[styles.primaryBtn, { paddingVertical: 6, marginBottom: 0, height: 32, justifyContent: "center" }]}
                    >
                      <Text style={[styles.primaryBtnTxt, { fontSize: 11 }]}>↻ Reload Students</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView style={{ flex: 1 }}>
                    {students.map((st: any) => {
                      const isSelected = selectedIdStudent?.id === st.id;
                      return (
                        <TouchableOpacity
                          key={st.id}
                          onPress={() => setSelectedIdStudent(st)}
                          style={{
                            padding: 10,
                            borderBottomWidth: 1,
                            borderColor: darkMode ? "#2a2a2a" : "#eaeaea",
                            backgroundColor: isSelected ? (darkMode ? "rgba(239, 154, 154, 0.12)" : "rgba(198, 40, 40, 0.08)") : "transparent"
                          }}
                        >
                          <Text style={{ color: isSelected ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#e0e0e0" : "#212121"), fontSize: 12, fontWeight: "bold" }} numberOfLines={1}>
                            {st.firstName} {st.lastName}
                          </Text>
                          <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 9, marginTop: 2 }}>Roll: {st.rollNumber}</Text>
                          <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                            {st.idCardGenerated && (
                              <View style={{ backgroundColor: "#2e7d32", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                                <Text style={{ color: "#fff", fontSize: 7, fontWeight: "bold" }}>ID CARD</Text>
                              </View>
                            )}
                            {st.hallTicketGenerated && (
                              <View style={{ backgroundColor: "#1565c0", borderRadius: 3, paddingHorizontal: 4, paddingVertical: 1 }}>
                                <Text style={{ color: "#fff", fontSize: 7, fontWeight: "bold" }}>TICKET</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Template customization playground */}
                <View style={{ flex: 1, backgroundColor: darkMode ? "#121212" : "#ffffff" }}>
                  {selectedIdStudent ? (
                    <View style={{ flex: 1 }}>
                      {/* Top subtabs */}
                      <View style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0", backgroundColor: darkMode ? "#1a1a1a" : "#f5f5f5" }}>
                        <TouchableOpacity
                          onPress={() => setCardSubTab("idcard")}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            borderBottomWidth: 2,
                            borderColor: cardSubTab === "idcard" ? (darkMode ? "#ef9a9a" : "#c62828") : "transparent"
                          }}
                        >
                          <Text style={{ color: cardSubTab === "idcard" ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#9e9e9e" : "#757575"), fontWeight: "bold", fontSize: 12 }}>🪪 ID Card Template</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setCardSubTab("hallticket")}
                          style={{
                            paddingVertical: 12,
                            paddingHorizontal: 20,
                            borderBottomWidth: 2,
                            borderColor: cardSubTab === "hallticket" ? (darkMode ? "#ef9a9a" : "#c62828") : "transparent"
                          }}
                        >
                          <Text style={{ color: cardSubTab === "hallticket" ? (darkMode ? "#ef9a9a" : "#c62828") : (darkMode ? "#9e9e9e" : "#757575"), fontWeight: "bold", fontSize: 12 }}>🎫 Hall Ticket Template</Text>
                        </TouchableOpacity>
                      </View>

                      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 15 }}>
                        {cardSubTab === "idcard" && (
                          <View style={{ flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: 16 }}>
                            {/* Editor Form */}
                            <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? "100%" : undefined, minWidth: isMobile ? undefined : 260, gap: 12 }}>
                              <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>Customize ID Card Metadata</Text>

                              <View>
                                <Text style={[styles.label, darkMode && styles.labelDark, { fontSize: 10, fontWeight: "bold", marginBottom: 4 }]}>EXPIRY DATE</Text>
                                <TextInput
                                  value={idCardExpiry}
                                  onChangeText={setIdCardExpiry}
                                  style={[styles.input, darkMode && styles.inputDark]}
                                  placeholder="e.g. 31/12/2026"
                                  placeholderTextColor={darkMode ? "#666" : "#999"}
                                />
                              </View>

                              <View>
                                <Text style={[styles.label, darkMode && styles.labelDark, { fontSize: 10, fontWeight: "bold", marginBottom: 4 }]}>DESIGNATION / SUBTITLE</Text>
                                <TextInput
                                  value={idCardRole}
                                  onChangeText={setIdCardRole}
                                  style={[styles.input, darkMode && styles.inputDark]}
                                  placeholder="e.g. IAS CANDIDATE"
                                  placeholderTextColor={darkMode ? "#666" : "#999"}
                                />
                              </View>

                              <View>
                                <Text style={[styles.label, darkMode && styles.labelDark, { fontSize: 10, fontWeight: "bold", marginBottom: 6 }]}>ACCENT DESIGN THEME</Text>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                  {["#c62828", "#1565c0", "#2e7d32", "#37474f", "#e65100"].map(c => (
                                    <TouchableOpacity
                                      key={c}
                                      onPress={() => setIdCardTheme(c)}
                                      style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 14,
                                        backgroundColor: c,
                                        borderWidth: idCardTheme === c ? 2.5 : 0,
                                        borderColor: darkMode ? "#ffffff" : "#000000"
                                      }}
                                    />
                                  ))}
                                </View>
                              </View>

                              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                                <TouchableOpacity
                                  onPress={async () => {
                                    try {
                                      await api.put(`/erp/student/${selectedIdStudent.id}`, {
                                        idCardGenerated: true,
                                        idCardExpiry,
                                        idCardRole,
                                        idCardTheme
                                      });
                                      Alert.alert("Success", "ID Card generated!");
                                      setSelectedIdStudent({
                                        ...selectedIdStudent,
                                        idCardGenerated: true,
                                        idCardExpiry,
                                        idCardRole,
                                        idCardTheme
                                      });
                                      loadStudents();
                                    } catch (e: any) {
                                      Alert.alert("Error", e.message || "Failed to generate ID Card");
                                    }
                                  }}
                                  style={{ flex: 1, backgroundColor: "#2e7d32", borderRadius: 6, paddingVertical: 10, alignItems: "center" }}
                                >
                                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Generate ID Card</Text>
                                </TouchableOpacity>

                                {selectedIdStudent.idCardGenerated && (
                                  <TouchableOpacity
                                    onPress={async () => {
                                      try {
                                        await api.put(`/erp/student/${selectedIdStudent.id}`, { idCardGenerated: false });
                                        Alert.alert("Success", "ID Card status revoked.");
                                        setSelectedIdStudent({ ...selectedIdStudent, idCardGenerated: false });
                                        loadStudents();
                                      } catch (e: any) {
                                        Alert.alert("Error", e.message || "Failed to revoke ID Card");
                                      }
                                    }}
                                    style={{ flex: 1, backgroundColor: "#c62828", borderRadius: 6, paddingVertical: 10, alignItems: "center" }}
                                  >
                                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Revoke ID Card</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>

                            {/* Preview */}
                            <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? "100%" : undefined, minWidth: isMobile ? undefined : 260, backgroundColor: darkMode ? "#1a1a1a" : "#ffffff", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0" }}>
                              <Text style={{ fontSize: 11, fontWeight: "bold", color: darkMode ? "#ef9a9a" : "#757575", marginBottom: 10 }}>LIVE VIEW PREVIEW</Text>
                              <View style={{ width: "100%", justifyContent: "center", alignItems: "center", paddingVertical: 10 }}>
                                {renderIDCard(selectedIdStudent, idCardTheme, idCardRole, idCardExpiry)}
                              </View>
                            </View>
                          </View>
                        )}

                        {cardSubTab === "hallticket" && (
                          <View style={{ flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: 16 }}>
                            {/* Editor Form */}
                            <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? "100%" : undefined, minWidth: isMobile ? undefined : 260, gap: 10 }}>
                              <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark]}>Customize Hall Ticket Schedules</Text>

                              <View>
                                <Text style={[styles.label, darkMode && styles.labelDark, { fontSize: 10, fontWeight: "bold", marginBottom: 4 }]}>EXAMINATION TITLE</Text>
                                <TextInput
                                  value={hallTicketExamName}
                                  onChangeText={setHallTicketExamName}
                                  style={[styles.input, darkMode && styles.inputDark]}
                                  placeholder="e.g. UPSC Prelims Mock"
                                  placeholderTextColor={darkMode ? "#666" : "#999"}
                                />
                              </View>

                              <View style={{ flexDirection: "row", gap: 8 }}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.label, darkMode && styles.labelDark, { fontSize: 10, fontWeight: "bold", marginBottom: 4 }]}>EXAM DATE</Text>
                                  <TextInput
                                    value={hallTicketExamDate}
                                    onChangeText={setHallTicketExamDate}
                                    style={[styles.input, darkMode && styles.inputDark]}
                                    placeholder="e.g. 24/05/2026"
                                    placeholderTextColor={darkMode ? "#666" : "#999"}
                                  />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.label, darkMode && styles.labelDark, { fontSize: 10, fontWeight: "bold", marginBottom: 4 }]}>EXAM TIME</Text>
                                  <TextInput
                                    value={hallTicketTime}
                                    onChangeText={setHallTicketTime}
                                    style={[styles.input, darkMode && styles.inputDark]}
                                    placeholder="e.g. 09:30 AM"
                                    placeholderTextColor={darkMode ? "#666" : "#999"}
                                  />
                                </View>
                              </View>

                              <View>
                                <Text style={[styles.label, darkMode && styles.labelDark, { fontSize: 10, fontWeight: "bold", marginBottom: 4 }]}>EXAMINATION VENUE</Text>
                                <TextInput
                                  value={hallTicketVenue}
                                  onChangeText={setHallTicketVenue}
                                  style={[styles.input, darkMode && styles.inputDark]}
                                  placeholder="Venue Address"
                                  placeholderTextColor={darkMode ? "#666" : "#999"}
                                />
                              </View>

                              <View>
                                <Text style={[styles.label, darkMode && styles.labelDark, { fontSize: 10, fontWeight: "bold", marginBottom: 4 }]}>CANDIDATE INSTRUCTIONS</Text>
                                <TextInput
                                  multiline
                                  numberOfLines={3}
                                  value={hallTicketInstructions}
                                  onChangeText={setHallTicketInstructions}
                                  style={[styles.input, darkMode && styles.inputDark, { height: 70, textAlignVertical: "top", fontSize: 11 }]}
                                  placeholder="Instructions list..."
                                  placeholderTextColor={darkMode ? "#666" : "#999"}
                                />
                              </View>

                              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                                <TouchableOpacity
                                  onPress={async () => {
                                    try {
                                      await api.put(`/erp/student/${selectedIdStudent.id}`, {
                                        hallTicketGenerated: true,
                                        hallTicketExamName,
                                        hallTicketExamDate,
                                        hallTicketVenue,
                                        hallTicketTime,
                                        hallTicketInstructions
                                      });
                                      Alert.alert("Success", "Hall Ticket generated!");
                                      setSelectedIdStudent({
                                        ...selectedIdStudent,
                                        hallTicketGenerated: true,
                                        hallTicketExamName,
                                        hallTicketExamDate,
                                        hallTicketVenue,
                                        hallTicketTime,
                                        hallTicketInstructions
                                      });
                                      loadStudents();
                                    } catch (e: any) {
                                      Alert.alert("Error", e.message || "Failed to generate Hall Ticket");
                                    }
                                  }}
                                  style={{ flex: 1, backgroundColor: "#2e7d32", borderRadius: 6, paddingVertical: 10, alignItems: "center" }}
                                >
                                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Generate Hall Ticket</Text>
                                </TouchableOpacity>

                                {selectedIdStudent.hallTicketGenerated && (
                                  <TouchableOpacity
                                    onPress={async () => {
                                      try {
                                        await api.put(`/erp/student/${selectedIdStudent.id}`, { hallTicketGenerated: false });
                                        Alert.alert("Success", "Hall Ticket status revoked.");
                                        setSelectedIdStudent({ ...selectedIdStudent, hallTicketGenerated: false });
                                        loadStudents();
                                      } catch (e: any) {
                                        Alert.alert("Error", e.message || "Failed to revoke Hall Ticket");
                                      }
                                    }}
                                    style={{ flex: 1, backgroundColor: "#c62828", borderRadius: 6, paddingVertical: 10, alignItems: "center" }}
                                  >
                                    <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 12 }}>Revoke Hall Ticket</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>

                            {/* Preview */}
                            <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? "100%" : undefined, minWidth: isMobile ? undefined : 260, backgroundColor: darkMode ? "#1a1a1a" : "#ffffff", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: darkMode ? "#2a2a2a" : "#e0e0e0" }}>
                              <Text style={{ fontSize: 11, fontWeight: "bold", color: darkMode ? "#ef9a9a" : "#757575", marginBottom: 10 }}>LIVE VIEW PREVIEW</Text>
                              <View style={{ width: "100%", justifyContent: "center", alignItems: "center", paddingVertical: 10 }}>
                                {renderHallTicket(selectedIdStudent, hallTicketExamName, hallTicketExamDate, hallTicketTime, hallTicketVenue, hallTicketInstructions)}
                              </View>
                            </View>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
                      <Ionicons name="card-outline" size={48} color={darkMode ? "#3a3a3a" : "#ccc"} />
                      <Text style={{ color: darkMode ? "#ef9a9a" : "#c62828", fontSize: 13, marginTop: 12, fontWeight: "bold" }}>CREDENTIALS & ADMIT CARDS PLAYGROUND</Text>
                      <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 11, marginTop: 4, textAlign: "center" }}>Select a student from the left list to test customizing their ID cards or Hall tickets</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {devTab === "manual-test" && (
                <ScrollView style={{ flex: 1, padding: 15 }} contentContainerStyle={{ paddingBottom: 50 }}>
                  <View style={[styles.card, darkMode && styles.cardDark]}>
                    <Text style={[styles.sectionTitle, darkMode && styles.sectionTitleDark, { marginBottom: 15 }]}>Define New Mock Test</Text>
                    
                    <Text style={[styles.label, darkMode && styles.labelDark]}>Test Title:</Text>
                    <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Test Title" placeholderTextColor="#999" value={newTest.title} onChangeText={t => setNewTest({ ...newTest, title: t })} />
                    
                    <Text style={[styles.label, darkMode && styles.labelDark]}>Test Description:</Text>
                    <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Test Description" placeholderTextColor="#999" value={newTest.description} onChangeText={d => setNewTest({ ...newTest, description: d })} />
                    
                    <Text style={[styles.label, darkMode && styles.labelDark]}>Duration (Minutes):</Text>
                    <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Duration (Minutes)" placeholderTextColor="#999" keyboardType="numeric" value={newTest.duration} onChangeText={du => setNewTest({ ...newTest, duration: du })} />
                    
                    <Text style={[styles.label, darkMode && styles.labelDark]}>Passing Marks:</Text>
                    <TextInput style={[styles.input, darkMode && styles.inputDark]} placeholder="Passing Marks" placeholderTextColor="#999" keyboardType="numeric" value={newTest.passingMarks} onChangeText={p => setNewTest({ ...newTest, passingMarks: p })} />

                    <Text style={[styles.label, darkMode && styles.labelDark]}>Target Audience:</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 15 }}>
                      {[
                        { label: "All Users", value: "all" },
                        { label: "Paid (All)", value: "paid" },
                        { label: "Paid (Batch)", value: "batch" },
                        { label: "Free Only", value: "free" }
                      ].map((aud) => (
                        <TouchableOpacity
                          key={aud.value}
                          onPress={() => setNewTest({ ...newTest, targetAudience: aud.value })}
                          style={{
                            flex: 1,
                            paddingVertical: 10,
                            borderRadius: 6,
                            backgroundColor: (newTest.targetAudience || "all") === aud.value ? "#c62828" : (darkMode ? "#2a2a2a" : "#ffffff"),
                            borderWidth: 1,
                            borderColor: (newTest.targetAudience || "all") === aud.value ? "#c62828" : (darkMode ? "#444" : "#e0e0e0"),
                            alignItems: "center",
                            minWidth: 70
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: "bold", color: (newTest.targetAudience || "all") === aud.value ? "#fff" : (darkMode ? "#aaa" : "#616161") }}>
                            {aud.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {(newTest.targetAudience === "batch") && (
                      <View style={{ marginBottom: 15 }}>
                        <Text style={[styles.label, darkMode && styles.labelDark]}>Select Batch:</Text>
                        <TouchableOpacity
                          onPress={() => setShowManualTestBatchDropdown(!showManualTestBatchDropdown)}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderWidth: 1,
                            borderColor: darkMode ? "#444" : "#ccc",
                            borderRadius: 8,
                            padding: 10,
                            backgroundColor: darkMode ? "#222" : "#fff"
                          }}
                        >
                          <Text style={{ color: darkMode ? "#fff" : "#212121", fontSize: 12 }}>
                            {newTest.targetBatch || "Choose a Batch..."}
                          </Text>
                          <Ionicons name={showManualTestBatchDropdown ? "chevron-up" : "chevron-down"} size={14} color="#757575" />
                        </TouchableOpacity>
                        {showManualTestBatchDropdown && (
                          <View style={{
                            borderWidth: 1,
                            borderColor: darkMode ? "#444" : "#ccc",
                            borderRadius: 8,
                            marginTop: 4,
                            backgroundColor: darkMode ? "#222" : "#fff",
                            maxHeight: 150,
                            overflow: "hidden"
                          }}>
                            <ScrollView nestedScrollEnabled>
                              {batches.map((b) => (
                                <TouchableOpacity
                                  key={b.id}
                                  onPress={() => {
                                    setNewTest({ ...newTest, targetBatch: b.batchName });
                                    setShowManualTestBatchDropdown(false);
                                  }}
                                  style={{
                                    padding: 10,
                                    borderBottomWidth: 1,
                                    borderBottomColor: darkMode ? "#333" : "#f0f0f0"
                                  }}
                                >
                                  <Text style={{ color: darkMode ? "#fff" : "#212121", fontSize: 12 }}>{b.batchName} ({b.course})</Text>
                                </TouchableOpacity>
                              ))}
                              {batches.length === 0 && (
                                <Text style={{ padding: 10, color: "#888", fontSize: 12, textAlign: "center" }}>No batches found</Text>
                              )}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    )}

                    <DateTimePickerSelect
                      label="Scheduled Start Time (Mandatory):"
                      value={newTest.startTime}
                      onChange={(t: string) => setNewTest({ ...newTest, startTime: t })}
                      darkMode={darkMode}
                    />

                    <DateTimePickerSelect
                      label="Scheduled End Time (Mandatory):"
                      value={newTest.endTime}
                      onChange={(t: string) => setNewTest({ ...newTest, endTime: t })}
                      darkMode={darkMode}
                    />

                    <Text style={[styles.label, darkMode && styles.labelDark]}>Select Number of Questions:</Text>
                    <TextInput
                      style={[styles.input, darkMode && styles.inputDark]}
                      placeholder="Number of Questions (e.g. 5)"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={manualNumQuestions}
                      onChangeText={setManualNumQuestions}
                    />

                    {Platform.OS === "web" && (
                      <View style={{ marginBottom: 12 }}>
                        <Text style={[styles.label, darkMode && styles.labelDark]}>Upload Questions JSON File:</Text>
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

                    <Text style={[styles.label, darkMode && styles.labelDark]}>Paste Questions JSON Array:</Text>
                    <TextInput
                      style={[styles.input, { height: 150, textAlignVertical: "top", fontFamily: "monospace", fontSize: 11 }, darkMode && styles.inputDark]}
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
                </ScrollView>
              )}
                
            </View>
          </View>
        </SafeAreaView>
      );
    }

  // Render Login
  if (!user) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, width: "100%" }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20 }}>
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
              </View>{showIpConfig && (
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

              {/* Sign In Tab */}
              <View style={styles.authTabs}>
                <TouchableOpacity onPress={() => setAuthTab("login")} style={[styles.authTabBtn, authTab === "login" && styles.authTabBtnActive]}>
                  <Text style={[styles.authTabTxt, authTab === "login" && styles.authTabTxtActive]}>Sign In</Text>
                </TouchableOpacity>
                {authTab === "guest" && (
                  <TouchableOpacity style={[styles.authTabBtn, styles.authTabBtnActive]}>
                    <Text style={[styles.authTabTxt, styles.authTabTxtActive]}>Guest Access</Text>
                  </TouchableOpacity>
                )}
              </View>

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

                  {/* Guest Login shortcut */}
                  <TouchableOpacity
                    onPress={() => {
                      setAuthTab("guest");
                    }}
                    style={{ marginTop: 18, alignItems: "center", paddingVertical: 8 }}
                  >
                    <Text style={{ color: "#c62828", fontSize: 13, fontWeight: "600", textDecorationLine: "underline" }}>
                      Continue as Guest (Browse Free)
                    </Text>
                  </TouchableOpacity>
              {/* Guest registration / details form */}
              {authTab === "guest" && (
                <>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: "#c62828", marginBottom: 12, textAlign: "center" }}>Enter candidate details to access free resources</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name (Mandatory)"
                    placeholderTextColor="#999"
                    value={guestName}
                    onChangeText={setGuestName}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Phone Number (Mandatory)"
                    placeholderTextColor="#999"
                    keyboardType="phone-pad"
                    value={guestPhone}
                    onChangeText={setGuestPhone}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address (Mandatory)"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    value={guestEmail}
                    onChangeText={setGuestEmail}
                  />

                  <TouchableOpacity onPress={handleGuestLogin} style={[styles.primaryBtn, { backgroundColor: "#c62828" }]}>
                    <Text style={styles.primaryBtnTxt}>Continue to Free Resources &rarr;</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setAuthTab("login")}
                    style={{ marginTop: 15, alignItems: "center", paddingVertical: 8 }}
                  >
                    <Text style={{ color: "#757575", fontSize: 13, textDecorationLine: "underline" }}>
                      Back to Sign In
                    </Text>
                  </TouchableOpacity>
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
                  <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 22 }}>{user.name?.[0]?.toUpperCase() || "G"}</Text>
                </View>
                <Text style={[styles.drawerName, darkMode && { color: "#f0f0f0" }]}>{user.name}</Text>
                <View style={[styles.roleBadge, { backgroundColor: "#757575" }]}>
                  <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>GUEST</Text>
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
                {user.hallTicketGenerated && (
                  <TouchableOpacity
                    style={[styles.drawerItem, darkMode && styles.drawerItemDark]}
                    onPress={() => { setShowHamburger(false); setShowGuestHallTicketModal(true); }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
                      <View style={[styles.drawerIconBox, { backgroundColor: "#efebe9" }]}>
                        <Ionicons name="card-outline" size={18} color="#5d4037" />
                      </View>
                      <Text style={[styles.drawerItemTxt, darkMode && { color: "#e0e0e0" }]}>My Hall Ticket</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={darkMode ? "#9e9e9e" : "#bdbdbd"} />
                  </TouchableOpacity>
                )}

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

        {/* Guest Hall Ticket Modal */}
        {showGuestHallTicketModal && (
          <Modal visible={true} animationType="slide" transparent>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" }}>
              <View style={[styles.card, { width: 360, maxHeight: "90%", padding: 15, backgroundColor: darkMode ? "#1e1e1e" : "#ffffff" }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "#e0e0e0", paddingBottom: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 15, fontWeight: "bold", color: "#c62828" }}>My Admission Hall Ticket</Text>
                  <TouchableOpacity onPress={() => setShowGuestHallTicketModal(false)}>
                    <Ionicons name="close" size={24} color={darkMode ? "#9e9e9e" : "#757575"} />
                  </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={{ alignItems: "center", paddingBottom: 20 }}>
                  {renderHallTicket(
                    {
                      name: user.name,
                      rollNumber: user.phone || "GUEST-001",
                      course: "Free Guest Resources",
                      batch: "Guest Batch",
                      photoBase64: null,
                      photoUrl: null
                    },
                    user.hallTicketExamName,
                    user.hallTicketExamDate,
                    user.hallTicketVenue,
                    user.hallTicketTime,
                    user.hallTicketInstructions
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
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

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }} contentContainerStyle={{ gap: 10 }}>
                  <Text style={[styles.label, darkMode && { color: "#aaa" }, { marginBottom: 4 }]}>Your Name</Text>
                  <View style={[styles.input, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444" }, { justifyContent: "center", height: 40, opacity: 0.8 }]}>
                    <Text style={{ color: darkMode ? "#e0e0e0" : "#212121" }}>{user?.name || "Anonymous"}</Text>
                  </View>

                  <Text style={[styles.label, darkMode && { color: "#aaa" }, { marginBottom: 4 }]}>Email (Gmail)</Text>
                  <View style={[styles.input, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444" }, { justifyContent: "center", height: 40, opacity: 0.8 }]}>
                    <Text style={{ color: darkMode ? "#e0e0e0" : "#212121" }}>{user?.email || user?.username || user?.phone || "No Email"}</Text>
                  </View>

                  <Text style={[styles.label, darkMode && { color: "#aaa" }, { marginBottom: 4 }]}>How would you rate your experience?</Text>
                  <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
                    {[1, 2, 3, 4, 5].map(r => (
                      <TouchableOpacity key={r} onPress={() => setFeedbackRating(r)} style={{ alignItems: "center" }}>
                        <Ionicons name={r <= feedbackRating ? "star" : "star-outline"} size={32} color={r <= feedbackRating ? "#FFA000" : "#bdbdbd"} />
                        <Text style={{ fontSize: 10, color: darkMode ? "#9e9e9e" : "#757575", marginTop: 2 }}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[styles.label, darkMode && { color: "#aaa" }, { marginBottom: 4 }]}>Your message * (Mandatory)</Text>
                  <TextInput
                    style={[styles.input, { height: 100 }, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444", color: "#e0e0e0" }]}
                    placeholder="Tell us what you think..."
                    placeholderTextColor={darkMode ? "#666" : "#999"}
                    multiline
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                  />
                </ScrollView>

                <TouchableOpacity
                  onPress={submitStudentFeedback}
                  style={[styles.primaryBtn, { width: "100%", marginTop: 15 }]}
                >
                  <Text style={styles.primaryBtnTxt}>Submit Feedback</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Image source={require("./assets/logo.png")} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "#fff" }} />
            <View>
              <Text style={styles.headerTitle}>NERMAI IAS ACADEMY</Text>
              <Text style={{ color: "#fff", opacity: 0.8, fontSize: 11 }}>Welcome, {user.name} (Free Access)</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowHamburger(true)} style={styles.hamburgerBtn}>
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, { width: 18 }]} />
            <View style={[styles.hamburgerLine, { width: 22 }]} />
          </TouchableOpacity>
        </View>

        {/* Guest Bottom Nav - 4 Tabs */}
        <View style={{ flexDirection: "row", backgroundColor: "#fff", borderTopWidth: 1, borderColor: "#e0e0e0", position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 100, paddingBottom: 4 }}>
          {([
            { key: "home", label: "Home", icon: "home-outline" },
            { key: "courses", label: "Free Resources", icon: "library-outline" },
            { key: "freetest", label: "Free Tests", icon: "clipboard-outline" },
            { key: "register", label: "Register", icon: "person-add-outline" }
          ] as const).map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => {
                if ((tab.key === "courses" || tab.key === "freetest") && !guestEmailUnlocked) {
                  setGuestEmailGatePendingTab(tab.key);
                  setGuestEmailGateInput("");
                  setGuestEmailGateVisible(true);
                } else {
                  setGuestTab(tab.key);
                }
              }}
              style={{ flex: 1, paddingVertical: 8, alignItems: "center", borderTopWidth: 2, borderTopColor: guestTab === tab.key ? "#c62828" : "transparent" }}
            >
              <Ionicons name={tab.icon as any} size={20} color={guestTab === tab.key ? "#c62828" : "#757575"} />
              <Text style={{ fontSize: 9, color: guestTab === tab.key ? "#c62828" : "#757575", fontWeight: "bold", marginTop: 2, textAlign: "center" }}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Email Gate Modal */}
        <Modal visible={guestEmailGateVisible} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: 24 }}>
            <View style={{ width: "100%", maxWidth: 360, backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 }}>
              <View style={{ backgroundColor: "#c62828", paddingVertical: 20, paddingHorizontal: 24, alignItems: "center" }}>
                <Ionicons name="mail-outline" size={32} color="#fff" style={{ marginBottom: 8 }} />
                <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff", textAlign: "center" }}>Unlock Free Content</Text>
                <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 4, textAlign: "center" }}>Enter your email to access free resources and practice tests</Text>
              </View>
              <View style={{ padding: 24, gap: 14 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#424242", marginBottom: 6 }}>YOUR EMAIL ADDRESS</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    placeholder="e.g. yourname@gmail.com"
                    placeholderTextColor="#999"
                    value={guestEmailGateInput}
                    onChangeText={setGuestEmailGateInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <Text style={{ fontSize: 11, color: "#9e9e9e", textAlign: "center" }}>We will never spam you. Your email is only used to personalise your learning experience.</Text>
                <TouchableOpacity
                  onPress={() => {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!guestEmailGateInput.trim() || !emailRegex.test(guestEmailGateInput.trim())) {
                      Alert.alert("Invalid Email", "Please enter a valid email address to continue.");
                      return;
                    }
                    setGuestEmailUnlocked(true);
                    setGuestEmailGateVisible(false);
                    if (guestEmailGatePendingTab) setGuestTab(guestEmailGatePendingTab);
                    setGuestEmailGatePendingTab(null);
                  }}
                  style={[styles.primaryBtn, { backgroundColor: "#c62828" }]}
                >
                  <Text style={styles.primaryBtnTxt}>Continue to {guestEmailGatePendingTab === "courses" ? "Free Resources" : "Free Tests"} &rarr;</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setGuestEmailGateVisible(false); setGuestEmailGatePendingTab(null); }} style={{ alignItems: "center", paddingVertical: 8 }}>
                  <Text style={{ color: "#9e9e9e", fontSize: 12 }}>Maybe later</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal><ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

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



          {/* FREE TESTS TAB */}
          {guestTab === "freetest" && (
            <View style={{ gap: 15 }}>
              <Text style={styles.sectionTitle}>Free Mock Tests</Text>
              {tests.length === 0 ? (
                <View style={[styles.card, { padding: 20, alignItems: "center" }]}>
                  <Ionicons name="document-text-outline" size={40} color="#757575" />
                  <Text style={[styles.emptyText, { marginTop: 10 }]}>No free mock tests available at the moment.</Text>
                </View>
              ) : (
                tests.map(t => {
                  const statusInfo = getTestStatusForStudent(t);
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

                      <TouchableOpacity
                        disabled={statusInfo.disabled}
                        onPress={() => startExam(t)}
                        style={[styles.primaryBtn, { marginTop: 10, backgroundColor: "#c62828" }, statusInfo.disabled && { backgroundColor: "#bdbdbd" }]}
                      >
                        <Text style={styles.primaryBtnTxt}>{statusInfo.label}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* REGISTER / CONTACT TAB */}
          {guestTab === "register" && (
            <View style={{ gap: 15 }}>
              <Text style={styles.sectionTitle}>Registration & Contact</Text>

              {admissionSubmitted ? (
                <View style={[styles.card, { backgroundColor: "#e8f5e9", borderColor: "#4caf50" }]}>
                  <Ionicons name="checkmark-circle" size={40} color="#2e7d32" style={{ alignSelf: "center", marginBottom: 8 }} />
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: "#2e7d32", textAlign: "center" }}>Application Submitted!</Text>
                  <Text style={{ color: "#555", textAlign: "center", marginTop: 8, fontSize: 13 }}>
                    Our team will contact you shortly.
                  </Text>
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
                <TouchableOpacity
                  onPress={() => setShowAdmissionForm(true)}
                  style={[styles.primaryBtn, { paddingVertical: 18, backgroundColor: "#c62828" }]}
                >
                  <Text style={[styles.primaryBtnTxt, { fontSize: 16 }]}>Apply for Admission</Text>
                </TouchableOpacity>
              )}

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Contact Us</Text>
                <View style={{ gap: 10 }}>
                  {[
                    { icon: "call-outline", text: "+91 99999 00000" },
                    { icon: "mail-outline", text: "info@nermaiacademy.com" },
                    { icon: "location-outline", text: "Nermai IAS Academy, Tamil Nadu" }
                  ].map((item, i) => (
                    <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name={item.icon as any} size={18} color="#c62828" />
                      <Text style={{ color: "#333", fontSize: 13 }}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={{ fontWeight: "bold", fontSize: 13, color: "#1a237e", marginBottom: 8 }}>Already a registered student?</Text>
                <TouchableOpacity
                  onPress={async () => {
                    await guestStorage.disableAutoLogin();
                    setUser(null);
                  }}
                  style={[styles.outlineBtn]}
                >
                  <Text style={styles.outlineBtnTxt}>Go to Login Page</Text>
                </TouchableOpacity>
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

            {/* Question Quick Navigation Grid */}
            <View style={{ marginBottom: 15 }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: "#757575", marginBottom: 6 }}>QUESTIONS NAVIGATOR:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", maxHeight: 40 }}>
                {attemptQuestions.map((_, qIdx) => {
                  const isAnswered = selectedAnswers[attemptQuestions[qIdx].id] !== undefined;
                  const isActive = qIdx === currentQIdx;
                  return (
                    <TouchableOpacity
                      key={qIdx}
                      onPress={() => setCurrentQIdx(qIdx)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isActive ? "#c62828" : isAnswered ? "#2e7d32" : "#f5f5f5",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 6,
                        borderWidth: isActive ? 2 : 1,
                        borderColor: isActive ? "#c62828" : isAnswered ? "#2e7d32" : "#e0e0e0"
                      }}
                    >
                      <Text style={{ color: isActive || isAnswered ? "#ffffff" : "#212121", fontWeight: "bold", fontSize: 12 }}>
                        {qIdx + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 13, marginBottom: 8 }}>
                QUESTION {currentQIdx + 1} OF {attemptQuestions.length}
              </Text>

              <Text style={{ fontSize: 17, fontWeight: "bold", color: "#212121", marginBottom: 6 }}>
                {attemptQuestions[currentQIdx].question}
              </Text>
              {attemptQuestions[currentQIdx].questionTa ? (
                <Text style={{ fontSize: 15, fontWeight: "500", color: "#455a64", marginBottom: 20, fontStyle: "italic" }}>
                  {attemptQuestions[currentQIdx].questionTa}
                </Text>
              ) : (
                <View style={{ height: 14 }} />
              )}

              <View style={{ gap: 10 }}>
                {attemptQuestions[currentQIdx].options?.map((opt: string, oIdx: number) => {
                  const selected = selectedAnswers[attemptQuestions[currentQIdx].id] === opt;
                  const optTa = attemptQuestions[currentQIdx].optionsTa?.[oIdx];
                  return (
                    <TouchableOpacity
                      key={oIdx}
                      onPress={() => selectAnswer(opt)}
                      style={[styles.modalOptionBtn, selected && styles.modalOptionBtnSelected, { minHeight: 48, paddingVertical: 8 }]}
                    >
                      <View style={{ flexDirection: "column" }}>
                        <Text style={{ color: selected ? "#ffffff" : "#212121", fontWeight: "bold", fontSize: 14 }}>
                          {String.fromCharCode(65 + oIdx)}. {opt}
                        </Text>
                        {optTa ? (
                          <Text style={{ color: selected ? "#e0f2f1" : "#546e7a", fontSize: 13, marginTop: 2, fontStyle: "italic" }}>
                            {optTa}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Navigation inside Modal */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 15, gap: 10 }}>
              <TouchableOpacity
                disabled={currentQIdx === 0}
                onPress={() => setCurrentQIdx(prev => prev - 1)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#c62828",
                  backgroundColor: "#ffffff",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: currentQIdx === 0 ? 0.5 : 1
                }}
              >
                <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 13 }}>◀ Previous</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitTestAttempt}
                style={{
                  flex: 1.2,
                  height: 44,
                  borderRadius: 8,
                  backgroundColor: "#c62828",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 13 }}>Submit Exam</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={currentQIdx === attemptQuestions.length - 1}
                onPress={() => setCurrentQIdx(prev => prev + 1)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: "#c62828",
                  backgroundColor: "#ffffff",
                  justifyContent: "center",
                  alignItems: "center",
                  opacity: currentQIdx === attemptQuestions.length - 1 ? 0.5 : 1
                }}
              >
                <Text style={{ color: "#c62828", fontWeight: "bold", fontSize: 13 }}>Next ▶</Text>
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
    const obtainedMarks = reviewData.obtainedMarks ?? 0;
    const totalMarks = reviewData.totalMarks ?? 0;
    const percentage = typeof reviewData.percentage === "number" ? reviewData.percentage : 0;
    const status = reviewData.status || "fail";

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
              Score: {obtainedMarks} / {totalMarks}
            </Text>
            <View style={{ backgroundColor: status === "pass" ? "#2e7d32" : "#c62828", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 11 }}>
                {String(status).toUpperCase()} ({Math.round(percentage)}%)
              </Text>
            </View>
          </View>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: "#ffffff" }} contentContainerStyle={{ padding: 15 }}>
          {!reviewData.questions || reviewData.questions.length === 0 ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <Text style={{ color: "#757575" }}>No questions available for review.</Text>
            </View>
          ) : (
            reviewData.questions.map((q: any, idx: number) => {
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
                        {isSkipped ? "Unattempted (0)" : isCorrect ? `Correct (+${q.marks || 1})` : `Incorrect (-${q.negativeMarks || 0.25})`}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 15, fontWeight: "bold", color: "#212121", marginBottom: 6 }}>
                    {q.questionText}
                  </Text>
                  {q.questionTa ? (
                    <Text style={{ fontSize: 14, fontWeight: "500", color: "#455a64", marginBottom: 10, fontStyle: "italic" }}>
                      {q.questionTa}
                    </Text>
                  ) : null}

                  <View style={{ gap: 8, marginBottom: 10 }}>
                    {q.options?.map((opt: string, oIdx: number) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isSelected = q.selectedAnswer === letter || q.selectedAnswer === opt;
                      const isCorrectOption = q.correctAnswer === letter || q.correctAnswer === opt;
                      const optTa = q.optionsTa?.[oIdx];

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
                          <View style={{ flex: 1, flexDirection: "column" }}>
                            <Text style={{ color: textC, fontWeight: isCorrectOption || isSelected ? "bold" : "normal", fontSize: 14 }}>
                              {opt}
                            </Text>
                            {optTa ? (
                              <Text style={{ color: isCorrectOption ? "#2e7d32" : isSelected ? "#c62828" : "#546e7a", fontSize: 13, marginTop: 2, fontStyle: "italic" }}>
                                {optTa}
                              </Text>
                            ) : null}
                          </View>
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
            })
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isAdmin = user && ["admin", "staff", "super_admin", "editor", "contributor", "developer"].includes(user.role);

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
              <View style={[styles.roleBadge, {
                backgroundColor:
                  user.role === "developer" ? "#212121" :
                    user.role === "super_admin" ? "#b71c1c" :
                      user.role === "admin" ? "#1565c0" :
                        user.role === "editor" ? "#e65100" :
                          user.role === "contributor" ? "#2e7d32" :
                            user.role === "student" ? "#006064" : "#757575"
              }]}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>{user.role.toUpperCase().replace("_", " ")}</Text>
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
              {(user?.role === "student" || user?.role === "guest") && (
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

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }} contentContainerStyle={{ gap: 10 }}>
                <Text style={[styles.label, darkMode && { color: "#aaa" }, { marginBottom: 4 }]}>Your Name</Text>
                <View style={[styles.input, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444" }, { justifyContent: "center", height: 40, opacity: 0.8 }]}>
                  <Text style={{ color: darkMode ? "#e0e0e0" : "#212121" }}>{user?.name || "Anonymous"}</Text>
                </View>

                <Text style={[styles.label, darkMode && { color: "#aaa" }, { marginBottom: 4 }]}>Email (Gmail)</Text>
                <View style={[styles.input, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444" }, { justifyContent: "center", height: 40, opacity: 0.8 }]}>
                  <Text style={{ color: darkMode ? "#e0e0e0" : "#212121" }}>{user?.email || user?.username || user?.phone || "No Email"}</Text>
                </View>

                <Text style={[styles.label, darkMode && { color: "#aaa" }, { marginBottom: 4 }]}>How would you rate your experience?</Text>
                <View style={{ flexDirection: "row", gap: 12, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map(r => (
                    <TouchableOpacity key={r} onPress={() => setFeedbackRating(r)} style={{ alignItems: "center" }}>
                      <Ionicons name={r <= feedbackRating ? "star" : "star-outline"} size={32} color={r <= feedbackRating ? "#FFA000" : "#bdbdbd"} />
                      <Text style={{ fontSize: 10, color: darkMode ? "#9e9e9e" : "#757575", marginTop: 2 }}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, darkMode && { color: "#aaa" }, { marginBottom: 4 }]}>Your message * (Mandatory)</Text>
                <TextInput
                  style={[styles.input, { height: 100 }, darkMode && { backgroundColor: "#2a2a2a", borderColor: "#444", color: "#e0e0e0" }]}
                  placeholder="Tell us what you think..."
                  placeholderTextColor={darkMode ? "#666" : "#999"}
                  multiline
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                />
              </ScrollView>

              <TouchableOpacity
                onPress={submitStudentFeedback}
                style={[styles.primaryBtn, { width: "100%", marginTop: 15 }]}
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
      <View style={[styles.mainBody, darkMode && { backgroundColor: "#121212" }]}>{/* ================== 1. DASHBOARD ================== */}
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
                Menu: {testSub === "available" ? "Available Exams" : testSub === "pdf-create" ? "AI Create" : "Results Log"}
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
                                executeDelete("tests", t.id, async () => {
                                  try {
                                    await api.delete(`/test-portal/test-creation/${t.id}`);
                                    Alert.alert("Success", "Test deleted successfully.");
                                    loadTests();
                                  } catch (e: any) {
                                    Alert.alert("Error", e.message || "Failed to delete test.");
                                  }
                                });
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
                      onChange={(t: string) => setNewPdfTest({ ...newPdfTest, startTime: t })}
                      darkMode={darkMode}
                    />
                    <DateTimePickerSelect
                      label="End Date & Time:"
                      value={newPdfTest.endTime}
                      onChange={(t: string) => setNewPdfTest({ ...newPdfTest, endTime: t })}
                      darkMode={darkMode}
                    />
                  </View>

                  {/* Target Audience Fields */}
                  <View style={{ backgroundColor: darkMode ? "#1a1a1a" : "#f5f5f5", padding: 12, borderRadius: 10, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: "#2e7d32" }}>
                    <Text style={{ fontWeight: "bold", color: darkMode ? "#81c784" : "#2e7d32", fontSize: 12, marginBottom: 8 }}>🎯 TARGET AUDIENCE</Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {[
                        { label: "All Users", value: "all" },
                        { label: "Paid (All)", value: "paid" },
                        { label: "Paid (Batch)", value: "batch" },
                        { label: "Free (Guest)", value: "free" }
                      ].map((aud) => (
                        <TouchableOpacity
                          key={aud.value}
                          onPress={() => setNewPdfTest({ ...newPdfTest, targetAudience: aud.value })}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 6,
                            backgroundColor: (newPdfTest.targetAudience || "all") === aud.value ? "#2e7d32" : (darkMode ? "#222" : "#ffffff"),
                            borderWidth: 1,
                            borderColor: (newPdfTest.targetAudience || "all") === aud.value ? "#2e7d32" : (darkMode ? "#444" : "#e0e0e0"),
                            alignItems: "center",
                            minWidth: 70
                          }}
                        >
                          <Text style={{ fontSize: 9, fontWeight: "bold", color: (newPdfTest.targetAudience || "all") === aud.value ? "#fff" : (darkMode ? "#aaa" : "#616161") }}>
                            {aud.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {(newPdfTest.targetAudience === "batch") && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 11, color: darkMode ? "#ccc" : "#444", marginBottom: 4 }}>Select Batch:</Text>
                        <TouchableOpacity
                          onPress={() => setShowTestBatchDropdown(!showTestBatchDropdown)}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderWidth: 1,
                            borderColor: darkMode ? "#444" : "#e0e0e0",
                            borderRadius: 8,
                            padding: 10,
                            backgroundColor: darkMode ? "#222" : "#fff"
                          }}
                        >
                          <Text style={{ color: darkMode ? "#fff" : "#212121", fontSize: 12 }}>
                            {newPdfTest.targetBatch || "Choose a Batch..."}
                          </Text>
                          <Ionicons name={showTestBatchDropdown ? "chevron-up" : "chevron-down"} size={14} color="#757575" />
                        </TouchableOpacity>
                        {showTestBatchDropdown && (
                          <View style={{
                            borderWidth: 1,
                            borderColor: darkMode ? "#444" : "#e0e0e0",
                            borderRadius: 8,
                            marginTop: 4,
                            backgroundColor: darkMode ? "#222" : "#fff",
                            maxHeight: 150,
                            overflow: "hidden"
                          }}>
                            <ScrollView nestedScrollEnabled>
                              {batches.map((b) => (
                                <TouchableOpacity
                                  key={b.id}
                                  onPress={() => {
                                    setNewPdfTest({ ...newPdfTest, targetBatch: b.batchName });
                                    setShowTestBatchDropdown(false);
                                  }}
                                  style={{
                                    padding: 10,
                                    borderBottomWidth: 1,
                                    borderBottomColor: darkMode ? "#333" : "#f0f0f0"
                                  }}
                                >
                                  <Text style={{ color: darkMode ? "#fff" : "#212121", fontSize: 12 }}>{b.batchName} ({b.course})</Text>
                                </TouchableOpacity>
                              ))}
                              {batches.length === 0 && (
                                <Text style={{ padding: 10, color: "#888", fontSize: 12, textAlign: "center" }}>No batches found</Text>
                              )}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    )}
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
              <View style={{ gap: 12 }}>
                {/* Filter Bar */}
                <View style={[styles.card, { padding: 12, marginBottom: 0 }]}>
                  <Text style={styles.sectionTitle}>Results Log</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0, fontSize: 13 }]}
                      placeholder="Search by test title..."
                      placeholderTextColor="#999"
                      value={resultsKeyword}
                      onChangeText={setResultsKeyword}
                    />
                    <TextInput
                      style={[styles.input, { width: 130, marginBottom: 0, fontSize: 13 }]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#999"
                      value={resultsDateFilter}
                      onChangeText={setResultsDateFilter}
                    />
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={async () => {
                        setResultsLoading(true);
                        try {
                          const params = new URLSearchParams();
                          if (resultsKeyword.trim()) params.append("keyword", resultsKeyword.trim());
                          if (resultsDateFilter.trim()) params.append("date", resultsDateFilter.trim());
                          const res = await api.get(`/test-portal/review/results/all-tests?${params.toString()}`);
                          setAllTestResults(res || []);
                        } catch (e: any) {
                          Alert.alert("Error", e.message || "Could not load results.");
                        } finally {
                          setResultsLoading(false);
                        }
                      }}
                      style={[styles.primaryBtn, { flex: 1, marginTop: 0, paddingVertical: 10 }]}
                    >
                      <Text style={styles.primaryBtnTxt}>{resultsLoading ? "Loading..." : "Load Results"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => { setResultsKeyword(""); setResultsDateFilter(""); setAllTestResults([]); }}
                      style={[styles.outlineBtn, { flex: 0.5, marginTop: 0, paddingVertical: 10 }]}
                    >
                      <Text style={styles.outlineBtnTxt}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Results List */}
                {allTestResults.length === 0 && !resultsLoading && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="trophy-outline" size={40} color="#757575" />
                    <Text style={styles.emptyText}>No results found. Use the filter above to load test results.</Text>
                  </View>
                )}

                {allTestResults.map((testLog: any) => (
                  <View key={testLog.testId} style={[styles.card, { padding: 0, overflow: "hidden" }]}>
                    {/* Test Header */}
                    <TouchableOpacity
                      onPress={() => setExpandedTestId(expandedTestId === testLog.testId ? null : testLog.testId)}
                      style={{ backgroundColor: "#c62828", padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14 }}>{testLog.testTitle}</Text>
                        <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}>
                          {testLog.createdAt ? new Date(testLog.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}  ·  {testLog.totalParticipants} participants
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        {/* PDF Export Button */}
                        <TouchableOpacity
                          onPress={() => {
                            // Build printable HTML table
                            const rows = (testLog.entries || []).map((e: any) =>
                              `<tr style="border-bottom:1px solid #eee">
                                <td style="padding:6px 8px;text-align:center">${e.serialNo}</td>
                                <td style="padding:6px 8px">${e.rollNumber}</td>
                                <td style="padding:6px 8px">${e.studentName}</td>
                                <td style="padding:6px 8px;text-align:center;color:#2e7d32;font-weight:bold">${e.correct}</td>
                                <td style="padding:6px 8px;text-align:center;color:#c62828;font-weight:bold">${e.wrong}</td>
                                <td style="padding:6px 8px;text-align:center">${e.skipped}</td>
                                <td style="padding:6px 8px;text-align:center;font-weight:bold">${e.obtainedMarks} / ${e.totalMarks}</td>
                                <td style="padding:6px 8px;text-align:center">${Math.round(e.percentage)}%</td>
                                <td style="padding:6px 8px;text-align:center;color:${e.status === 'pass' ? '#2e7d32' : '#c62828'};font-weight:bold">${String(e.status).toUpperCase()}</td>
                              </tr>`
                            ).join("");
                            const html = `<!DOCTYPE html><html><head><title>${testLog.testTitle} - Results</title>
                              <style>body{font-family:Arial,sans-serif;padding:20px}h2{color:#c62828}table{width:100%;border-collapse:collapse}th{background:#c62828;color:white;padding:8px;text-align:left}td{border-bottom:1px solid #eee;padding:6px 8px}</style></head>
                              <body><h2>${testLog.testTitle}</h2>
                              <p>Date: ${testLog.createdAt ? new Date(testLog.createdAt).toLocaleDateString() : "N/A"} | Participants: ${testLog.totalParticipants} | Marks/Q: ${testLog.marksPerQuestion} | Negative: -${testLog.negativeMarks}</p>
                              <table><thead><tr><th>#</th><th>Roll No</th><th>Name</th><th>Correct</th><th>Wrong</th><th>Skipped</th><th>Marks</th><th>%</th><th>Result</th></tr></thead>
                              <tbody>${rows}</tbody></table></body></html>`;
                            if (typeof window !== "undefined" && window.document) {
                              const w = window.open("", "_blank");
                              if (w) { w.document.write(html); w.document.close(); w.print(); }
                            } else {
                              Alert.alert("PDF Export", "PDF export is available on the web version of this portal. Open the app in a browser to download.");
                            }
                          }}
                          style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, padding: 6 }}
                        >
                          <Ionicons name="download-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                        <Ionicons name={expandedTestId === testLog.testId ? "chevron-up" : "chevron-down"} size={18} color="#fff" />
                      </View>
                    </TouchableOpacity>

                    {/* Expandable Leaderboard Table */}
                    {expandedTestId === testLog.testId && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={{ minWidth: 720 }}>
                          {/* Table Header */}
                          <View style={{ flexDirection: "row", backgroundColor: "#f5f5f5", paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: "#e0e0e0" }}>
                            {["#", "Roll No", "Name", "Correct", "Wrong", "Skipped", "Marks", "%", "Result"].map((h, i) => (
                              <Text key={i} style={{
                                fontWeight: "bold", fontSize: 11, color: "#555",
                                width: i === 0 ? 36 : i === 1 ? 90 : i === 2 ? 130 : i === 3 ? 64 : i === 4 ? 64 : i === 5 ? 64 : i === 6 ? 90 : i === 7 ? 50 : 70
                              }}>{h}</Text>
                            ))}
                          </View>
                          {/* Table Rows */}
                          {(testLog.entries || []).map((entry: any, idx: number) => (
                            <View key={entry.attemptId || idx} style={{ flexDirection: "row", paddingVertical: 10, paddingHorizontal: 10, borderBottomWidth: 1, borderColor: "#f0f0f0", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                              <Text style={{ width: 36, fontSize: 12, color: idx === 0 ? "#fbc02d" : "#757575", fontWeight: "bold" }}>#{entry.serialNo}</Text>
                              <Text style={{ width: 90, fontSize: 12, color: "#212121" }}>{entry.rollNumber}</Text>
                              <Text style={{ width: 130, fontSize: 12, color: "#212121" }} numberOfLines={1}>{entry.studentName}</Text>
                              <Text style={{ width: 64, fontSize: 12, color: "#2e7d32", fontWeight: "bold", textAlign: "center" }}>{entry.correct}</Text>
                              <Text style={{ width: 64, fontSize: 12, color: "#c62828", fontWeight: "bold", textAlign: "center" }}>{entry.wrong}</Text>
                              <Text style={{ width: 64, fontSize: 12, color: "#757575", textAlign: "center" }}>{entry.skipped}</Text>
                              <Text style={{ width: 90, fontSize: 12, fontWeight: "bold", color: "#1a237e" }}>{entry.obtainedMarks} / {entry.totalMarks}</Text>
                              <Text style={{ width: 50, fontSize: 12, color: "#555" }}>{Math.round(entry.percentage)}%</Text>
                              <View style={{ width: 70, backgroundColor: entry.status === "pass" ? "#e8f5e9" : "#ffebee", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "center" }}>
                                <Text style={{ fontSize: 10, fontWeight: "bold", color: entry.status === "pass" ? "#2e7d32" : "#c62828", textAlign: "center" }}>{String(entry.status).toUpperCase()}</Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        )}

        {/* ================== 3. ERP SYSTEM (Sidebar Layout) ================== */}
        {activeTab === "erp" && (
          <View style={styles.splitLayout}>
            {/* Sidebar on the left */}
            {!erpSidebarCollapsed && (
              <View style={[styles.sidebar, darkMode && styles.sidebarDark, { height: "100%", paddingHorizontal: 5, position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2000, shadowColor: "#000", shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 8 }]}>
                {/* Close Sidebar Button (Arrow Button below menu bar) */}
                <TouchableOpacity
                  onPress={() => setErpSidebarCollapsed(true)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: darkMode ? "#c6282820" : "#ffebee",
                    borderWidth: 1,
                    borderColor: darkMode ? "#c6282840" : "#ffcdd2",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 15,
                  }}
                >
                  <Ionicons name="arrow-back-outline" size={20} color="#c62828" />
                </TouchableOpacity>

                {/* Scrollable list of tabs */}
                <ScrollView
                  style={{ width: "100%" }}
                  contentContainerStyle={{ alignItems: "center", gap: 12, paddingBottom: 60 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* ADMIN / STAFF ONLY TABS */}
                  {isAdmin && (
                    <>
                      <TouchableOpacity onPress={() => changeErpSub("students")} style={[styles.sidebarTab, erpSub === "students" && styles.sidebarTabActive]}>
                        <Ionicons name="people-outline" size={20} color={erpSub === "students" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "students" && styles.sidebarTabTxtActive]}>Students</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeErpSub("staff")} style={[styles.sidebarTab, erpSub === "staff" && styles.sidebarTabActive]}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={erpSub === "staff" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "staff" && styles.sidebarTabTxtActive]}>Admin</Text>
                      </TouchableOpacity>
                      {(user.role === "super_admin" || user.role === "developer") && (
                        <>
                          <TouchableOpacity onPress={() => changeErpSub("permissions")} style={[styles.sidebarTab, erpSub === "permissions" && styles.sidebarTabActive]}>
                            <Ionicons name="key-outline" size={20} color={erpSub === "permissions" ? "#c62828" : "#757575"} />
                            <Text style={[styles.sidebarTabTxt, erpSub === "permissions" && styles.sidebarTabTxtActive]}>Permissions</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { changeErpSub("approvals"); loadPendingApprovals(); }} style={[styles.sidebarTab, erpSub === "approvals" && styles.sidebarTabActive]}>
                            <Ionicons name="checkmark-circle-outline" size={20} color={erpSub === "approvals" ? "#c62828" : "#757575"} />
                            <Text style={[styles.sidebarTabTxt, erpSub === "approvals" && styles.sidebarTabTxtActive]}>
                              Delete Approvals
                              {pendingApprovals.length > 0 && (
                                <Text style={{ color: "#c62828", fontWeight: "bold" }}> ({pendingApprovals.length})</Text>
                              )}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                      <TouchableOpacity onPress={() => changeErpSub("id-card")} style={[styles.sidebarTab, erpSub === "id-card" && styles.sidebarTabActive]}>
                        <Ionicons name="card-outline" size={20} color={erpSub === "id-card" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "id-card" && styles.sidebarTabTxtActive]}>ID Cards</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeErpSub("batch")} style={[styles.sidebarTab, erpSub === "batch" && styles.sidebarTabActive]}>
                        <Ionicons name="layers-outline" size={20} color={erpSub === "batch" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "batch" && styles.sidebarTabTxtActive]}>Batches</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { changeErpSub("profile-requests"); loadProfileRequests(); }} style={[styles.sidebarTab, erpSub === "profile-requests" && styles.sidebarTabActive]}>
                        <Ionicons name="person-add-outline" size={20} color={erpSub === "profile-requests" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "profile-requests" && styles.sidebarTabTxtActive]}>
                          Profile Requests
                          {profileRequests.filter((r: any) => r.status === "pending").length > 0 && (
                            <Text style={{ color: "#c62828", fontWeight: "bold" }}> ({profileRequests.filter((r: any) => r.status === "pending").length})</Text>
                          )}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeErpSub("announcements")} style={[styles.sidebarTab, erpSub === "announcements" && styles.sidebarTabActive]}>
                        <Ionicons name="megaphone-outline" size={20} color={erpSub === "announcements" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "announcements" && styles.sidebarTabTxtActive]}>Notices</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeErpSub("analytics")} style={[styles.sidebarTab, erpSub === "analytics" && styles.sidebarTabActive]}>
                        <Ionicons name="analytics-outline" size={20} color={erpSub === "analytics" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "analytics" && styles.sidebarTabTxtActive]}>Analytics</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeErpSub("fees")} style={[styles.sidebarTab, erpSub === "fees" && styles.sidebarTabActive]}>
                        <Ionicons name="cash-outline" size={20} color={erpSub === "fees" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "fees" && styles.sidebarTabTxtActive]}>Fees</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { changeErpSub("marks"); if (tests.length > 0) { setSelectedErpTestId(tests[0].id); loadErpTestResults(tests[0].id); } }} style={[styles.sidebarTab, erpSub === "marks" && styles.sidebarTabActive]}>
                        <Ionicons name="checkbox-outline" size={20} color={erpSub === "marks" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "marks" && styles.sidebarTabTxtActive]}>Marks</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* STUDENT-ONLY TABS */}
                  {user.role === "student" && (
                    <>
                      <TouchableOpacity onPress={() => { changeErpSub("my-profile"); const myStudent = getLoggedInStudent(user, students); if (myStudent) loadMyProfileRequest(myStudent.id); }} style={[styles.sidebarTab, erpSub === "my-profile" && styles.sidebarTabActive]}>
                        <Ionicons name="person-circle-outline" size={20} color={erpSub === "my-profile" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "my-profile" && styles.sidebarTabTxtActive]}>My Profile</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeErpSub("analytics")} style={[styles.sidebarTab, erpSub === "analytics" && styles.sidebarTabActive]}>
                        <Ionicons name="analytics-outline" size={20} color={erpSub === "analytics" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "analytics" && styles.sidebarTabTxtActive]}>My Analytics</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => { changeErpSub("marks"); if (tests.length > 0) { setSelectedErpTestId(tests[0].id); loadErpTestResults(tests[0].id); } }} style={[styles.sidebarTab, erpSub === "marks" && styles.sidebarTabActive]}>
                        <Ionicons name="checkbox-outline" size={20} color={erpSub === "marks" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "marks" && styles.sidebarTabTxtActive]}>My Marks</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeErpSub("fees")} style={[styles.sidebarTab, erpSub === "fees" && styles.sidebarTabActive]}>
                        <Ionicons name="cash-outline" size={20} color={erpSub === "fees" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "fees" && styles.sidebarTabTxtActive]}>My Fees</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => changeErpSub("id-card")} style={[styles.sidebarTab, erpSub === "id-card" && styles.sidebarTabActive]}>
                        <Ionicons name="card-outline" size={20} color={erpSub === "id-card" ? "#c62828" : "#757575"} />
                        <Text style={[styles.sidebarTabTxt, erpSub === "id-card" && styles.sidebarTabTxtActive]}>My ID & Hall Ticket</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>
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
                    backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: darkMode ? "#333" : "#e0e0e0",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2.5,
                    elevation: 4
                  }}
                >
                  <Ionicons name="arrow-forward-outline" size={20} color="#c62828" />
                </TouchableOpacity>
              )}
              <ScrollView style={[styles.splitContent, { paddingTop: 50 }]} contentContainerStyle={{ paddingBottom: 80 }}>
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
                        <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>{editingStudent ? "✏️ Edit Student Profile" : "➕ Register New Student"}</Text>
                        {editingStudent ? (
                          <>
                            {/* Account Credentials */}
                            <Text style={{ fontWeight: "bold", color: "#0288d1", marginBottom: 6, fontSize: 13 }}>🔐 Login Credentials</Text>
                            <TextInput style={styles.input} placeholder="Username / Roll Number *" placeholderTextColor="#999" value={editingStudent.loginUsername} onChangeText={u => setEditingStudent({ ...editingStudent, loginUsername: u })} autoCapitalize="none" />
                            <TextInput style={styles.input} placeholder="Password (leave empty to keep current)" secureTextEntry placeholderTextColor="#999" value={editingStudent.loginPassword || ""} onChangeText={pw => setEditingStudent({ ...editingStudent, loginPassword: pw })} />

                            {/* Contact Details */}
                            <Text style={{ fontWeight: "bold", color: "#0288d1", marginBottom: 6, marginTop: 6, fontSize: 13 }}>📞 Contact Details</Text>
                            <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#999" value={editingStudent.phone} onChangeText={p => setEditingStudent({ ...editingStudent, phone: p })} keyboardType="phone-pad" />

                            {/* Batch & Course */}
                            <Text style={{ fontWeight: "bold", color: "#0288d1", marginBottom: 6, marginTop: 10, fontSize: 13 }}>📚 Batch & Course</Text>
                            {batches.length === 0 ? (
                              <View style={{ backgroundColor: "#fff3e0", padding: 10, borderRadius: 8, marginBottom: 8 }}>
                                <Text style={{ color: "#e65100", fontSize: 12 }}>⚠️ No batches found.</Text>
                              </View>
                            ) : (
                              <>
                                <View style={{ backgroundColor: "#f9f9f9", borderRadius: 8, borderWidth: 1, borderColor: "#e0e0e0", marginBottom: 8, overflow: "hidden" }}>
                                  <Text style={{ padding: 8, color: "#999", fontSize: 12, borderBottomWidth: 1, borderColor: "#e0e0e0" }}>Select Batch *</Text>
                                  {batches.map(b => (
                                    <TouchableOpacity
                                      key={b.id}
                                      onPress={() => setEditingStudent({ ...editingStudent, batch: b.batchName, course: b.course })}
                                      style={{ flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: editingStudent.batch === b.batchName ? "#e3f2fd" : "transparent", borderBottomWidth: 1, borderColor: "#f0f0f0" }}
                                    >
                                      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: editingStudent.batch === b.batchName ? "#0288d1" : "#bbb", backgroundColor: editingStudent.batch === b.batchName ? "#0288d1" : "transparent", marginRight: 10 }} />
                                      <Text style={{ color: "#212121", fontWeight: editingStudent.batch === b.batchName ? "bold" : "normal" }}>{b.batchName}</Text>
                                      <Text style={{ color: "#757575", fontSize: 12, marginLeft: 8 }}>— {b.course}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                                {editingStudent.course !== "" && editingStudent.course !== undefined && (
                                  <View style={{ backgroundColor: "#e8f5e9", padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                    <Text style={{ color: "#2e7d32", fontSize: 12 }}>✅ Course auto-selected: <Text style={{ fontWeight: "bold" }}>{editingStudent.course}</Text></Text>
                                  </View>
                                )}
                              </>
                            )}
                            {/* Enrollment Type */}
                            <Text style={{ fontWeight: "bold", color: "#0288d1", marginBottom: 6, marginTop: 6, fontSize: 13 }}>🎓 Enrollment Type</Text>
                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                              {["offline", "online"].map(t => (
                                <TouchableOpacity
                                  key={t}
                                  onPress={() => setEditingStudent({ ...editingStudent, type: t })}
                                  style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: editingStudent.type === t ? "#0288d1" : "#e0e0e0", backgroundColor: editingStudent.type === t ? "#e3f2fd" : "#f9f9f9", alignItems: "center" }}
                                >
                                  <Text style={{ color: editingStudent.type === t ? "#0288d1" : "#757575", fontWeight: editingStudent.type === t ? "bold" : "normal", textTransform: "capitalize" }}>{t === "offline" ? "🏛️ Offline" : "💻 Online"}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {/* Fee Details */}
                            <Text style={{ fontWeight: "bold", color: "#0288d1", marginBottom: 6, fontSize: 13 }}>💰 Fee & Attendance Details</Text>
                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}>
                              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Total Fees (₹)" placeholderTextColor="#999" value={editingStudent.totalFees !== undefined ? String(editingStudent.totalFees) : ""} onChangeText={v => setEditingStudent({ ...editingStudent, totalFees: v })} keyboardType="numeric" />
                              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Fees Paid (₹)" placeholderTextColor="#999" value={editingStudent.feesPaid !== undefined ? String(editingStudent.feesPaid) : ""} onChangeText={v => setEditingStudent({ ...editingStudent, feesPaid: v })} keyboardType="numeric" />
                            </View>
                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}>
                              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Attended Days" placeholderTextColor="#999" value={editingStudent.attendedDays !== undefined ? String(editingStudent.attendedDays) : ""} onChangeText={v => setEditingStudent({ ...editingStudent, attendedDays: v })} keyboardType="numeric" />
                              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Total Days" placeholderTextColor="#999" value={editingStudent.totalDays !== undefined ? String(editingStudent.totalDays) : ""} onChangeText={v => setEditingStudent({ ...editingStudent, totalDays: v })} keyboardType="numeric" />
                            </View>

                            {/* Joining Date */}
                            <Text style={{ fontWeight: "bold", color: "#0288d1", marginBottom: 6, marginTop: 6, fontSize: 13 }}>📅 Joining Date</Text>
                            <TouchableOpacity
                              onPress={() => openCalendar("editingStudent", editingStudent.joiningDate)}
                              style={{
                                padding: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: "#e0e0e0",
                                marginBottom: 10,
                                backgroundColor: "#fafafa",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between"
                              }}
                            >
                              <Text style={{ color: editingStudent.joiningDate ? "#212121" : "#999", fontSize: 14 }}>
                                {editingStudent.joiningDate || "Select Joining Date (YYYY-MM-DD)"}
                              </Text>
                              <Ionicons name="calendar-outline" size={18} color="#757575" />
                            </TouchableOpacity>
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
                            {/* Account Credentials */}
                            <Text style={{ fontWeight: "bold", color: "#c62828", marginBottom: 6, fontSize: 13 }}>🔐 Login Credentials</Text>
                            <TextInput style={styles.input} placeholder="Username / Roll Number *" placeholderTextColor="#999" value={newStudent.loginUsername} onChangeText={u => setNewStudent({ ...newStudent, loginUsername: u })} autoCapitalize="none" />
                            <TextInput style={styles.input} placeholder="Password *" secureTextEntry placeholderTextColor="#999" value={newStudent.loginPassword} onChangeText={pw => setNewStudent({ ...newStudent, loginPassword: pw })} />

                            {/* Batch & Course */}
                            <Text style={{ fontWeight: "bold", color: "#c62828", marginBottom: 6, marginTop: 10, fontSize: 13 }}>📚 Batch & Course</Text>
                            {batches.length === 0 ? (
                              <View style={{ backgroundColor: "#fff3e0", padding: 10, borderRadius: 8, marginBottom: 8 }}>
                                <Text style={{ color: "#e65100", fontSize: 12 }}>⚠️ No batches found. Please add batches in the Batches section first.</Text>
                              </View>
                            ) : (
                              <>
                                <View style={{ backgroundColor: "#f9f9f9", borderRadius: 8, borderWidth: 1, borderColor: "#e0e0e0", marginBottom: 8, overflow: "hidden" }}>
                                  <Text style={{ padding: 8, color: "#999", fontSize: 12, borderBottomWidth: 1, borderColor: "#e0e0e0" }}>Select Batch *</Text>
                                  {batches.map(b => (
                                    <TouchableOpacity
                                      key={b.id}
                                      onPress={() => setNewStudent({ ...newStudent, batch: b.batchName, course: b.course })}
                                      style={{ flexDirection: "row", alignItems: "center", padding: 10, backgroundColor: newStudent.batch === b.batchName ? "#e3f2fd" : "transparent", borderBottomWidth: 1, borderColor: "#f0f0f0" }}
                                    >
                                      <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: newStudent.batch === b.batchName ? "#1976d2" : "#bbb", backgroundColor: newStudent.batch === b.batchName ? "#1976d2" : "transparent", marginRight: 10 }} />
                                      <Text style={{ color: "#212121", fontWeight: newStudent.batch === b.batchName ? "bold" : "normal" }}>{b.batchName}</Text>
                                      <Text style={{ color: "#757575", fontSize: 12, marginLeft: 8 }}>— {b.course}</Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                                {newStudent.course !== "" && (
                                  <View style={{ backgroundColor: "#e8f5e9", padding: 8, borderRadius: 6, marginBottom: 8 }}>
                                    <Text style={{ color: "#2e7d32", fontSize: 12 }}>✅ Course auto-selected: <Text style={{ fontWeight: "bold" }}>{newStudent.course}</Text></Text>
                                  </View>
                                )}
                              </>
                            )}
                            {/* Enrollment Type */}
                            <Text style={{ fontWeight: "bold", color: "#c62828", marginBottom: 6, marginTop: 6, fontSize: 13 }}>🎓 Enrollment Type</Text>
                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                              {["offline", "online"].map(t => (
                                <TouchableOpacity
                                  key={t}
                                  onPress={() => setNewStudent({ ...newStudent, type: t })}
                                  style={{ flex: 1, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: newStudent.type === t ? "#c62828" : "#e0e0e0", backgroundColor: newStudent.type === t ? "#ffebee" : "#f9f9f9", alignItems: "center" }}
                                >
                                  <Text style={{ color: newStudent.type === t ? "#c62828" : "#757575", fontWeight: newStudent.type === t ? "bold" : "normal", textTransform: "capitalize" }}>{t === "offline" ? "🏛️ Offline" : "💻 Online"}</Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            <Text style={{ fontWeight: "bold", color: "#c62828", marginBottom: 6, fontSize: 13 }}>💰 Fee Details</Text>
                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 6 }}>
                              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Total Fees (₹)" placeholderTextColor="#999" value={newStudent.totalFees} onChangeText={v => setNewStudent({ ...newStudent, totalFees: v })} keyboardType="numeric" />
                              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Fees Paid (₹)" placeholderTextColor="#999" value={newStudent.feesPaid} onChangeText={v => setNewStudent({ ...newStudent, feesPaid: v })} keyboardType="numeric" />
                            </View>

                            {/* Joining Date */}
                            <Text style={{ fontWeight: "bold", color: "#c62828", marginBottom: 6, marginTop: 6, fontSize: 13 }}>📅 Joining Date</Text>
                            <TouchableOpacity
                              onPress={() => openCalendar("newStudent", newStudent.joiningDate)}
                              style={{
                                padding: 12,
                                borderRadius: 8,
                                borderWidth: 1,
                                borderColor: "#e0e0e0",
                                marginBottom: 10,
                                backgroundColor: "#fafafa",
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between"
                              }}
                            >
                              <Text style={{ color: newStudent.joiningDate ? "#212121" : "#999", fontSize: 14 }}>
                                {newStudent.joiningDate || "Select Joining Date (YYYY-MM-DD)"}
                              </Text>
                              <Ionicons name="calendar-outline" size={18} color="#757575" />
                            </TouchableOpacity>

                            {/* Contact Details */}
                            <Text style={{ fontWeight: "bold", color: "#757575", marginBottom: 6, fontSize: 13 }}>📞 Contact Details</Text>
                            <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#999" value={newStudent.phone} onChangeText={p => setNewStudent({ ...newStudent, phone: p })} keyboardType="phone-pad" />

                            <TouchableOpacity onPress={createStudentRecord} style={[styles.primaryBtn, { marginTop: 10 }]}>
                              <Text style={styles.primaryBtnTxt}>✅ Create Student Account</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}

                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>Registered Student Directory ({students.length})</Text>

                      {/* Search & Filter Controls */}
                      <View style={{ gap: 10, marginBottom: 15 }}>
                        <View style={{ flexDirection: "row", gap: 8 }}>
                          <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            placeholder="🔍 Search student name or roll number..."
                            placeholderTextColor="#999"
                            value={searchDirQuery}
                            onChangeText={setSearchDirQuery}
                          />
                          {searchDirQuery ? (
                            <TouchableOpacity onPress={() => setSearchDirQuery("")} style={{ padding: 10, backgroundColor: "#eeeeee", borderRadius: 8, justifyContent: "center" }}>
                              <Text style={{ fontSize: 11, color: "#333" }}>Clear</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                          {/* Batch Filter Dropdown */}
                          <View style={{ flex: 1, minWidth: 150 }}>
                            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#555", marginBottom: 4 }}>Filter Batch:</Text>
                            <View style={{ zIndex: 1100, position: "relative" }}>
                              <TouchableOpacity
                                onPress={() => {
                                  setShowBatchFilterDropdown(!showBatchFilterDropdown);
                                  setShowTypeFilterDropdown(false);
                                }}
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  borderWidth: 1,
                                  borderColor: "#e0e0e0",
                                  borderRadius: 8,
                                  padding: 10,
                                  backgroundColor: "#f9f9f9"
                                }}
                              >
                                <Text style={{ fontSize: 12, color: "#212121" }}>
                                  {filterDirBatch === "all" ? "All Batches" : filterDirBatch}
                                </Text>
                                <Ionicons name={showBatchFilterDropdown ? "chevron-up" : "chevron-down"} size={14} color="#757575" />
                              </TouchableOpacity>
                              {showBatchFilterDropdown && (
                                <View style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: 0,
                                  right: 0,
                                  borderWidth: 1,
                                  borderColor: "#e0e0e0",
                                  borderRadius: 8,
                                  backgroundColor: "#ffffff",
                                  marginTop: 4,
                                  overflow: "hidden",
                                  zIndex: 1101,
                                  maxHeight: 150,
                                  shadowColor: "#000",
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.1,
                                  shadowRadius: 2,
                                  elevation: 3
                                }}>
                                  <ScrollView nestedScrollEnabled={true}>
                                    <TouchableOpacity
                                      onPress={() => {
                                        setFilterDirBatch("all");
                                        setShowBatchFilterDropdown(false);
                                      }}
                                      style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: filterDirBatch === "all" ? "#e3f2fd" : "#ffffff" }}
                                    >
                                      <Text style={{ fontSize: 12, color: filterDirBatch === "all" ? "#1976d2" : "#212121" }}>All Batches</Text>
                                    </TouchableOpacity>
                                    {batches.map((b: any) => (
                                      <TouchableOpacity
                                        key={b.id}
                                        onPress={() => {
                                          setFilterDirBatch(b.batchName);
                                          setShowBatchFilterDropdown(false);
                                        }}
                                        style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: filterDirBatch === b.batchName ? "#e3f2fd" : "#ffffff" }}
                                      >
                                        <Text style={{ fontSize: 12, color: filterDirBatch === b.batchName ? "#1976d2" : "#212121" }}>{b.batchName}</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Type Filter Buttons */}
                          <View style={{ flex: 1, minWidth: 180 }}>
                            <Text style={{ fontSize: 11, fontWeight: "bold", color: "#555", marginBottom: 4 }}>Filter Type:</Text>
                            <View style={{ flexDirection: "row", gap: 5 }}>
                              {(["all", "offline", "online"] as const).map(t => {
                                const isSelected = filterDirType === t;
                                return (
                                  <TouchableOpacity
                                    key={t}
                                    onPress={() => setFilterDirType(t)}
                                    style={{
                                      flex: 1,
                                      paddingVertical: 8,
                                      borderRadius: 6,
                                      borderWidth: 1,
                                      borderColor: isSelected ? "#c62828" : "#e0e0e0",
                                      backgroundColor: isSelected ? "#ffebee" : "#f9f9f9",
                                      alignItems: "center"
                                    }}
                                  >
                                    <Text style={{ fontSize: 11, color: isSelected ? "#c62828" : "#555", fontWeight: isSelected ? "bold" : "normal" }}>
                                      {t.toUpperCase()}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Main Directory Split Layout */}
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 15 }}>
                        {/* Left List Pane */}
                        <View style={{ flex: 1, minWidth: 280, maxHeight: 500 }}>
                          <ScrollView style={{ borderRightWidth: 1, borderRightColor: "#eeeeee", paddingRight: 8 }}>
                            {(() => {
                              const filtered = students.filter((s: any) => {
                                const q = searchDirQuery.toLowerCase();
                                const name = getStudentName(s).toLowerCase();
                                const roll = String(s.rollNumber || "").toLowerCase();
                                if (q && !name.includes(q) && !roll.includes(q)) return false;

                                if (filterDirBatch !== "all" && s.batch !== filterDirBatch) return false;
                                if (filterDirType !== "all" && String(s.type || "").toLowerCase() !== filterDirType.toLowerCase()) return false;

                                return true;
                              });

                              if (filtered.length === 0) {
                                return <Text style={styles.emptyText}>No matching students found.</Text>;
                              }

                              return filtered.map((s) => {
                                const isSelected = selectedDirectoryStudent?.id === s.id;
                                return (
                                  <TouchableOpacity
                                    key={s.id}
                                    onPress={() => setSelectedDirectoryStudent(s)}
                                    style={{
                                      padding: 12,
                                      borderRadius: 8,
                                      borderWidth: 1,
                                      borderColor: isSelected ? "#1976d2" : "#e0e0e0",
                                      backgroundColor: isSelected ? "#e3f2fd" : "#ffffff",
                                      marginBottom: 8
                                    }}
                                  >
                                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 13 }}>{getStudentName(s)}</Text>
                                        <Text style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>Roll: {s.rollNumber || "N/A"} | Batch: {s.batch || "N/A"}</Text>
                                      </View>
                                      <View style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: "#1976d2", borderRadius: 4 }}>
                                        <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "bold" }}>View Details</Text>
                                      </View>
                                    </View>
                                  </TouchableOpacity>
                                );
                              });
                            })()}
                          </ScrollView>
                        </View>

                          {/* Student Details Modal */}
                          {selectedDirectoryStudent && (
                            <Modal
                              visible={!!selectedDirectoryStudent}
                              transparent
                              animationType="fade"
                              onRequestClose={() => setSelectedDirectoryStudent(null)}
                            >
                              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }}>
                                <View style={{
                                  width: "100%",
                                  maxWidth: 500,
                                  maxHeight: "85%",
                                  backgroundColor: darkMode ? "rgba(30, 30, 30, 0.95)" : "rgba(255, 255, 255, 0.95)",
                                  borderRadius: 16,
                                  borderWidth: 1,
                                  borderColor: darkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)",
                                  padding: 20,
                                  shadowColor: "#000",
                                  shadowOffset: { width: 0, height: 10 },
                                  shadowOpacity: 0.25,
                                  shadowRadius: 10,
                                  elevation: 10,
                                }}>
                                  {/* Header with Title and Close Icon */}
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15, borderBottomWidth: 1, borderBottomColor: darkMode ? "#444" : "#eee", paddingBottom: 10 }}>
                                    <Text style={{ fontSize: 18, fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>Candidate Profile Details</Text>
                                    <TouchableOpacity onPress={() => setSelectedDirectoryStudent(null)} style={{ padding: 4 }}>
                                      <Ionicons name="close-circle-outline" size={26} color={darkMode ? "#ff8a80" : "#d32f2f"} />
                                    </TouchableOpacity>
                                  </View>

                                  {/* Scrollable Content */}
                                  {(() => {
                                    const s = selectedDirectoryStudent;
                                    const hasPhoto = !!s.photoBase64;
                                    const hasPhotoId = !!s.photoIdBase64;
                                    return (
                                      <ScrollView showsVerticalScrollIndicator={false}>
                                        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 12 }}>
                                          <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#e0e0e0", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
                                            {hasPhoto && s.photoBase64 !== "test" ? (
                                              <Image source={{ uri: s.photoBase64 }} style={{ width: "100%", height: "100%" }} />
                                            ) : (
                                              <Ionicons name="person" size={28} color="#999" />
                                            )}
                                          </View>
                                          <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 16, fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>{getStudentName(s)}</Text>
                                            <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                                              <View style={{ backgroundColor: darkMode ? "#c6282820" : "#e0f7fa", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                <Text style={{ color: darkMode ? "#ff8a80" : "#006064", fontSize: 10, fontWeight: "bold" }}>{(s.type || "offline").toUpperCase()}</Text>
                                              </View>
                                              <View style={{ backgroundColor: darkMode ? "#2e7d3220" : "#e8f5e9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                                                <Text style={{ color: darkMode ? "#81c784" : "#2e7d32", fontSize: 10, fontWeight: "bold" }}>{s.batch || "No Batch"}</Text>
                                              </View>
                                            </View>
                                          </View>
                                        </View>

                                        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: darkMode ? "#444" : "#eeeeee", paddingTop: 10 }}>
                                          <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555" }}><Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>Roll Number:</Text> {s.rollNumber || "N/A"}</Text>
                                          <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555" }}><Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>Course:</Text> {s.course || "N/A"}</Text>
                                          <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555" }}><Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>Email:</Text> {s.email || "N/A"}</Text>
                                          <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555" }}><Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>Phone:</Text> {s.phone || "N/A"}</Text>
                                          <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555" }}><Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>DOB:</Text> {s.dateOfBirth || "N/A"}</Text>
                                          <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555" }}><Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>Blood Group:</Text> {s.bloodGroup || "N/A"}</Text>
                                          <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555" }}><Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>Address:</Text> {s.address || "N/A"}</Text>
                                          <Text style={{ fontSize: 13, color: darkMode ? "#ccc" : "#555" }}><Text style={{ fontWeight: "bold", color: darkMode ? "#fff" : "#212121" }}>Approved Date:</Text> {s.approvedAt ? new Date(s.approvedAt).toLocaleString() : "Pending"}</Text>
                                        </View>

                                        {/* Media Attachments */}
                                        <View style={{ flexDirection: "row", gap: 10, marginTop: 15, borderTopWidth: 1, borderTopColor: darkMode ? "#444" : "#eeeeee", paddingTop: 10 }}>
                                          <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 11, fontWeight: "bold", color: darkMode ? "#aaa" : "#757575", marginBottom: 4 }}>Passport Photo</Text>
                                            {hasPhoto ? (
                                              <TouchableOpacity onPress={() => {
                                                if (s.photoBase64 === "test") {
                                                  Alert.alert("Passport Photo (Mock)", "This is a mock placeholder uploaded by the student.");
                                                } else {
                                                  setPreviewImageTitle("Passport Photo");
                                                  setPreviewImageUri(s.photoBase64);
                                                }
                                              }} style={{ padding: 8, backgroundColor: darkMode ? "#0288d120" : "#e3f2fd", borderRadius: 4, alignItems: "center" }}>
                                                <Text style={{ color: "#1976d2", fontSize: 11, fontWeight: "bold" }}>View Image</Text>
                                              </TouchableOpacity>
                                            ) : (
                                              <Text style={{ color: "#c62828", fontSize: 11, fontWeight: "bold" }}>Pending</Text>
                                            )}
                                          </View>
                                          <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 11, fontWeight: "bold", color: darkMode ? "#aaa" : "#757575", marginBottom: 4 }}>Photo ID</Text>
                                            {hasPhotoId ? (
                                              <TouchableOpacity onPress={() => {
                                                if (s.photoIdBase64 === "test") {
                                                  Alert.alert(`${s.photoIdType || "Photo ID"} (Mock)`, "This is a mock placeholder uploaded by the student.");
                                                } else {
                                                  setPreviewImageTitle(s.photoIdType || "Photo ID");
                                                  setPreviewImageUri(s.photoIdBase64);
                                                }
                                              }} style={{ padding: 8, backgroundColor: darkMode ? "#0288d120" : "#e3f2fd", borderRadius: 4, alignItems: "center" }}>
                                                <Text style={{ color: "#1976d2", fontSize: 11, fontWeight: "bold" }}>View ID</Text>
                                              </TouchableOpacity>
                                            ) : (
                                              <Text style={{ color: "#c62828", fontSize: 11, fontWeight: "bold" }}>Pending</Text>
                                            )}
                                          </View>
                                        </View>

                                        {/* Action Buttons */}
                                        <View style={{ flexDirection: "row", gap: 10, marginTop: 15, borderTopWidth: 1, borderTopColor: darkMode ? "#444" : "#eeeeee", paddingTop: 10 }}>
                                          <TouchableOpacity
                                            onPress={() => { setSelectedDirectoryStudent(null); setEditingStudent(s); setShowStudentForm(true); }}
                                            style={{ flex: 1, flexDirection: "row", gap: 5, padding: 8, backgroundColor: "#0288d1", borderRadius: 4, justifyContent: "center", alignItems: "center" }}
                                          >
                                            <Ionicons name="create-outline" size={14} color="#ffffff" />
                                            <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "bold" }}>Edit</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            onPress={() => {
                                              deleteStudentRecord(s.id);
                                              setSelectedDirectoryStudent(null);
                                            }}
                                            style={{ flex: 1, flexDirection: "row", gap: 5, padding: 8, backgroundColor: "#d32f2f", borderRadius: 4, justifyContent: "center", alignItems: "center" }}
                                          >
                                            <Ionicons name="trash-outline" size={14} color="#ffffff" />
                                            <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "bold" }}>Delete</Text>
                                          </TouchableOpacity>
                                        </View>
                                      </ScrollView>
                                    );
                                  })()}
                                </View>
                              </View>
                            </Modal>
                          )}
                      </View>
                    </View>
                  </View>
                )}

                {erpSub === "announcements" && (user.role === "admin" || user.role === "staff") && (() => {
                  // filter announcements
                  const filteredNotices = announcements.filter(notice => {
                    const q = searchNoticeQuery.toLowerCase();
                    const matchesKeyword = notice.title.toLowerCase().includes(q) ||
                      notice.content.toLowerCase().includes(q) ||
                      (notice.createdBy && notice.createdBy.toLowerCase().includes(q));
                    const matchesDate = !searchNoticeDate ||
                      (notice.publishedAt && notice.publishedAt.startsWith(searchNoticeDate)) ||
                      (notice.createdAt && notice.createdAt.startsWith(searchNoticeDate));
                    return matchesKeyword && matchesDate;
                  });

                  return (
                    <View style={{ gap: 15 }}>
                      {/* Create/Edit Form */}
                      <View style={styles.card}>
                        <Text style={styles.sectionTitle}>
                          {editingNoticeId ? "✏️ Edit Notice & Notification" : "📝 Create New Notice & Notification"}
                        </Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Notice Title"
                          placeholderTextColor="#999"
                          value={editingNoticeId ? editingNotice.title : newNotice.title}
                          onChangeText={t => editingNoticeId ? setEditingNotice({ ...editingNotice, title: t }) : setNewNotice({ ...newNotice, title: t })}
                        />
                        <TextInput
                          style={[styles.input, { height: 80 }]}
                          placeholder="Notice Message Details"
                          placeholderTextColor="#999"
                          multiline
                          value={editingNoticeId ? editingNotice.content : newNotice.content}
                          onChangeText={c => editingNoticeId ? setEditingNotice({ ...editingNotice, content: c }) : setNewNotice({ ...newNotice, content: c })}
                        />

                        {/* Publish Date (only when editing or option to custom publish) */}
                        <Text style={styles.label}>Publish Date (YYYY-MM-DD):</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="e.g. 2026-07-15"
                          placeholderTextColor="#999"
                          value={editingNoticeId ? editingNotice.publishedAt : newNotice.publishedAt || new Date().toISOString().split("T")[0]}
                          onChangeText={d => {
                            if (editingNoticeId) {
                              setEditingNotice({ ...editingNotice, publishedAt: d });
                            } else {
                              setNewNotice({ ...newNotice, publishedAt: d });
                            }
                          }}
                        />

                        <Text style={styles.label}>Select Priority:</Text>
                        <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
                          {["normal", "high"].map(p => {
                            const currentPriority = editingNoticeId ? editingNotice.priority : newNotice.priority;
                            const isSelected = currentPriority === p;
                            return (
                              <TouchableOpacity
                                key={p}
                                onPress={() => editingNoticeId ? setEditingNotice({ ...editingNotice, priority: p }) : setNewNotice({ ...newNotice, priority: p })}
                                style={[styles.roleBtn, isSelected && styles.roleBtnActive]}
                              >
                                <Text style={[styles.roleBtnTxt, isSelected && styles.roleBtnTxtActive]}>{p.toUpperCase()}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <Text style={styles.label}>Target Audience:</Text>
                        <View style={{ zIndex: 1000, position: "relative", marginBottom: 12 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setShowTargetDropdown(!showTargetDropdown);
                              setShowBatchDropdown(false);
                            }}
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderWidth: 1,
                              borderColor: "#e0e0e0",
                              borderRadius: 8,
                              padding: 12,
                              backgroundColor: "#f9f9f9",
                              marginTop: 4
                            }}
                          >
                            <Text style={{ color: "#212121" }}>
                              {[
                                { key: "all", label: "All Users" },
                                { key: "free", label: "Free Users Only" },
                                { key: "paid", label: "Paid Users Only" },
                                { key: "batch", label: "Specific Batch" },
                                { key: "all_admins", label: "All Admins" },
                                { key: "super_admin", label: "Super Admin Only" },
                                { key: "admin", label: "Admin Only" },
                                { key: "editor", label: "Editor Only" },
                                { key: "contributor", label: "Contributor Only" }
                              ].find(t => t.key === (editingNoticeId ? editingNotice.targetDashboard : newNotice.targetDashboard))?.label || "Select Target"}
                            </Text>
                            <Ionicons name={showTargetDropdown ? "chevron-up" : "chevron-down"} size={16} color="#757575" />
                          </TouchableOpacity>
                          {showTargetDropdown && (
                            <View style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              borderWidth: 1,
                              borderColor: "#e0e0e0",
                              borderRadius: 8,
                              backgroundColor: "#ffffff",
                              marginTop: 4,
                              overflow: "hidden",
                              zIndex: 1001,
                              maxHeight: 250,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 2 },
                              shadowOpacity: 0.1,
                              shadowRadius: 2,
                              elevation: 3
                            }}>
                              <ScrollView nestedScrollEnabled={true}>
                                {[
                                  { key: "all", label: "All Users" },
                                  { key: "free", label: "Free Users Only" },
                                  { key: "paid", label: "Paid Users Only" },
                                  { key: "batch", label: "Specific Batch" },
                                  { key: "all_admins", label: "All Admins" },
                                  { key: "super_admin", label: "Super Admin Only" },
                                  { key: "admin", label: "Admin Only" },
                                  { key: "editor", label: "Editor Only" },
                                  { key: "contributor", label: "Contributor Only" }
                                ].map(grp => {
                                  const currentTarget = editingNoticeId ? editingNotice.targetDashboard : newNotice.targetDashboard;
                                  const isSelected = currentTarget === grp.key;
                                  return (
                                    <TouchableOpacity
                                      key={grp.key}
                                      onPress={() => {
                                        if (editingNoticeId) {
                                          setEditingNotice({ ...editingNotice, targetDashboard: grp.key });
                                        } else {
                                          setNewNotice({ ...newNotice, targetDashboard: grp.key });
                                        }
                                        setShowTargetDropdown(false);
                                      }}
                                      style={{
                                        padding: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: "#f0f0f0",
                                        backgroundColor: isSelected ? "#e3f2fd" : "#ffffff"
                                      }}
                                    >
                                      <Text style={{
                                        color: isSelected ? "#1976d2" : "#212121",
                                        fontWeight: isSelected ? "bold" : "normal"
                                      }}>
                                        {grp.label}
                                      </Text>
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </View>
                          )}
                        </View>

                        {/* Batch selector if targetGroup === "batch" */}
                        {((editingNoticeId ? editingNotice.targetDashboard : newNotice.targetDashboard) === "batch") && (
                          <View style={{ zIndex: 900, position: "relative", marginBottom: 12 }}>
                            <Text style={styles.label}>Select Target Batch:</Text>
                            <TouchableOpacity
                              onPress={() => {
                                setShowBatchDropdown(!showBatchDropdown);
                                setShowTargetDropdown(false);
                              }}
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                borderWidth: 1,
                                borderColor: "#e0e0e0",
                                borderRadius: 8,
                                padding: 12,
                                backgroundColor: "#f9f9f9",
                                marginTop: 4
                              }}
                            >
                              <Text style={{ color: "#212121" }}>
                                {(editingNoticeId ? editingNotice.targetBatch : newNotice.targetBatch) || "Select Batch"}
                              </Text>
                              <Ionicons name={showBatchDropdown ? "chevron-up" : "chevron-down"} size={16} color="#757575" />
                            </TouchableOpacity>
                            {showBatchDropdown && (
                              <View style={{
                                position: "absolute",
                                top: "100%",
                                left: 0,
                                right: 0,
                                borderWidth: 1,
                                borderColor: "#e0e0e0",
                                borderRadius: 8,
                                backgroundColor: "#ffffff",
                                marginTop: 4,
                                overflow: "hidden",
                                zIndex: 901,
                                maxHeight: 200,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                                elevation: 3
                              }}>
                                <ScrollView nestedScrollEnabled={true}>
                                  {batches.map((b: any) => {
                                    const currentBatch = editingNoticeId ? editingNotice.targetBatch : newNotice.targetBatch;
                                    const isSelected = currentBatch === b.batchName;
                                    return (
                                      <TouchableOpacity
                                        key={b.id}
                                        onPress={() => {
                                          if (editingNoticeId) {
                                            setEditingNotice({ ...editingNotice, targetBatch: b.batchName });
                                          } else {
                                            setNewNotice({ ...newNotice, targetBatch: b.batchName });
                                          }
                                          setShowBatchDropdown(false);
                                        }}
                                        style={{
                                          padding: 12,
                                          borderBottomWidth: 1,
                                          borderBottomColor: "#f0f0f0",
                                          backgroundColor: isSelected ? "#e3f2fd" : "#ffffff"
                                        }}
                                      >
                                        <Text style={{
                                          color: isSelected ? "#1976d2" : "#212121",
                                          fontWeight: isSelected ? "bold" : "normal"
                                        }}>
                                          {b.batchName}
                                        </Text>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </ScrollView>
                              </View>
                            )}
                          </View>
                        )}

                        <View style={{ flexDirection: "row", gap: 10 }}>
                          {editingNoticeId && (
                            <TouchableOpacity
                              onPress={() => setEditingNoticeId(null)}
                              style={[styles.outlineBtn, { flex: 1 }]}
                            >
                              <Text style={styles.outlineBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={editingNoticeId ? saveEditedNotice : createNotice}
                            style={[styles.primaryBtn, { flex: 2 }]}
                          >
                            <Text style={styles.primaryBtnTxt}>
                              {editingNoticeId ? "Save Changes" : "Publish Notice & Notification"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Search & Notice Registry */}
                      <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Active Notice Registry ({filteredNotices.length})</Text>

                        {/* Search Controls */}
                        <View style={{ flexDirection: "row", gap: 8, marginBottom: 15 }}>
                          <View style={{ flex: 2 }}>
                            <TextInput
                              style={[styles.input, { marginBottom: 0 }]}
                              placeholder="🔍 Search by keyword..."
                              placeholderTextColor="#999"
                              value={searchNoticeQuery}
                              onChangeText={setSearchNoticeQuery}
                            />
                          </View>
                          <View style={{ flex: 1.2 }}>
                            <TextInput
                              style={[styles.input, { marginBottom: 0 }]}
                              placeholder="📅 Date (YYYY-MM-DD)..."
                              placeholderTextColor="#999"
                              value={searchNoticeDate}
                              onChangeText={setSearchNoticeDate}
                            />
                          </View>
                        </View>

                        {filteredNotices.length === 0 ? (
                          <Text style={styles.emptyText}>No notices match your filters.</Text>
                        ) : (
                          filteredNotices.map(notice => {
                            const formattedDate = notice.publishedAt ? new Date(notice.publishedAt).toLocaleDateString() : (notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : "");
                            const targetLabel = String(notice.targetDashboard || "all").toUpperCase() + (notice.targetBatch ? ` (${notice.targetBatch})` : "");
                            return (
                              <View key={notice.id} style={{ borderBottomWidth: 1, borderColor: "#eeeeee", paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                    <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 14 }}>{notice.title}</Text>
                                    <View style={{ backgroundColor: notice.priority === "high" ? "#ffebee" : "#f5f5f5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                      <Text style={{ fontSize: 9, fontWeight: "bold", color: notice.priority === "high" ? "#c62828" : "#616161" }}>
                                        {(notice.priority || "normal").toUpperCase()}
                                      </Text>
                                    </View>
                                    <View style={{ backgroundColor: "#e8f5e9", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                      <Text style={{ fontSize: 9, fontWeight: "bold", color: "#2e7d32" }}>
                                        {targetLabel}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={{ fontSize: 13, color: "#424242", marginTop: 4 }}>{notice.content}</Text>
                                  <Text style={{ fontSize: 11, color: "#757575", marginTop: 6 }}>
                                    Published: {formattedDate} | By: {notice.createdBy || "Admin"}
                                  </Text>
                                </View>

                                <View style={{ flexDirection: "row", gap: 6 }}>
                                  <TouchableOpacity
                                    onPress={() => startEditingNotice(notice)}
                                    style={{ padding: 6, backgroundColor: "#1976d2", borderRadius: 4 }}
                                  >
                                    <Ionicons name="create-outline" size={14} color="#ffffff" />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    onPress={() => deleteNotice(notice.id)}
                                    style={{ padding: 6, backgroundColor: "#d32f2f", borderRadius: 4 }}
                                  >
                                    <Ionicons name="trash-outline" size={14} color="#ffffff" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })
                        )}
                      </View>
                    </View>
                  );
                })()}

                {/* BATCH MANAGEMENT SECTION */}
                {erpSub === "batch" && (user.role === "admin" || user.role === "staff") && (
                  <View style={{ gap: 15 }}>
                    <Text style={styles.sectionTitle}>Batch & Course Management</Text>

                    {/* Create Batch */}
                    <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#1976d2" }]}>
                      <Text style={{ fontWeight: "bold", fontSize: 14, color: "#1976d2", marginBottom: 10 }}>➕ Add New Batch</Text>
                      <TextInput style={styles.input} placeholder="Batch Name (e.g. Batch 43)" placeholderTextColor="#999" value={newBatch.batchName} onChangeText={v => setNewBatch({ ...newBatch, batchName: v })} />
                      <TextInput style={styles.input} placeholder="Course (e.g. LDC / UPSC GS / TNPSC)" placeholderTextColor="#999" value={newBatch.course} onChangeText={v => setNewBatch({ ...newBatch, course: v })} />
                      <TextInput style={styles.input} placeholder="Description (optional)" placeholderTextColor="#999" value={newBatch.description} onChangeText={v => setNewBatch({ ...newBatch, description: v })} />
                      <TouchableOpacity onPress={createBatch} style={styles.primaryBtn}>
                        <Text style={styles.primaryBtnTxt}>Save Batch</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Batches List */}
                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>All Batches ({batches.length})</Text>
                      {batches.length === 0 ? (
                        <Text style={styles.emptyText}>No batches created yet. Add one above.</Text>
                      ) : (
                        batches.map((b: any, idx: number) => (
                          <View key={b.id} style={{ flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 1, borderColor: "#f0f0f0", backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontWeight: "bold", color: "#212121" }}>{b.batchName}</Text>
                              <Text style={{ color: "#1976d2", fontSize: 13 }}>{b.course}</Text>
                              {b.description ? <Text style={{ color: "#9e9e9e", fontSize: 12 }}>{b.description}</Text> : null}
                            </View>
                            <TouchableOpacity onPress={() => deleteBatch(b.id)} style={{ backgroundColor: "#d32f2f", borderRadius: 6, padding: 8 }}>
                              <Ionicons name="trash-outline" size={16} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                )}

                {/* PROFILE COMPLETION REQUESTS SECTION (Admin) */}
                {erpSub === "profile-requests" && (user.role === "admin" || user.role === "staff") && (() => {
                  const pendingReqs = profileRequests.filter((r: any) => r.status === "pending");
                  return (
                    <View style={{ gap: 15 }}>
                      <Text style={styles.sectionTitle}>Student Profile Completion Requests</Text>
                      {pendingReqs.length === 0 ? (
                        <View style={[styles.card, { alignItems: "center", padding: 30 }]}>
                          <Ionicons name="checkmark-circle-outline" size={40} color="#4caf50" />
                          <Text style={{ color: "#757575", marginTop: 10 }}>No pending profile requests.</Text>
                        </View>
                      ) : (
                        pendingReqs.map((r: any) => (
                          <View key={r.id} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#f57c00" }]}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <Text style={{ fontWeight: "bold", fontSize: 15, color: "#212121" }}>{r.name || r.username}</Text>
                              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, backgroundColor: "#fff3e0" }}>
                                <Text style={{ fontSize: 11, fontWeight: "bold", color: "#f57c00", textTransform: "uppercase" }}>{r.status}</Text>
                              </View>
                            </View>
                            <Text style={{ color: "#757575", fontSize: 12, marginBottom: 4 }}>Username: {r.username} | DOB: {r.dob}</Text>
                            <Text style={{ color: "#757575", fontSize: 12, marginBottom: 4 }}>Blood Group: {r.bloodGroup || "—"} | ID Type: {r.photoIdType || "—"}</Text>
                            <Text style={{ color: "#757575", fontSize: 12, marginBottom: 8 }}>Address: {r.address || "—"}</Text>
                            {r.passportPhotoBase64 ? (
                              <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
                                <View style={{ alignItems: "center" }}>
                                  <Text style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>Passport Photo</Text>
                                  <Image source={{ uri: r.passportPhotoBase64 }} style={{ width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: "#e0e0e0" }} />
                                </View>
                                {r.photoIdBase64 && (
                                  <View style={{ alignItems: "center" }}>
                                    <Text style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>{r.photoIdType || "Photo ID"}</Text>
                                    <Image source={{ uri: r.photoIdBase64 }} style={{ width: 120, height: 80, borderRadius: 8, borderWidth: 1, borderColor: "#e0e0e0" }} />
                                  </View>
                                )}
                              </View>
                            ) : null}
                            <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                              <TouchableOpacity onPress={() => approveProfileRequest(r.id)} style={{ flex: 1, backgroundColor: "#4caf50", borderRadius: 8, padding: 10, alignItems: "center" }}>
                                <Text style={{ color: "#fff", fontWeight: "bold" }}>✅ Approve</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => rejectProfileRequest(r.id, "Please resubmit with correct documents.")} style={{ flex: 1, backgroundColor: "#c62828", borderRadius: 8, padding: 10, alignItems: "center" }}>
                                <Text style={{ color: "#fff", fontWeight: "bold" }}>❌ Reject</Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={{ color: "#bbb", fontSize: 11, marginTop: 6 }}>Submitted: {r.submittedAt ? new Date(r.submittedAt).toLocaleString() : "—"}</Text>
                          </View>
                        ))
                      )}
                    </View>
                  );
                })()}

                {/* STUDENT MY PROFILE SECTION */}
                {erpSub === "my-profile" && user.role === "student" && (
                  <View style={{ gap: 15 }}>
                    <Text style={styles.sectionTitle}>My Profile</Text>

                    {/* Status Banner */}
                    {myProfileRequest && (
                      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: myProfileRequest.status === "approved" ? "#4caf50" : myProfileRequest.status === "pending" ? "#f57c00" : "#c62828" }]}>
                        {myProfileRequest.status === "approved" && <Text style={{ color: "#4caf50", fontWeight: "bold" }}>✅ Your profile has been approved! Welcome, {myProfileRequest.name}.</Text>}
                        {myProfileRequest.status === "pending" && <Text style={{ color: "#f57c00", fontWeight: "bold" }}>⏳ Your profile completion request is pending admin review.</Text>}
                        {myProfileRequest.status === "rejected" && (
                          <>
                            <Text style={{ color: "#c62828", fontWeight: "bold", marginBottom: 4 }}>❌ Profile rejected. Please resubmit.</Text>
                            {myProfileRequest.rejectionReason && <Text style={{ color: "#757575", fontSize: 12 }}>Reason: {myProfileRequest.rejectionReason}</Text>}
                          </>
                        )}
                      </View>
                    )}

                    {/* Profile Form */}
                    {(!myProfileRequest || myProfileRequest.status === "rejected") && (() => {
                      const myStudent = getLoggedInStudent(user, students);
                      const rawCount = myStudent?.profileSubmitCount;
                      const count = typeof rawCount === "number" ? rawCount : (rawCount && typeof rawCount === "object" && typeof (rawCount as any).__increment === "number") ? (rawCount as any).__increment : 0;
                      if (count >= 3) {
                        return (
                          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#c62828" }]}>
                            <Text style={{ fontWeight: "bold", fontSize: 14, color: "#c62828", marginBottom: 12 }}>⚠️ Profile Completion Blocked</Text>
                            <Text style={{ color: "#c62828", fontSize: 13, fontWeight: "600", marginBottom: 8 }}>You have reached the maximum limit of 3 profile submission attempts.</Text>
                            <Text style={{ color: "#757575", fontSize: 12 }}>Please contact the administrator directly to complete your profile registration details.</Text>
                          </View>
                        );
                      }
                      return (
                        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#1976d2" }]}>
                          <Text style={{ fontWeight: "bold", fontSize: 14, color: "#1976d2", marginBottom: 6 }}>📋 Complete Your Profile</Text>
                          <Text style={{ color: "#e53935", fontSize: 11, marginBottom: 12, fontWeight: "600" }}>⚠️ Note: You have used {count} of 3 submission attempts.</Text>
                          <Text style={{ color: "#757575", fontSize: 12, marginBottom: 12 }}>Fill all fields and upload documents. Admin will review and approve your profile.</Text>

                          <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#999" value={profileForm.name} onChangeText={v => setProfileForm({ ...profileForm, name: v })} />

                          {/* DOB with age calc */}
                          <Text style={{ color: "#757575", fontSize: 12, marginBottom: 4 }}>Date of Birth *</Text>
                          <TouchableOpacity
                            onPress={() => openCalendar("profileForm", profileForm.dob)}
                            style={{
                              padding: 12,
                              borderRadius: 8,
                              borderWidth: 1,
                              borderColor: "#e0e0e0",
                              marginBottom: 8,
                              backgroundColor: "#fafafa",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-between"
                            }}
                          >
                            <Text style={{ color: profileForm.dob ? "#212121" : "#999", fontSize: 14 }}>
                              {profileForm.dob || "Select Date of Birth (YYYY-MM-DD) *"}
                            </Text>
                            <Ionicons name="calendar-outline" size={18} color="#757575" />
                          </TouchableOpacity>
                          {profileForm.dob && (() => {
                            const dob = new Date(profileForm.dob);
                            const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));
                            return age > 0 ? <Text style={{ color: "#1976d2", fontSize: 12, marginBottom: 8 }}>Age: {age} years</Text> : null;
                          })()}

                          {/* Blood Group */}
                          <Text style={{ color: "#757575", fontSize: 12, marginBottom: 6 }}>Blood Group</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                              <TouchableOpacity key={bg} onPress={() => setProfileForm({ ...profileForm, bloodGroup: bg })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 2, borderColor: profileForm.bloodGroup === bg ? "#c62828" : "#e0e0e0", backgroundColor: profileForm.bloodGroup === bg ? "#ffebee" : "#f9f9f9" }}>
                                <Text style={{ color: profileForm.bloodGroup === bg ? "#c62828" : "#757575", fontWeight: profileForm.bloodGroup === bg ? "bold" : "normal" }}>{bg}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <TextInput style={[styles.input, { minHeight: 80 }]} placeholder="Full Address *" placeholderTextColor="#999" value={profileForm.address} onChangeText={v => setProfileForm({ ...profileForm, address: v })} multiline numberOfLines={3} />

                          {/* Passport Photo Upload */}
                          <Text style={{ color: "#757575", fontSize: 12, marginBottom: 6, marginTop: 6, fontWeight: "bold" }}>📷 Passport Size Photo *</Text>
                          {Platform.OS === 'web' ? (
                            <View style={{ marginBottom: 10 }}>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e: any) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev: any) => setProfileForm({ ...profileForm, passportPhotoBase64: ev.target.result });
                                  reader.readAsDataURL(file);
                                }}
                                style={{ marginBottom: 6 }}
                              />
                              {profileForm.passportPhotoBase64 ? (
                                <Image source={{ uri: profileForm.passportPhotoBase64 }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                              ) : null}
                            </View>
                          ) : (
                            <View style={{ marginBottom: 10 }}>
                              <TouchableOpacity
                                onPress={async () => {
                                  try {
                                    const result = await DocumentPicker.getDocumentAsync({
                                      type: "image/*",
                                      copyToCacheDirectory: true,
                                    });
                                    if (!result.canceled && result.assets && result.assets.length > 0) {
                                      const asset = result.assets[0];
                                      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                                        encoding: "base64",
                                      });
                                      const mime = asset.mimeType || "image/jpeg";
                                      setProfileForm({
                                        ...profileForm,
                                        passportPhotoBase64: `data:${mime};base64,${base64}`
                                      });
                                    }
                                  } catch (e: any) {
                                    Alert.alert("Error", "Failed to select photo: " + e.message);
                                  }
                                }}
                                style={{ padding: 10, backgroundColor: "#1976d2", borderRadius: 6, alignItems: "center", marginBottom: 6 }}
                              >
                                <Text style={{ color: "#ffffff", fontWeight: "bold" }}>📱 Select Photo from Gallery</Text>
                              </TouchableOpacity>
                              {profileForm.passportPhotoBase64 ? (
                                <Image source={{ uri: profileForm.passportPhotoBase64 }} style={{ width: 80, height: 80, borderRadius: 8 }} />
                              ) : null}
                            </View>
                          )}

                          {/* Photo ID Upload */}
                          <Text style={{ color: "#757575", fontSize: 12, marginBottom: 6, fontWeight: "bold" }}>🪪 Valid Photo ID *</Text>
                          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                            {["Aadhar", "PAN", "Driving Licence"].map(t => (
                              <TouchableOpacity key={t} onPress={() => setProfileForm({ ...profileForm, photoIdType: t })} style={{ flex: 1, padding: 8, borderRadius: 6, borderWidth: 2, borderColor: profileForm.photoIdType === t ? "#1976d2" : "#e0e0e0", backgroundColor: profileForm.photoIdType === t ? "#e3f2fd" : "#f9f9f9", alignItems: "center" }}>
                                <Text style={{ fontSize: 11, color: profileForm.photoIdType === t ? "#1976d2" : "#757575", fontWeight: profileForm.photoIdType === t ? "bold" : "normal" }}>{t}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          {Platform.OS === 'web' ? (
                            <View style={{ marginBottom: 10 }}>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e: any) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (ev: any) => setProfileForm({ ...profileForm, photoIdBase64: ev.target.result });
                                  reader.readAsDataURL(file);
                                }}
                                style={{ marginBottom: 6 }}
                              />
                              {profileForm.photoIdBase64 ? (
                                <Image source={{ uri: profileForm.photoIdBase64 }} style={{ width: 140, height: 80, borderRadius: 8 }} />
                              ) : null}
                            </View>
                          ) : (
                            <View style={{ marginBottom: 10 }}>
                              <TouchableOpacity
                                onPress={async () => {
                                  try {
                                    const result = await DocumentPicker.getDocumentAsync({
                                      type: "image/*",
                                      copyToCacheDirectory: true,
                                    });
                                    if (!result.canceled && result.assets && result.assets.length > 0) {
                                      const asset = result.assets[0];
                                      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
                                        encoding: "base64",
                                      });
                                      const mime = asset.mimeType || "image/jpeg";
                                      setProfileForm({
                                        ...profileForm,
                                        photoIdBase64: `data:${mime};base64,${base64}`
                                      });
                                    }
                                  } catch (e: any) {
                                    Alert.alert("Error", "Failed to select photo ID: " + e.message);
                                  }
                                }}
                                style={{ padding: 10, backgroundColor: "#1976d2", borderRadius: 6, alignItems: "center", marginBottom: 6 }}
                              >
                                <Text style={{ color: "#ffffff", fontWeight: "bold" }}>📱 Select Photo ID from Gallery</Text>
                              </TouchableOpacity>
                              {profileForm.photoIdBase64 ? (
                                <Image source={{ uri: profileForm.photoIdBase64 }} style={{ width: 140, height: 80, borderRadius: 8 }} />
                              ) : null}
                            </View>
                          )}

                          <TouchableOpacity onPress={submitProfileCompletion} style={[styles.primaryBtn, { marginTop: 6 }]}>
                            <Text style={styles.primaryBtnTxt}>📤 Submit for Admin Approval</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })()}
                  </View>
                )}

                {erpSub === "staff" && isAdmin && (
                  <View style={{ gap: 15 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <Text style={styles.sectionTitle}>Admin Management Portal</Text>
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
                          {showStaffForm ? "Close Form" : "➕ Create New Admin"}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {showStaffForm && (
                      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: editingStaff ? "#0288d1" : "#c62828" }]}>
                        <Text style={[styles.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>{editingStaff ? "✏️ Edit Admin Profile" : "Add Academy Admin / User"}</Text>
                        {editingStaff ? (
                          <>
                            <TextInput style={styles.input} placeholder="First Name" placeholderTextColor="#999" value={editingStaff.firstName} onChangeText={f => setEditingStaff({ ...editingStaff, firstName: f })} />
                            <TextInput style={styles.input} placeholder="Last Name" placeholderTextColor="#999" value={editingStaff.lastName} onChangeText={l => setEditingStaff({ ...editingStaff, lastName: l })} />
                            <TextInput style={styles.input} placeholder="Employee ID" placeholderTextColor="#999" value={editingStaff.employeeId} onChangeText={e => setEditingStaff({ ...editingStaff, employeeId: e })} />

                            <Text style={{ color: "#757575", fontSize: 12, marginBottom: 6, fontWeight: "bold" }}>Admin Role / Privilege Level *</Text>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                              {[
                                { key: "super_admin", label: "Super Admin" },
                                { key: "admin", label: "Admin" },
                                { key: "editor", label: "Editor" },
                                { key: "contributor", label: "Contributor" }
                              ].map(r => {
                                const isSelected = editingStaff.role === r.key;
                                return (
                                  <TouchableOpacity
                                    key={r.key}
                                    onPress={() => setEditingStaff({ ...editingStaff, role: r.key })}
                                    style={{
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 20,
                                      borderWidth: 2,
                                      borderColor: isSelected ? "#0288d1" : "#e0e0e0",
                                      backgroundColor: isSelected ? "#e1f5fe" : "#f9f9f9"
                                    }}
                                  >
                                    <Text style={{ color: isSelected ? "#0288d1" : "#757575", fontWeight: isSelected ? "bold" : "normal", fontSize: 12 }}>{r.label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>

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

                            <Text style={{ color: "#757575", fontSize: 12, marginBottom: 6, fontWeight: "bold" }}>Admin Role / Privilege Level *</Text>
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                              {[
                                { key: "super_admin", label: "Super Admin" },
                                { key: "admin", label: "Admin" },
                                { key: "editor", label: "Editor" },
                                { key: "contributor", label: "Contributor" }
                              ].map(r => {
                                const isSelected = newStaff.role === r.key;
                                return (
                                  <TouchableOpacity
                                    key={r.key}
                                    onPress={() => setNewStaff({ ...newStaff, role: r.key })}
                                    style={{
                                      paddingHorizontal: 12,
                                      paddingVertical: 6,
                                      borderRadius: 20,
                                      borderWidth: 2,
                                      borderColor: isSelected ? "#c62828" : "#e0e0e0",
                                      backgroundColor: isSelected ? "#ffebee" : "#f9f9f9"
                                    }}
                                  >
                                    <Text style={{ color: isSelected ? "#c62828" : "#757575", fontWeight: isSelected ? "bold" : "normal", fontSize: 12 }}>{r.label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>

                            <TextInput style={styles.input} placeholder="Designation" placeholderTextColor="#999" value={newStaff.designation} onChangeText={d => setNewStaff({ ...newStaff, designation: d })} />
                            <TextInput style={styles.input} placeholder="Department" placeholderTextColor="#999" value={newStaff.department} onChangeText={dp => setNewStaff({ ...newStaff, department: dp })} />
                            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#999" value={newStaff.email} onChangeText={e => setNewStaff({ ...newStaff, email: e })} keyboardType="email-address" />
                            <TextInput style={styles.input} placeholder="Phone" placeholderTextColor="#999" value={newStaff.phone} onChangeText={p => setNewStaff({ ...newStaff, phone: p })} keyboardType="phone-pad" />
                            <TextInput style={styles.input} placeholder="Login Username *" placeholderTextColor="#999" value={newStaff.loginUsername} onChangeText={u => setNewStaff({ ...newStaff, loginUsername: u })} />
                            <TextInput style={styles.input} placeholder="Login Password *" secureTextEntry placeholderTextColor="#999" value={newStaff.loginPassword} onChangeText={pw => setNewStaff({ ...newStaff, loginPassword: pw })} />

                            <TouchableOpacity onPress={createStaffRecord} style={styles.primaryBtn}>
                              <Text style={styles.primaryBtnTxt}>Add Admin Record</Text>
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}

                    <View style={styles.card}>
                      <Text style={styles.sectionTitle}>Admin Directory ({staff.length})</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View style={{ minWidth: 600 }}>
                          <View style={[styles.tableRow, { backgroundColor: "#f5f5f5", paddingVertical: 8, paddingHorizontal: 12 }]}>
                            <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Name</Text>
                            <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Role / Dept / Desg</Text>
                            <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Contact</Text>
                            <Text style={[styles.th, { flex: 1, fontWeight: "bold", textAlign: "center" }]}>Actions</Text>
                          </View>
                          {staff.length === 0 ? (
                            <Text style={[styles.emptyText, { padding: 15 }]}>No admin records found.</Text>
                          ) : (
                            staff.map((st, idx) => (
                              <View key={st.id} style={[styles.tableRow, { borderBottomWidth: 1, borderColor: "#eeeeee", paddingVertical: 10, paddingHorizontal: 12, backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa", alignItems: "center" }]}>
                                <Text style={{ flex: 1.5, color: "#212121", fontWeight: "600" }}>{st.firstName} {st.lastName}</Text>
                                <View style={{ flex: 1.5, gap: 4 }}>
                                  {(() => {
                                    const roleKey = st.role || "admin";
                                    let color = "#757575";
                                    let bg = "#f5f5f5";
                                    let label = "Staff";
                                    if (roleKey === "super_admin") { color = "#d32f2f"; bg = "#ffebee"; label = "Super Admin"; }
                                    else if (roleKey === "admin") { color = "#1976d2"; bg = "#e3f2fd"; label = "Admin"; }
                                    else if (roleKey === "editor") { color = "#f57c00"; bg = "#fff3e0"; label = "Editor"; }
                                    else if (roleKey === "contributor") { color = "#388e3c"; bg = "#e8f5e9"; label = "Contributor"; }
                                    return (
                                      <View style={{ alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, backgroundColor: bg }}>
                                        <Text style={{ color, fontSize: 10, fontWeight: "bold" }}>{label}</Text>
                                      </View>
                                    );
                                  })()}
                                  <Text style={{ color: "#757575", fontSize: 12 }}>{st.designation} ({st.department})</Text>
                                </View>
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

                {erpSub === "permissions" && (user.role === "super_admin" || user.role === "developer") && (() => {
                  const roles = [
                    { key: "super_admin", label: "Super Admin" },
                    { key: "admin", label: "Admin" },
                    { key: "editor", label: "Editor" },
                    { key: "contributor", label: "Contributor" }
                  ];
                  const features = [
                    { key: "students", label: "Student Directory" },
                    { key: "batches", label: "Batches & Courses" },
                    { key: "announcements", label: "Announcements / Notices" },
                    { key: "fees", label: "Tuition Fees / Ledger" },
                    { key: "tests", label: "Mock Tests & Leaderboards" },
                    { key: "quiz", label: "LMS Daily Practice Quiz" },
                    { key: "id-card", label: "ID Card Generation" }
                  ];

                  const permissionOptions = [
                    { key: "CRUD", label: "Full Access (CRUD)" },
                    { key: "CRU only", label: "Create, Read, Update (CRU)" },
                    { key: "CR only", label: "Create, Read (CR)" },
                    { key: "U only", label: "Update Only (U)" },
                    { key: "Delete but approval required from super admin", label: "Delete with Super Admin Approval" }
                  ];

                  const saveRolePermissions = async () => {
                    setIsSavingPermissions(true);
                    try {
                      const currentPerms = rolePermissions?.[activePermissionRole] || {};
                      await api.put(`/developer/role-permissions/${activePermissionRole}`, currentPerms);
                      Alert.alert("Success", "Permissions saved successfully!");
                      loadRolePermissions();
                    } catch (e: any) {
                      Alert.alert("Error", e.message || "Failed to save permissions.");
                    } finally {
                      setIsSavingPermissions(false);
                    }
                  };

                  const updateFeaturePermission = (featureKey: string, optionKey: string) => {
                    setRolePermissions((prev: any) => ({
                      ...prev,
                      [activePermissionRole]: {
                        ...(prev?.[activePermissionRole] || {}),
                        [featureKey]: optionKey
                      }
                    }));
                  };

                  const currentRolePermissions = rolePermissions?.[activePermissionRole] || {};

                  return (
                    <View style={{ gap: 15 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <Text style={styles.sectionTitle}>Role Permissions Manager</Text>
                        <TouchableOpacity
                          disabled={isSavingPermissions}
                          onPress={saveRolePermissions}
                          style={[styles.primaryBtn, { minWidth: 150, marginVertical: 0, height: 36, paddingVertical: 0, justifyContent: "center", backgroundColor: "#2e7d32" }]}
                        >
                          <Text style={[styles.primaryBtnTxt, { fontSize: 13 }]}>
                            {isSavingPermissions ? "Saving..." : "💾 Save Changes"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Role Selector Tabs */}
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                        {roles.map(r => {
                          const isSelected = activePermissionRole === r.key;
                          return (
                            <TouchableOpacity
                              key={r.key}
                              onPress={() => setActivePermissionRole(r.key)}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 8,
                                borderWidth: 1.5,
                                borderColor: isSelected ? "#c62828" : "#e0e0e0",
                                backgroundColor: isSelected ? "#ffebee" : "#ffffff",
                                alignItems: "center"
                              }}
                            >
                              <Text style={{ color: isSelected ? "#c62828" : "#616161", fontWeight: "bold", fontSize: 12 }}>{r.label}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Features List */}
                      <View style={styles.card}>
                        <Text style={[styles.sectionTitle, { fontSize: 14, marginBottom: 12 }]}>Configure Access for: {roles.find(r => r.key === activePermissionRole)?.label}</Text>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                          <View style={{ gap: 16 }}>
                            {features.map(f => {
                              const activeVal = currentRolePermissions[f.key] || "CRUD";
                              return (
                                <View key={f.key} style={{ paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#eeeeee" }}>
                                  <Text style={{ fontSize: 13, fontWeight: "bold", color: "#212121", marginBottom: 6 }}>{f.label}</Text>

                                  <View style={{ gap: 6 }}>
                                    {permissionOptions.map(opt => {
                                      const isSelected = activeVal === opt.key;
                                      return (
                                        <TouchableOpacity
                                          key={opt.key}
                                          onPress={() => updateFeaturePermission(f.key, opt.key)}
                                          style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            padding: 10,
                                            borderRadius: 6,
                                            borderWidth: 1.5,
                                            borderColor: isSelected ? "#c62828" : "#e0e0e0",
                                            backgroundColor: isSelected ? "#ffebee" : "#f9f9f9"
                                          }}
                                        >
                                          <View style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: 8,
                                            borderWidth: 2,
                                            borderColor: isSelected ? "#c62828" : "#bdbdbd",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginRight: 8
                                          }}>
                                            {isSelected && (
                                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#c62828" }} />
                                            )}
                                          </View>
                                          <Text style={{ fontSize: 11, color: isSelected ? "#b71c1c" : "#616161", fontWeight: isSelected ? "bold" : "normal" }}>
                                            {opt.label}
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    })}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    </View>
                  );
                })()}

                {erpSub === "approvals" && (user.role === "super_admin" || user.role === "developer") && (() => {
                  return (
                    <View style={{ gap: 15 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                        <Text style={styles.sectionTitle}>Pending Delete Approvals ({pendingApprovals.length})</Text>
                        <TouchableOpacity
                          onPress={loadPendingApprovals}
                          style={[styles.outlineBtn, { minWidth: 100, marginVertical: 0, height: 36, paddingVertical: 0, justifyContent: "center" }]}
                        >
                          <Text style={[styles.outlineBtnTxt, { fontSize: 13 }]}>↻ Refresh</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.card}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                          <View style={{ minWidth: 700 }}>
                            <View style={[styles.tableRow, { backgroundColor: "#f5f5f5", paddingVertical: 8, paddingHorizontal: 12 }]}>
                              <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Collection / Feature</Text>
                              <Text style={[styles.th, { flex: 2, fontWeight: "bold" }]}>Document ID</Text>
                              <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Requested By</Text>
                              <Text style={[styles.th, { flex: 1.5, fontWeight: "bold" }]}>Date Requested</Text>
                              <Text style={[styles.th, { flex: 1.5, fontWeight: "bold", textAlign: "center" }]}>Actions</Text>
                            </View>
                            {pendingApprovals.length === 0 ? (
                              <Text style={[styles.emptyText, { padding: 20 }]}>No pending deletion approval requests.</Text>
                            ) : (
                              pendingApprovals.map((item, idx) => (
                                <View key={item._id} style={[styles.tableRow, { borderBottomWidth: 1, borderColor: "#eeeeee", paddingVertical: 12, paddingHorizontal: 12, backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fafafa", alignItems: "center" }]}>
                                  <Text style={{ flex: 1.5, color: "#212121", fontWeight: "600", textTransform: "capitalize" }}>{item.feature}</Text>
                                  <Text style={{ flex: 2, color: "#c62828", fontSize: 11, fontFamily: "monospace" }} selectable>{item.docId}</Text>
                                  <Text style={{ flex: 1.5, color: "#757575", fontSize: 12 }}>{item.requestedBy}</Text>
                                  <Text style={{ flex: 1.5, color: "#757575", fontSize: 11 }}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "N/A"}</Text>
                                  <View style={{ flex: 1.5, flexDirection: "row", justifyContent: "center", gap: 8 }}>
                                    <TouchableOpacity onPress={() => handleApproveDelete(item)} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#2e7d32", borderRadius: 4 }}>
                                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>Approve</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleRejectDelete(item)} style={{ paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#c62828", borderRadius: 4 }}>
                                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>Reject</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              ))
                            )}
                          </View>
                        </ScrollView>
                      </View>
                    </View>
                  );
                })()}

                {erpSub === "fees" && (() => {
                  const myStudent = user.role === "student" ? getLoggedInStudent(user, students) : null;
                  const displayFees = user.role === "student"
                    ? fees.filter((f: any) => f.studentId === user.userId || f.studentUsername === user.username || (myStudent && (f.studentId === myStudent.id || f.studentUsername === myStudent.rollNumber)))
                    : fees;

                  // Admin Fee Stats & Sorting logic
                  // Count of students who paid in full: totalFees > 0 and feesPaid >= totalFees
                  const fullyPaidStudents = students.filter((s: any) => {
                    const tot = Number(s.totalFees) || 0;
                    const paid = Number(s.feesPaid) || 0;
                    return tot > 0 && paid >= tot;
                  });

                  // Count of students with fee pending: totalFees > feesPaid
                  const pendingStudents = students.filter((s: any) => {
                    const tot = Number(s.totalFees) || 0;
                    const paid = Number(s.feesPaid) || 0;
                    return tot > paid;
                  });

                  // Sort students: pending > 0 on top, ordered highest pending to lowest pending, then paid full, then no fees set.
                  const sortedStudentsForFees = [...students].sort((a: any, b: any) => {
                    const totA = Number(a.totalFees) || 0;
                    const paidA = Number(a.feesPaid) || 0;
                    const pendingA = totA - paidA;

                    const totB = Number(b.totalFees) || 0;
                    const paidB = Number(b.feesPaid) || 0;
                    const pendingB = totB - paidB;

                    const hasPendingA = pendingA > 0;
                    const hasPendingB = pendingB > 0;

                    if (hasPendingA && !hasPendingB) return -1;
                    if (!hasPendingA && hasPendingB) return 1;

                    if (hasPendingA && hasPendingB) {
                      return pendingB - pendingA; // Descending pending fees (highest pending on top)
                    }

                    // For fully paid or no fees:
                    const hasFeesA = totA > 0;
                    const hasFeesB = totB > 0;
                    if (hasFeesA && !hasFeesB) return -1;
                    if (!hasFeesA && hasFeesB) return 1;

                    return 0;
                  });

                  return (
                    <View style={{ gap: 15 }}>
                      {user.role === "student" && myStudent && (
                        <>
                          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#c62828" }]}>
                            <Text style={styles.sectionTitle}>My Profile</Text>
                            <Text style={{ color: "#212121", fontWeight: "bold" }}>{myStudent.firstName} {myStudent.lastName}</Text>
                            <Text style={{ color: "#757575", fontSize: 12, marginTop: 2 }}>Roll: {myStudent.rollNumber} | Batch: {myStudent.batch || "N/A"}</Text>
                            <Text style={{ color: "#757575", fontSize: 12 }}>Course: {myStudent.course}</Text>
                          </View>

                          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: "#2e7d32" }]}>
                            <Text style={styles.sectionTitle}>Fee Summary</Text>
                            {(() => {
                              const tot = Number(myStudent.totalFees) || 0;
                              const paid = Number(myStudent.feesPaid) || 0;
                              const pending = tot - paid;
                              return (
                                <View style={{ gap: 10, marginTop: 5 }}>
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "#eeeeee", paddingBottom: 8 }}>
                                    <Text style={{ color: "#555", fontSize: 13 }}>Total Fees:</Text>
                                    <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 15 }}>₹{tot.toLocaleString()}</Text>
                                  </View>
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "#eeeeee", paddingBottom: 8 }}>
                                    <Text style={{ color: "#555", fontSize: 13 }}>Fees Paid:</Text>
                                    <Text style={{ fontWeight: "bold", color: "#2e7d32", fontSize: 15 }}>₹{paid.toLocaleString()}</Text>
                                  </View>
                                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 4 }}>
                                    <Text style={{ color: "#555", fontSize: 13 }}>Fee Pending:</Text>
                                    <Text style={{ fontWeight: "bold", color: pending > 0 ? "#e65100" : "#2e7d32", fontSize: 15 }}>₹{pending.toLocaleString()}</Text>
                                  </View>

                                  {tot > 0 && (
                                    <View style={{ marginTop: 5 }}>
                                      <View style={{ height: 8, backgroundColor: "#eeeeee", borderRadius: 4, overflow: "hidden" }}>
                                        <View style={{ width: `${Math.min(100, Math.round((paid / tot) * 100))}%`, height: "100%", backgroundColor: "#2e7d32" }} />
                                      </View>
                                      <Text style={{ fontSize: 11, color: "#757575", textAlign: "right", marginTop: 4 }}>
                                        Paid: {Math.min(100, Math.round((paid / tot) * 100))}%
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              );
                            })()}
                          </View>
                        </>
                      )}

                      {/* Admin Fee Summary Panel */}
                      {user.role !== "student" && (
                        <>
                          <View style={{ flexDirection: "row", gap: 12 }}>
                            <View style={[styles.card, { flex: 1, borderTopWidth: 4, borderTopColor: "#2e7d32" }]}>
                              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#2e7d32" }}>{fullyPaidStudents.length}</Text>
                              <Text style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>Paid In Full</Text>
                            </View>
                            <View style={[styles.card, { flex: 1, borderTopWidth: 4, borderTopColor: "#c62828" }]}>
                              <Text style={{ fontSize: 24, fontWeight: "bold", color: "#c62828" }}>{pendingStudents.length}</Text>
                              <Text style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>Fee Pending</Text>
                            </View>
                          </View>

                          <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Student Fees Directory</Text>

                            {/* Search bar inside admin fees panel */}
                            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                              <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                placeholder="🔍 Search student name or roll..."
                                placeholderTextColor="#999"
                                value={studentSearchQuery}
                                onChangeText={setStudentSearchQuery}
                              />
                              {studentSearchQuery ? (
                                <TouchableOpacity onPress={() => setStudentSearchQuery("")} style={{ padding: 10, backgroundColor: "#eeeeee", borderRadius: 8, justifyContent: "center" }}>
                                  <Text style={{ fontSize: 11, color: "#333" }}>Clear</Text>
                                </TouchableOpacity>
                              ) : null}
                            </View>

                            {/* Status filter buttons */}
                            <View style={{ flexDirection: "row", gap: 8, marginBottom: 15, alignItems: "center" }}>
                              <Text style={{ fontSize: 12, fontWeight: "bold", color: "#555" }}>Status:</Text>
                              {(["all", "pending", "paid"] as const).map(status => {
                                const isSelected = feeFilterStatus === status;
                                return (
                                  <TouchableOpacity
                                    key={status}
                                    onPress={() => setFeeFilterStatus(status)}
                                    style={{
                                      paddingVertical: 6,
                                      paddingHorizontal: 12,
                                      borderRadius: 20,
                                      borderWidth: 1,
                                      borderColor: isSelected ? "#c62828" : "#e0e0e0",
                                      backgroundColor: isSelected ? "#ffebee" : "#f9f9f9"
                                    }}
                                  >
                                    <Text style={{
                                      fontSize: 11,
                                      color: isSelected ? "#c62828" : "#555",
                                      fontWeight: isSelected ? "bold" : "normal"
                                    }}>
                                      {status.toUpperCase()}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>

                            <ScrollView style={{ maxHeight: 500 }}>
                              {sortedStudentsForFees
                                .filter((s: any) => {
                                  const name = getStudentName(s).toLowerCase();
                                  const roll = String(s.rollNumber || "").toLowerCase();
                                  const q = studentSearchQuery.toLowerCase();
                                  if (!name.includes(q) && !roll.includes(q)) return false;

                                  const tot = Number(s.totalFees) || 0;
                                  const paid = Number(s.feesPaid) || 0;
                                  const pending = tot - paid;

                                  if (feeFilterStatus === "pending") {
                                    return pending > 0;
                                  }
                                  if (feeFilterStatus === "paid") {
                                    return tot > 0 && paid >= tot;
                                  }
                                  return true;
                                })
                                .map((s: any) => {
                                  const tot = Number(s.totalFees) || 0;
                                  const paid = Number(s.feesPaid) || 0;
                                  const pending = tot - paid;
                                  const isPending = pending > 0;
                                  return (
                                    <View key={s.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: "#eeeeee", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 13 }}>{getStudentName(s)}</Text>
                                        <Text style={{ fontSize: 11, color: "#757575", marginTop: 1 }}>Roll: {s.rollNumber || "N/A"} | Batch: {s.batch || "N/A"}</Text>
                                        <Text style={{ fontSize: 11, color: "#757575" }}>Total: ₹{tot.toLocaleString()} | Paid: ₹{paid.toLocaleString()}</Text>
                                      </View>
                                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                                        {isPending ? (
                                          <View style={{ backgroundColor: "#ffebee", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                                            <Text style={{ color: "#c62828", fontSize: 11, fontWeight: "bold" }}>Pending: ₹{pending.toLocaleString()}</Text>
                                          </View>
                                        ) : tot > 0 ? (
                                          <View style={{ backgroundColor: "#e8f5e9", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                                            <Text style={{ color: "#2e7d32", fontSize: 11, fontWeight: "bold" }}>Paid in Full</Text>
                                          </View>
                                        ) : (
                                          <View style={{ backgroundColor: "#f5f5f5", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 }}>
                                            <Text style={{ color: "#757575", fontSize: 11 }}>No Fees Set</Text>
                                          </View>
                                        )}
                                        <TouchableOpacity
                                          onPress={() => setFeeEditStudent({ ...s })}
                                          style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "#0288d1", borderRadius: 4 }}
                                        >
                                          <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "bold" }}>Update Fees</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  );
                                })}
                            </ScrollView>
                          </View>
                        </>
                      )}

                      {(user.role !== "student" || displayFees.length > 0) && (
                        <View style={styles.card}>
                          <Text style={styles.sectionTitle}>{user.role === "student" ? "Payment Receipts & History" : "Tuition Ledger Assignments"}</Text>
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
                                      {stud ? getStudentName(stud) : `ID: ${f.studentId}`}
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
                      )}
                    </View>
                  );
                })()}

                {erpSub === "id-card" && (
                  <>
                    {user.role !== "student" ? (
                      <View style={{ gap: 15 }}>
                        {/* Generation Mode Selector */}
                        <View style={{ flexDirection: "row", gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => {
                              setGenerationMode("individual");
                              setSelectedIdStudent(null);
                            }}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 6,
                              backgroundColor: generationMode === "individual" ? "#c62828" : "#ffffff",
                              alignItems: "center",
                              borderWidth: 1,
                              borderColor: generationMode === "individual" ? "#c62828" : "#e0e0e0"
                            }}
                          >
                            <Text style={{ color: generationMode === "individual" ? "#fff" : "#616161", fontWeight: "bold", fontSize: 13 }}>👤 Individual Student</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => setGenerationMode("batch")}
                            style={{
                              flex: 1,
                              paddingVertical: 10,
                              borderRadius: 6,
                              backgroundColor: generationMode === "batch" ? "#c62828" : "#ffffff",
                              alignItems: "center",
                              borderWidth: 1,
                              borderColor: generationMode === "batch" ? "#c62828" : "#e0e0e0"
                            }}
                          >
                            <Text style={{ color: generationMode === "batch" ? "#fff" : "#616161", fontWeight: "bold", fontSize: 13 }}>👥 Batch Operations</Text>
                          </TouchableOpacity>
                        </View>

                        {/* Individual Student Mode: List with Search */}
                        {generationMode === "individual" && (
                          <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Select Student – Design & Generate Credentials</Text>

                            {/* Search Input */}
                            <View style={{ marginBottom: 12 }}>
                              <TextInput
                                style={styles.input}
                                value={studentSearchQuery}
                                onChangeText={setStudentSearchQuery}
                                placeholder="🔍 Search student by roll number or name..."
                                placeholderTextColor="#999"
                              />
                            </View>

                            <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled={true}>
                              {(() => {
                                const filteredStudents = students.filter((s: any) =>
                                  (s.rollNumber || "").toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
                                  (`${s.firstName || ""} ${s.lastName || ""}`).toLowerCase().includes(studentSearchQuery.toLowerCase())
                                );

                                if (filteredStudents.length === 0) {
                                  return <Text style={styles.emptyText}>No matching student profiles found.</Text>;
                                }

                                return filteredStudents.map((s: any) => {
                                  const isSelected = selectedIdStudent?.id === s.id;
                                  return (
                                    <TouchableOpacity
                                      key={s.id}
                                      onPress={() => setSelectedIdStudent(s)}
                                      style={{
                                        paddingVertical: 10,
                                        paddingHorizontal: 8,
                                        borderBottomWidth: 1,
                                        borderColor: "#eeeeee",
                                        backgroundColor: isSelected ? "#ffebee" : "transparent",
                                        borderRadius: 6,
                                        marginBottom: 4
                                      }}
                                    >
                                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                        <View>
                                          <Text style={{ color: isSelected ? "#c62828" : "#212121", fontWeight: "bold", fontSize: 13 }}>
                                            {s.firstName} {s.lastName}
                                          </Text>
                                          <Text style={{ fontSize: 11, color: "#757575", marginTop: 2 }}>Roll: {s.rollNumber || "N/A"} | {s.batch || "General"}</Text>
                                        </View>
                                        <View style={{ flexDirection: "row", gap: 4 }}>
                                          {s.idCardGenerated && (
                                            <View style={{ backgroundColor: "#e8f5e9", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                                              <Text style={{ fontSize: 9, color: "#2e7d32", fontWeight: "bold" }}>🪪 ID</Text>
                                            </View>
                                          )}
                                          {s.hallTicketGenerated && (
                                            <View style={{ backgroundColor: "#e8f5e9", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                                              <Text style={{ fontSize: 9, color: "#2e7d32", fontWeight: "bold" }}>🎟️ TICKET</Text>
                                            </View>
                                          )}
                                        </View>
                                      </View>
                                    </TouchableOpacity>
                                  );
                                });
                              })()}
                            </ScrollView>
                          </View>
                        )}

                        {/* Batch Operations Mode: Batch Selector */}
                        {generationMode === "batch" && (
                          <View style={styles.card}>
                            <Text style={styles.sectionTitle}>Select Target Audience</Text>
                            <Text style={{ fontSize: 12, color: "#757575", marginBottom: 10 }}>Credentials will be generated for all users matching the target criteria.</Text>
                            
                            <View style={{ flexDirection: "row", gap: 8, marginBottom: 15 }}>
                              {[
                                { key: "all", label: "All Users\n(Guest & Paid)" },
                                { key: "paid", label: "Paid Students\nOnly" },
                                { key: "free", label: "Free (Guest)\nUsers Only" }
                              ].map(t => {
                                const isSel = bulkTargetGroup === t.key;
                                return (
                                  <TouchableOpacity
                                    key={t.key}
                                    onPress={() => setBulkTargetGroup(t.key as any)}
                                    style={{
                                      flex: 1,
                                      paddingVertical: 10,
                                      borderRadius: 6,
                                      backgroundColor: isSel ? "#c62828" : "#ffffff",
                                      alignItems: "center",
                                      borderWidth: 1,
                                      borderColor: isSel ? "#c62828" : "#e0e0e0"
                                    }}
                                  >
                                    <Text style={{ color: isSel ? "#fff" : "#616161", fontWeight: "bold", fontSize: 10, textAlign: "center" }}>{t.label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>

                            {bulkTargetGroup === "paid" && (
                              <>
                                <Text style={[styles.label, { marginBottom: 6 }]}>Filter by Batch (Optional):</Text>
                                <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} style={{ flexDirection: "row", gap: 8, marginVertical: 4 }}>
                                  {(() => {
                                    const uniqueBatches = ["All Batches", ...Array.from(new Set(students.map((s: any) => s.batch).filter(Boolean)))];
                                    return uniqueBatches.map(b => {
                                      const isSelected = selectedBatchForGen === b;
                                      return (
                                        <TouchableOpacity
                                          key={b}
                                          onPress={() => setSelectedBatchForGen(b)}
                                          style={{
                                            paddingHorizontal: 16,
                                            paddingVertical: 8,
                                            borderRadius: 20,
                                            backgroundColor: isSelected ? "#c62828" : "#f5f5f5",
                                            borderWidth: 1,
                                            borderColor: isSelected ? "#c62828" : "#e0e0e0",
                                            marginRight: 8
                                          }}
                                        >
                                          <Text style={{ color: isSelected ? "#fff" : "#424242", fontSize: 12, fontWeight: "bold" }}>
                                            {b}
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    });
                                  })()}
                                </ScrollView>
                              </>
                            )}
                          </View>
                        )}

                        {((generationMode === "batch") || (generationMode === "individual" && selectedIdStudent)) && (() => {
                          const targetDisplayName = generationMode === "batch"
                            ? (bulkTargetGroup === "paid" ? `Batch: ${selectedBatchForGen}` : bulkTargetGroup === "free" ? "All Guest/Free Users" : "All App Users (Paid & Guest)")
                            : `${selectedIdStudent.firstName} ${selectedIdStudent.lastName}`;

                          const sampleStudentForPreview = generationMode === "batch"
                            ? {
                              firstName: "Sample",
                              lastName: "Student",
                              rollNumber: "ROLL-2026-XYZ",
                              course: "UPSC Civil Services",
                              batch: bulkTargetGroup === "paid" ? (selectedBatchForGen === "All Batches" ? "General cohort" : selectedBatchForGen) : "Guest Cohort"
                            }
                            : selectedIdStudent;

                          return (
                            <View style={[styles.card, { gap: 15 }]}>
                              <View style={{ borderBottomWidth: 1, borderColor: "#e0e0e0", paddingBottom: 10 }}>
                                <Text style={{ fontSize: 16, fontWeight: "bold", color: "#212121" }}>
                                  Credential Builder – {targetDisplayName}
                                </Text>
                              </View>

                              {/* Builder sub-navigation tabs */}
                              <View style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: "#e0e0e0", paddingBottom: 0, marginBottom: 10 }}>
                                <TouchableOpacity
                                  onPress={() => setCardSubTab("idcard")}
                                  style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    alignItems: "center",
                                    borderBottomWidth: 2,
                                    borderColor: cardSubTab === "idcard" ? "#c62828" : "transparent"
                                  }}
                                >
                                  <Text style={{ color: cardSubTab === "idcard" ? "#c62828" : "#757575", fontWeight: "bold", fontSize: 14 }}>
                                    🪪 ID Card Template
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  onPress={() => setCardSubTab("hallticket")}
                                  style={{
                                    flex: 1,
                                    paddingVertical: 10,
                                    alignItems: "center",
                                    borderBottomWidth: 2,
                                    borderColor: cardSubTab === "hallticket" ? "#c62828" : "transparent"
                                  }}
                                >
                                  <Text style={{ color: cardSubTab === "hallticket" ? "#c62828" : "#757575", fontWeight: "bold", fontSize: 14 }}>
                                    🎟️ Hall Ticket Template
                                  </Text>
                                </TouchableOpacity>
                              </View>

                              {/* ID Card Customizer */}
                              {cardSubTab === "idcard" && (
                                <View style={{ flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: 20 }}>
                                  {/* Editor Form */}
                                  <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? "100%" : undefined, minWidth: isMobile ? undefined : 280, gap: 10 }}>
                                    <Text style={{ fontSize: 14, fontWeight: "bold", color: "#424242" }}>Template Editor</Text>

                                    <View>
                                      <Text style={styles.label}>Expiry Date</Text>
                                      <TextInput
                                        style={styles.input}
                                        value={idCardExpiry}
                                        onChangeText={setIdCardExpiry}
                                        placeholder="e.g. 31/12/2026"
                                        placeholderTextColor="#999"
                                      />
                                    </View>

                                    <View>
                                      <Text style={styles.label}>Designation / Subtitle</Text>
                                      <TextInput
                                        style={styles.input}
                                        value={idCardRole}
                                        onChangeText={setIdCardRole}
                                        placeholder="e.g. IAS CANDIDATE"
                                        placeholderTextColor="#999"
                                      />
                                    </View>

                                    <View>
                                      <Text style={styles.label}>Theme Accent Color</Text>
                                      <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                                        {[
                                          { color: "#c62828", label: "Red" },
                                          { color: "#1976d2", label: "Blue" },
                                          { color: "#2e7d32", label: "Green" },
                                          { color: "#37474f", label: "Slate" },
                                          { color: "#e65100", label: "Orange" }
                                        ].map((c) => (
                                          <TouchableOpacity
                                            key={c.color}
                                            onPress={() => setIdCardTheme(c.color)}
                                            style={{
                                              width: 32,
                                              height: 32,
                                              borderRadius: 16,
                                              backgroundColor: c.color,
                                              borderWidth: idCardTheme === c.color ? 3 : 0,
                                              borderColor: "#212121",
                                              shadowColor: "#000",
                                              shadowOffset: { width: 0, height: 1 },
                                              shadowOpacity: 0.2,
                                              shadowRadius: 2,
                                              elevation: 2
                                            }}
                                          />
                                        ))}
                                      </View>
                                    </View>

                                    <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
                                      <TouchableOpacity
                                        disabled={isBulkGenerating}
                                        onPress={async () => {
                                          try {
                                            setIsBulkGenerating(true);
                                            if (generationMode === "individual") {
                                              await api.put(`/erp/student/${selectedIdStudent.id}`, {
                                                idCardGenerated: true,
                                                idCardExpiry,
                                                idCardRole,
                                                idCardTheme
                                              });
                                              Alert.alert("Success", "ID Card generated and saved successfully!");
                                              setSelectedIdStudent({
                                                ...selectedIdStudent,
                                                idCardGenerated: true,
                                                idCardExpiry,
                                                idCardRole,
                                                idCardTheme
                                              });
                                            } else {
                                              const res = await api.post("/erp/student/bulk/credentials", {
                                                batch: selectedBatchForGen,
                                                targetGroup: bulkTargetGroup,
                                                type: "idcard",
                                                idCardGenerated: true,
                                                idCardExpiry,
                                                idCardRole,
                                                idCardTheme
                                              });
                                              Alert.alert("Success", res.message || "Batch ID Cards generated successfully!");
                                            }
                                            loadStudents();
                                          } catch (e: any) {
                                            Alert.alert("Error", e.message || "Failed to generate ID card(s)");
                                          } finally {
                                            setIsBulkGenerating(false);
                                          }
                                        }}
                                        style={[styles.primaryBtn, { flex: 1, backgroundColor: "#2e7d32", opacity: isBulkGenerating ? 0.6 : 1 }]}
                                      >
                                        <Text style={styles.primaryBtnTxt}>
                                          {isBulkGenerating ? "Processing..." : generationMode === "individual" ? "Generate ID Card" : "Generate for Batch"}
                                        </Text>
                                      </TouchableOpacity>
 
                                      {((generationMode === "individual" && selectedIdStudent?.idCardGenerated) || generationMode === "batch") && (
                                        <TouchableOpacity
                                          disabled={isBulkGenerating}
                                          onPress={async () => {
                                            try {
                                              setIsBulkGenerating(true);
                                              if (generationMode === "individual") {
                                                await api.put(`/erp/student/${selectedIdStudent.id}`, {
                                                  idCardGenerated: false
                                                });
                                                Alert.alert("Success", "ID Card status revoked.");
                                                setSelectedIdStudent({
                                                  ...selectedIdStudent,
                                                  idCardGenerated: false
                                                });
                                              } else {
                                                const res = await api.post("/erp/student/bulk/credentials", {
                                                  batch: selectedBatchForGen,
                                                  targetGroup: bulkTargetGroup,
                                                  type: "idcard",
                                                  idCardGenerated: false
                                                });
                                                Alert.alert("Success", res.message || "Batch ID Cards revoked successfully.");
                                              }
                                              loadStudents();
                                            } catch (e: any) {
                                              Alert.alert("Error", e.message || "Failed to revoke ID card(s)");
                                            } finally {
                                              setIsBulkGenerating(false);
                                            }
                                          }}
                                          style={[styles.primaryBtn, { flex: 1, backgroundColor: "#c62828", opacity: isBulkGenerating ? 0.6 : 1 }]}
                                        >
                                          <Text style={styles.primaryBtnTxt}>
                                            {isBulkGenerating ? "Processing..." : generationMode === "individual" ? "Revoke ID Card" : "Revoke for Batch"}
                                          </Text>
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                  </View>

                                  {/* Preview Panel */}
                                  <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? "100%" : undefined, minWidth: isMobile ? undefined : 280, backgroundColor: "#f9f9f9", padding: 15, borderRadius: 8, borderWidth: 1, borderColor: "#e0e0e0" }}>
                                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#757575", marginBottom: 10 }}>LIVE PREVIEW</Text>
                                    <View style={{ width: "100%", justifyContent: "center", alignItems: "center", paddingVertical: 10 }}>
                                      {renderIDCard(sampleStudentForPreview, idCardTheme, idCardRole, idCardExpiry)}
                                    </View>
                                  </View>
                                </View>
                              )}

                              {/* Hall Ticket Customizer */}
                              {cardSubTab === "hallticket" && (
                                <View style={{ flexDirection: isMobile ? "column" : "row", flexWrap: "wrap", gap: 20 }}>
                                  {/* Editor Form */}
                                  <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? "100%" : undefined, minWidth: isMobile ? undefined : 280, gap: 10 }}>
                                    <Text style={{ fontSize: 14, fontWeight: "bold", color: "#424242" }}>Template Editor</Text>

                                    <View>
                                      <Text style={styles.label}>Examination Name</Text>
                                      <TextInput
                                        style={styles.input}
                                        value={hallTicketExamName}
                                        onChangeText={setHallTicketExamName}
                                        placeholder="e.g. UPSC Civil Services Prelims Mock"
                                        placeholderTextColor="#999"
                                      />
                                    </View>

                                    <View style={{ flexDirection: "row", gap: 10 }}>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Exam Date</Text>
                                        <TextInput
                                          style={styles.input}
                                          value={hallTicketExamDate}
                                          onChangeText={setHallTicketExamDate}
                                          placeholder="e.g. 24/05/2026"
                                          placeholderTextColor="#999"
                                        />
                                      </View>
                                      <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>Exam Time</Text>
                                        <TextInput
                                          style={styles.input}
                                          value={hallTicketTime}
                                          onChangeText={setHallTicketTime}
                                          placeholder="e.g. 09:30 AM - 12:30 PM"
                                          placeholderTextColor="#999"
                                        />
                                      </View>
                                    </View>

                                    <View>
                                      <Text style={styles.label}>Venue Address</Text>
                                      <TextInput
                                        style={styles.input}
                                        value={hallTicketVenue}
                                        onChangeText={setHallTicketVenue}
                                        placeholder="e.g. NERMAI Academy Main Hall, Floor 2"
                                        placeholderTextColor="#999"
                                      />
                                    </View>

                                    <View>
                                      <Text style={styles.label}>Special Instructions</Text>
                                      <TextInput
                                        style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                                        value={hallTicketInstructions}
                                        onChangeText={setHallTicketInstructions}
                                        placeholder="Enter candidate instructions..."
                                        placeholderTextColor="#999"
                                        multiline={true}
                                      />
                                    </View>

                                    <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
                                      <TouchableOpacity
                                        disabled={isBulkGenerating}
                                        onPress={async () => {
                                          try {
                                            setIsBulkGenerating(true);
                                            if (generationMode === "individual") {
                                              await api.put(`/erp/student/${selectedIdStudent.id}`, {
                                                hallTicketGenerated: true,
                                                hallTicketExamName,
                                                hallTicketExamDate,
                                                hallTicketVenue,
                                                hallTicketTime,
                                                hallTicketInstructions
                                              });
                                              Alert.alert("Success", "Hall Ticket generated and saved successfully!");
                                              setSelectedIdStudent({
                                                ...selectedIdStudent,
                                                hallTicketGenerated: true,
                                                hallTicketExamName,
                                                hallTicketExamDate,
                                                hallTicketVenue,
                                                hallTicketTime,
                                                hallTicketInstructions
                                              });
                                            } else {
                                              const res = await api.post("/erp/student/bulk/credentials", {
                                                batch: selectedBatchForGen,
                                                targetGroup: bulkTargetGroup,
                                                type: "hallticket",
                                                hallTicketGenerated: true,
                                                hallTicketExamName,
                                                hallTicketExamDate,
                                                hallTicketVenue,
                                                hallTicketTime,
                                                hallTicketInstructions
                                              });
                                              Alert.alert("Success", res.message || "Batch Hall Tickets generated successfully!");
                                            }
                                            loadStudents();
                                          } catch (e: any) {
                                            Alert.alert("Error", e.message || "Failed to generate Hall Ticket(s)");
                                          } finally {
                                            setIsBulkGenerating(false);
                                          }
                                        }}
                                        style={[styles.primaryBtn, { flex: 1, backgroundColor: "#2e7d32", opacity: isBulkGenerating ? 0.6 : 1 }]}
                                      >
                                        <Text style={styles.primaryBtnTxt}>
                                          {isBulkGenerating ? "Processing..." : generationMode === "individual" ? "Generate Hall Ticket" : "Generate for Batch"}
                                        </Text>
                                      </TouchableOpacity>
 
                                      {((generationMode === "individual" && selectedIdStudent?.hallTicketGenerated) || generationMode === "batch") && (
                                        <TouchableOpacity
                                          disabled={isBulkGenerating}
                                          onPress={async () => {
                                            try {
                                              setIsBulkGenerating(true);
                                              if (generationMode === "individual") {
                                                await api.put(`/erp/student/${selectedIdStudent.id}`, {
                                                  hallTicketGenerated: false
                                                });
                                                Alert.alert("Success", "Hall Ticket status revoked.");
                                                setSelectedIdStudent({
                                                  ...selectedIdStudent,
                                                  hallTicketGenerated: false
                                                });
                                              } else {
                                                const res = await api.post("/erp/student/bulk/credentials", {
                                                  batch: selectedBatchForGen,
                                                  targetGroup: bulkTargetGroup,
                                                  type: "hallticket",
                                                  hallTicketGenerated: false
                                                });
                                                Alert.alert("Success", res.message || "Batch Hall Tickets revoked successfully.");
                                              }
                                              loadStudents();
                                            } catch (e: any) {
                                              Alert.alert("Error", e.message || "Failed to revoke Hall Ticket(s)");
                                            } finally {
                                              setIsBulkGenerating(false);
                                            }
                                          }}
                                          style={[styles.primaryBtn, { flex: 1, backgroundColor: "#c62828", opacity: isBulkGenerating ? 0.6 : 1 }]}
                                        >
                                          <Text style={styles.primaryBtnTxt}>
                                            {isBulkGenerating ? "Processing..." : generationMode === "individual" ? "Revoke Hall Ticket" : "Revoke for Batch"}
                                          </Text>
                                        </TouchableOpacity>
                                      )}
                                    </View>
                                  </View>

                                  {/* Preview Panel */}
                                  <View style={{ flex: isMobile ? undefined : 1, width: isMobile ? "100%" : undefined, minWidth: isMobile ? undefined : 280, backgroundColor: "#f9f9f9", padding: 15, borderRadius: 8, borderWidth: 1, borderColor: "#e0e0e0" }}>
                                    <Text style={{ fontSize: 12, fontWeight: "bold", color: "#757575", marginBottom: 10 }}>LIVE PREVIEW</Text>
                                    <View style={{ width: "100%", justifyContent: "center", alignItems: "center", paddingVertical: 10 }}>
                                      {renderHallTicket(sampleStudentForPreview, hallTicketExamName, hallTicketExamDate, hallTicketVenue, hallTicketTime, hallTicketInstructions)}
                                    </View>
                                  </View>
                                </View>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    ) : (
                      /* ---- STUDENT: only see own cards if admin has generated them ---- */
                      (() => {
                        const myRecord = getLoggedInStudent(user, students);
                        if (!myRecord) {
                          return (
                            <View style={styles.emptyContainer}>
                              <Ionicons name="card-outline" size={44} color="#bdbdbd" />
                              <Text style={{ fontSize: 15, fontWeight: "bold", color: "#555", textAlign: "center", marginTop: 8 }}>
                                No Student Profile Found
                              </Text>
                            </View>
                          );
                        }
                        const hasId = myRecord.idCardGenerated === true;
                        const hasTicket = myRecord.hallTicketGenerated === true;
                        const activeTab = myCardSubTab === "idcard" ? (hasId ? "idcard" : "hallticket") : (hasTicket ? "hallticket" : "idcard");

                        if (!hasId && !hasTicket) {
                          return (
                            <View style={styles.emptyContainer}>
                              <Ionicons name="card-outline" size={44} color="#bdbdbd" />
                              <Text style={{ fontSize: 15, fontWeight: "bold", color: "#555", textAlign: "center", marginTop: 8 }}>
                                No Cards Generated Yet
                              </Text>
                              <Text style={{ color: "#aaa", fontSize: 13, textAlign: "center", marginTop: 5 }}>
                                Your ID card or Hall Ticket will appear here once the administrator generates them.
                              </Text>
                            </View>
                          );
                        }

                        return (
                          <View style={{ gap: 15, alignItems: "center", width: "100%" }}>
                            {/* Student selection tabs */}
                            <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                              {hasId && (
                                <TouchableOpacity
                                  onPress={() => setMyCardSubTab("idcard")}
                                  style={{
                                    paddingHorizontal: 18,
                                    paddingVertical: 10,
                                    borderRadius: 20,
                                    backgroundColor: activeTab === "idcard" ? "#c62828" : "#f5f5f5",
                                    borderWidth: 1,
                                    borderColor: activeTab === "idcard" ? "#c62828" : "#e0e0e0"
                                  }}
                                >
                                  <Text style={{ color: activeTab === "idcard" ? "#fff" : "#616161", fontSize: 12, fontWeight: "bold" }}>🪪 My ID Card</Text>
                                </TouchableOpacity>
                              )}
                              {hasTicket && (
                                <TouchableOpacity
                                  onPress={() => setMyCardSubTab("hallticket")}
                                  style={{
                                    paddingHorizontal: 18,
                                    paddingVertical: 10,
                                    borderRadius: 20,
                                    backgroundColor: activeTab === "hallticket" ? "#c62828" : "#f5f5f5",
                                    borderWidth: 1,
                                    borderColor: activeTab === "hallticket" ? "#c62828" : "#e0e0e0"
                                  }}
                                >
                                  <Text style={{ color: activeTab === "hallticket" ? "#fff" : "#616161", fontSize: 12, fontWeight: "bold" }}>🎟️ My Hall Ticket</Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            {activeTab === "idcard" && hasId ? (
                              <View style={{ width: "100%", justifyContent: "center", alignItems: "center", paddingVertical: 10 }}>
                                {renderIDCard(
                                  myRecord,
                                  myRecord.idCardTheme,
                                  myRecord.idCardRole,
                                  myRecord.idCardExpiry
                                )}
                              </View>
                            ) : null}

                            {activeTab === "hallticket" && hasTicket ? (
                              <View style={{ width: "100%", justifyContent: "center", alignItems: "center", paddingVertical: 10 }}>
                                {renderHallTicket(
                                  myRecord,
                                  myRecord.hallTicketExamName,
                                  myRecord.hallTicketExamDate,
                                  myRecord.hallTicketVenue,
                                  myRecord.hallTicketTime,
                                  myRecord.hallTicketInstructions
                                )}
                              </View>
                            ) : null}
                          </View>
                        );
                      })()
                    )}
                  </>
                )}

                {erpSub === "analytics" && (() => {
                  /* ---- STUDENT: personal analytics ---- */
                  if (user.role === "student") {
                    const myStudent = getLoggedInStudent(user, students);
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

                        {/* Subject-wise breakdown */}
                        <View style={styles.card}>
                          <Text style={styles.sectionTitle}>Subject-wise Performance Analytics</Text>
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
                          {batches.length === 0 ? (
                            <Text style={{ color: "#757575", fontSize: 12, fontStyle: "italic" }}>No batches configured.</Text>
                          ) : (
                            batches.map(b => {
                              const batchStudents = students.filter((s: any) => s.batch === b.batchName);
                              let totalAttended = 0;
                              let totalPossible = 0;
                              batchStudents.forEach((s: any) => {
                                totalAttended += s.attendedDays !== undefined ? Number(s.attendedDays) : 24;
                                totalPossible += s.totalDays !== undefined ? Number(s.totalDays) : 28;
                              });
                              const pct = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 85;
                              return (
                                <View key={b.id || b.batchName} style={{ gap: 4 }}>
                                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                    <Text style={{ color: "#212121", fontSize: 13 }}>{b.batchName}</Text>
                                    <Text style={{ color: pct >= 75 ? "#2e7d32" : "#c62828", fontSize: 12, fontWeight: "bold" }}>{pct}%</Text>
                                  </View>
                                  <View style={{ height: 6, backgroundColor: "#eeeeee", borderRadius: 3, overflow: "hidden" }}>
                                    <View style={{ width: `${pct}%`, height: "100%", backgroundColor: pct >= 75 ? "#2e7d32" : "#c62828" }} />
                                  </View>
                                  <Text style={{ color: "#757575", fontSize: 10 }}>
                                    {batchStudents.length} candidate(s) enrolled
                                  </Text>
                                </View>
                              );
                            })
                          )}
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
                        const myStudent = getLoggedInStudent(user, students);
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
                              const stud = students.find((s) => s.id === r.studentId || s.userId === r.studentId);
                              const lead = leads.find((ld) => ld.id === r.studentId || ld.userId === r.studentId);
                              const resolvedName = r.studentName || (stud ? getStudentName(stud) : (lead ? lead.name : `Guest: ${r.studentId.substring(0, 8)}`));
                              const resolvedRoll = r.rollNumber || (stud ? stud.rollNumber : "Guest");
                              const name = user.role === "student" ? `My Score (${resolvedRoll})` : `${resolvedName} (${resolvedRoll})`;
                              const isPass = r.status === "pass" && (r.obtainedMarks || 0) > 0;
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
              <View style={[styles.sidebar, darkMode && styles.sidebarDark, { height: "100%", paddingHorizontal: 5, position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2000, shadowColor: "#000", shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 8 }]}>
                {/* Close Sidebar Button (Arrow Button below menu bar) */}
                <TouchableOpacity
                  onPress={() => setLmsTabsCollapsed(true)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: darkMode ? "#c6282820" : "#ffebee",
                    borderWidth: 1,
                    borderColor: darkMode ? "#c6282840" : "#ffcdd2",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 15,
                    alignSelf: "center"
                  }}
                >
                  <Ionicons name="arrow-back-outline" size={20} color="#c62828" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => changeLmsSub("quiz")} style={[styles.sidebarTab, (lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") && styles.sidebarTabActive, (lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="help-circle-outline" size={22} color={(lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, (lmsSub === "quiz" || lmsSub === "all-quizzes" || lmsSub === "create-quiz") && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Quiz</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeLmsSub("resources")} style={[styles.sidebarTab, lmsSub === "resources" && styles.sidebarTabActive, lmsSub === "resources" && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="folder-outline" size={22} color={lmsSub === "resources" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, lmsSub === "resources" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Resources</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeLmsSub("live-classes")} style={[styles.sidebarTab, lmsSub === "live-classes" && styles.sidebarTabActive, lmsSub === "live-classes" && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="videocam-outline" size={22} color={lmsSub === "live-classes" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, lmsSub === "live-classes" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Live</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeLmsSub("recorded")} style={[styles.sidebarTab, lmsSub === "recorded" && styles.sidebarTabActive, lmsSub === "recorded" && darkMode && styles.sidebarTabActiveDark]}>
                  <Ionicons name="play-circle-outline" size={22} color={lmsSub === "recorded" ? "#c62828" : darkMode ? "#9e9e9e" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, lmsSub === "recorded" && styles.sidebarTabTxtActive, darkMode && styles.sidebarTabTxtDark]}>Recorded</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Show Sidebar Button */}
            {lmsTabsCollapsed && (
              <TouchableOpacity
                onPress={() => setLmsTabsCollapsed(false)}
                style={{
                  position: "absolute",
                  left: 10,
                  top: 10,
                  zIndex: 1000,
                  backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: darkMode ? "#333" : "#e0e0e0",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 2.5,
                  elevation: 4
                }}
              >
                <Ionicons name="arrow-forward-outline" size={20} color="#c62828" />
              </TouchableOpacity>
            )}

            <ScrollView style={[styles.splitContent, { paddingTop: 50 }, darkMode && styles.splitContentDark]} contentContainerStyle={{ paddingBottom: 80 }}>

              {/* Consolidated Quiz Section */}
              {(lmsSub === "quiz" || lmsSub === undefined || lmsSub === "create-quiz" || lmsSub === "all-quizzes") && (
                <View style={{ gap: 20 }}>
                  {/* Part 1: Publish Quiz (Visible only to Admin/Staff) */}
                  {user?.role !== "student" && (
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

                  {/* Part 2: Today's Quiz (Attempt or Review for Student, Stats for Admin) */}
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

                  {/* Part 3: All Published Quizzes */}
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
                              <View style={{ flex: 1, gap: 2 }}>
                                <Text style={{ fontSize: 14, fontWeight: "bold", color: darkMode ? "#e0e0e0" : "#212121" }}>{quiz.title || `Daily Quiz - ${quiz.quizDate}`}</Text>
                                <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 12 }}>Date: {quiz.quizDate}</Text>
                                <Text style={{ color: darkMode ? "#9e9e9e" : "#757575", fontSize: 12 }}>Questions: {quiz.questions?.length || quiz.questionCount || 0}</Text>
                                {quiz.autoDisableAt && <Text style={{ color: darkMode ? "#616161" : "#888", fontSize: 11 }}>Expires: {new Date(quiz.autoDisableAt).toLocaleString()}</Text>}
                                {user?.role !== "student" && (
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: darkMode ? "#1a2a1a" : "#e8f5e9", borderRadius: 20, alignSelf: "flex-start" }}>
                                    <Ionicons name="people-outline" size={13} color="#2e7d32" />
                                    <Text style={{ fontSize: 11, fontWeight: "bold", color: "#2e7d32" }}>
                                      {quiz.attemptCount ?? 0} student{(quiz.attemptCount ?? 0) !== 1 ? "s" : ""} attempted
                                    </Text>
                                  </View>
                                )}
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
                              <TouchableOpacity
                                onPress={async () => {
                                  try {
                                    await api.delete(`/lms/daily-quiz/${quiz.id}`);
                                    loadAllQuizzes();
                                    loadTodayQuiz();
                                    Alert.alert("Deleted", "Quiz removed.");
                                  } catch (e: any) {
                                    Alert.alert("Error", e.message);
                                  }
                                }}
                                style={[styles.outlineBtn, { marginTop: 8, borderColor: "#c62828" }]}
                              >
                                <Text style={[styles.outlineBtnTxt, { color: "#c62828" }]}>Delete Quiz</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
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
              <View style={[styles.sidebar, darkMode && styles.sidebarDark, { height: "100%", paddingHorizontal: 5, position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 2000, shadowColor: "#000", shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 8 }]}>
                {/* Close Sidebar Button (Arrow Button below menu bar) */}
                <TouchableOpacity
                  onPress={() => setCrmSidebarCollapsed(true)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: darkMode ? "#c6282820" : "#ffebee",
                    borderWidth: 1,
                    borderColor: darkMode ? "#c6282840" : "#ffcdd2",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 15,
                    alignSelf: "center"
                  }}
                >
                  <Ionicons name="arrow-back-outline" size={20} color="#c62828" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => changeCrmSub("admissions")}
                  style={[styles.sidebarTab, crmSub === "admissions" && styles.sidebarTabActive]}
                >
                  <Ionicons name="mail-outline" size={20} color={crmSub === "admissions" ? "#c62828" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, crmSub === "admissions" && styles.sidebarTabTxtActive]}>Inquiries</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => changeCrmSub("leads")}
                  style={[styles.sidebarTab, crmSub === "leads" && styles.sidebarTabActive]}
                >
                  <Ionicons name="funnel-outline" size={20} color={crmSub === "leads" ? "#c62828" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, crmSub === "leads" && styles.sidebarTabTxtActive]}>Leads</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => changeCrmSub("campaigns")}
                  style={[styles.sidebarTab, crmSub === "campaigns" && styles.sidebarTabActive]}
                >
                  <Ionicons name="megaphone-outline" size={20} color={crmSub === "campaigns" ? "#c62828" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, crmSub === "campaigns" && styles.sidebarTabTxtActive]}>Campaigns</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => changeCrmSub("feedback")}
                  style={[styles.sidebarTab, crmSub === "feedback" && styles.sidebarTabActive]}
                >
                  <Ionicons name="star-outline" size={20} color={crmSub === "feedback" ? "#c62828" : "#757575"} />
                  <Text style={[styles.sidebarTabTxt, crmSub === "feedback" && styles.sidebarTabTxtActive]}>Feedbacks</Text>
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
                    backgroundColor: darkMode ? "#1e1e1e" : "#ffffff",
                    borderRadius: 8,
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: darkMode ? "#333" : "#e0e0e0",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 2.5,
                    elevation: 4
                  }}
                >
                  <Ionicons name="arrow-forward-outline" size={20} color="#c62828" />
                </TouchableOpacity>
              )}
              <ScrollView style={[styles.splitContent, { paddingTop: 50 }]} contentContainerStyle={{ paddingBottom: 80 }}>
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
                              <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={{ fontWeight: "bold", color: "#212121", fontSize: 14 }}>
                                  {f.name} {f.email ? `(${f.email})` : ""}
                                </Text>
                                <Text style={{ fontSize: 11, color: "#757575", marginTop: 2, fontWeight: "600" }}>
                                  Role: {(f.batch || "student").toUpperCase()}
                                </Text>
                              </View>
                              <Text style={{ color: "#FFA000", fontWeight: "bold" }}>{"★".repeat(f.rating || 5)}</Text>
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
                                    return isNaN(d.getTime()) ? "" : "Submitted: " + d.toLocaleString();
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
          <Text style={[styles.bottomTabLabel, activeTab === "dashboard" && styles.bottomTabLabelActive, !(activeTab === "dashboard") && darkMode && styles.bottomTabLabelDark]}>Dashboard</Text>
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
      {/* Custom Calendar Picker Modal */}
      {showCalendar && (
        <Modal visible={true} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <View style={{ backgroundColor: "#ffffff", borderRadius: 16, width: "100%", maxWidth: 360, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}>
              {/* Header: Month & Year Selector */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <TouchableOpacity onPress={() => {
                  setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
                  setCalendarView("days");
                }} style={{ padding: 8 }}>
                  <Ionicons name="chevron-back" size={24} color="#0288d1" />
                </TouchableOpacity>

                <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                  <TouchableOpacity onPress={() => setCalendarView(calendarView === "months" ? "days" : "months")}>
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: calendarView === "months" ? "#0288d1" : "#212121" }}>
                      {MONTHS[calendarDate.getMonth()]}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setCalendarView(calendarView === "years" ? "days" : "years")}>
                    <Text style={{ fontSize: 16, fontWeight: "bold", color: calendarView === "years" ? "#0288d1" : "#212121" }}>
                      {calendarDate.getFullYear()}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => {
                  setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
                  setCalendarView("days");
                }} style={{ padding: 8 }}>
                  <Ionicons name="chevron-forward" size={24} color="#0288d1" />
                </TouchableOpacity>
              </View>

              {/* View 1: Days Grid */}
              {calendarView === "days" && (() => {
                const year = calendarDate.getFullYear();
                const month = calendarDate.getMonth();
                const firstDayIndex = new Date(year, month, 1).getDay();
                const numDays = new Date(year, month + 1, 0).getDate();
                const prevNumDays = new Date(year, month, 0).getDate();

                const cells = [];
                // Add prev month days padding
                for (let i = firstDayIndex - 1; i >= 0; i--) {
                  cells.push({ day: prevNumDays - i, currentMonth: false });
                }
                // Add current month days
                for (let i = 1; i <= numDays; i++) {
                  cells.push({ day: i, currentMonth: true });
                }
                // Complete the grid (multiples of 7)
                const totalCells = Math.ceil(cells.length / 7) * 7;
                const nextMonthPadding = totalCells - cells.length;
                for (let i = 1; i <= nextMonthPadding; i++) {
                  cells.push({ day: i, currentMonth: false });
                }

                return (
                  <View>
                    {/* Days of Week Headers */}
                    <View style={{ flexDirection: "row", marginBottom: 8 }}>
                      {DAYS_OF_WEEK.map((d, idx) => (
                        <Text key={idx} style={{ flex: 1, textAlign: "center", fontWeight: "bold", color: "#757575", fontSize: 13 }}>{d}</Text>
                      ))}
                    </View>
                    {/* Days Grid */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                      {cells.map((cell, idx) => {
                        const isToday = cell.currentMonth && new Date().toDateString() === new Date(year, month, cell.day).toDateString();
                        return (
                          <TouchableOpacity
                            key={idx}
                            disabled={!cell.currentMonth}
                            onPress={() => handleSelectDate(new Date(year, month, cell.day))}
                            style={{
                              width: `${100 / 7}%`,
                              aspectRatio: 1,
                              justifyContent: "center",
                              alignItems: "center",
                              borderRadius: 18,
                              backgroundColor: isToday ? "#e3f2fd" : "transparent"
                            }}
                          >
                            <Text style={{
                              color: cell.currentMonth ? "#212121" : "#bdbdbd",
                              fontWeight: cell.currentMonth ? "600" : "normal",
                              fontSize: 14
                            }}>
                              {cell.day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })()}

              {/* View 2: Month Grid Selector */}
              {calendarView === "months" && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", paddingVertical: 10 }}>
                  {MONTHS.map((m, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        setCalendarDate(new Date(calendarDate.getFullYear(), idx, 1));
                        setCalendarView("days");
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderRadius: 20,
                        backgroundColor: calendarDate.getMonth() === idx ? "#0288d1" : "#f5f5f5",
                        minWidth: "28%",
                        alignItems: "center"
                      }}
                    >
                      <Text style={{ color: calendarDate.getMonth() === idx ? "#ffffff" : "#212121", fontWeight: "bold", fontSize: 13 }}>
                        {m.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* View 3: Year Scroll Grid Selector */}
              {calendarView === "years" && (() => {
                const years = [];
                for (let y = 2050; y >= 1950; y--) {
                  years.push(y);
                }
                return (
                  <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={true}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", paddingVertical: 8 }}>
                      {years.map(y => (
                        <TouchableOpacity
                          key={y}
                          onPress={() => {
                            setCalendarDate(new Date(y, calendarDate.getMonth(), 1));
                            setCalendarView("days");
                          }}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 12,
                            borderRadius: 16,
                            backgroundColor: calendarDate.getFullYear() === y ? "#0288d1" : "#f5f5f5",
                            minWidth: "22%",
                            alignItems: "center"
                          }}
                        >
                          <Text style={{ color: calendarDate.getFullYear() === y ? "#ffffff" : "#212121", fontWeight: "bold", fontSize: 13 }}>
                            {y}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                );
              })()}

              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16, borderTopWidth: 1, borderColor: "#eee", paddingTop: 12 }}>
                <TouchableOpacity onPress={() => setShowCalendar(false)} style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                  <Text style={{ color: "#757575", fontWeight: "bold" }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Quick Fee Edit Modal */}
      {feeEditStudent && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFeeEditStudent(null)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
            <View style={{ width: "90%", maxWidth: 450, backgroundColor: darkMode ? "#1e1e1e" : "#ffffff", borderRadius: 12, overflow: "hidden", padding: 20, gap: 15 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "#eeeeee", paddingBottom: 10 }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: darkMode ? "#e0e0e0" : "#212121" }}>Update Fee Details</Text>
                  <Text style={{ fontSize: 12, color: "#757575", marginTop: 2 }}>{getStudentName(feeEditStudent)}</Text>
                </View>
                <TouchableOpacity onPress={() => setFeeEditStudent(null)}>
                  <Ionicons name="close-circle" size={24} color="#757575" />
                </TouchableOpacity>
              </View>

              <View style={{ gap: 12 }}>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: "bold", color: "#555", marginBottom: 6 }}>Total Course Fees (₹)</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    placeholder="e.g. 50000"
                    placeholderTextColor="#999"
                    value={feeEditStudent.totalFees !== undefined ? String(feeEditStudent.totalFees) : ""}
                    onChangeText={v => setFeeEditStudent({ ...feeEditStudent, totalFees: v })}
                    keyboardType="numeric"
                  />
                </View>

                <View>
                  <Text style={{ fontSize: 12, fontWeight: "bold", color: "#555", marginBottom: 6 }}>Fees Paid (₹)</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0 }]}
                    placeholder="e.g. 20000"
                    placeholderTextColor="#999"
                    value={feeEditStudent.feesPaid !== undefined ? String(feeEditStudent.feesPaid) : ""}
                    onChangeText={v => setFeeEditStudent({ ...feeEditStudent, feesPaid: v })}
                    keyboardType="numeric"
                  />
                </View>

                {(() => {
                  const tot = Number(feeEditStudent.totalFees) || 0;
                  const paid = Number(feeEditStudent.feesPaid) || 0;
                  const pending = tot - paid;
                  return (
                    <View style={{ backgroundColor: "#f5f5f5", borderRadius: 8, padding: 10, flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: "#555", fontSize: 12 }}>Calculated Pending:</Text>
                      <Text style={{ fontWeight: "bold", color: pending > 0 ? "#c62828" : "#2e7d32", fontSize: 13 }}>
                        ₹{pending.toLocaleString()}
                      </Text>
                    </View>
                  );
                })()}
              </View>

              <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, borderTopWidth: 1, borderColor: "#eeeeee", paddingTop: 12, marginTop: 5 }}>
                <TouchableOpacity
                  onPress={() => setFeeEditStudent(null)}
                  style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, borderWidth: 1, borderColor: "#e0e0e0" }}
                >
                  <Text style={{ color: "#757575", fontWeight: "bold", fontSize: 12 }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await api.put(`/erp/student/${feeEditStudent.id}`, {
                        totalFees: feeEditStudent.totalFees,
                        feesPaid: feeEditStudent.feesPaid
                      });
                      setFeeEditStudent(null);
                      loadStudents();
                      Alert.alert("Success", "Student fee details updated successfully.");
                    } catch (err: any) {
                      Alert.alert("Error", err.message || "Failed to update fees.");
                    }
                  }}
                  style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, backgroundColor: "#0288d1" }}
                >
                  <Text style={{ color: "#ffffff", fontWeight: "bold", fontSize: 12 }}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Universal Image Preview Modal */}
      <Modal
        visible={previewImageUri !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImageUri(null)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ width: "90%", maxHeight: "80%", backgroundColor: darkMode ? "#1e1e1e" : "#ffffff", borderRadius: 12, overflow: "hidden", padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "bold", color: darkMode ? "#e0e0e0" : "#212121" }}>{previewImageTitle}</Text>
              <TouchableOpacity onPress={() => setPreviewImageUri(null)}>
                <Ionicons name="close-circle" size={26} color="#c62828" />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              {previewImageUri ? (
                <Image
                  source={{ uri: previewImageUri }}
                  style={{ width: "100%", height: 350, resizeMode: "contain", borderRadius: 8 }}
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
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
    minWidth: 220,
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
