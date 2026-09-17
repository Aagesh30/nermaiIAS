import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  useWindowDimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import api from '../core/api';

export type NatureOfEnquiry = 'visit' | 'phone' | 'whatsapp' | 'Telegram' | 'W35' | 'FB' | 'Instagram' | 'portal';

export interface UnifiedRecord {
  id: string;
  sourceType: 'admission' | 'lead';
  dateStr: string;
  natureOfEnquiry: NatureOfEnquiry;
  name: string;
  contact: string;
  email?: string;
  mode: 'Offline' | 'Online' | 'Hybrid';
  joinStatus: 'new' | 'contacted' | 'follow_up' | 'joined' | 'not_interested';
  atten: string; // Staff who attended
  reminder1: string;
  reminder2: string;
  reminder3: string;
  reference: string;
  remarks1: string;
  remarks2: string;
  preferredCourse?: string;
  city?: string;
  createdAt?: any;
  rawDetails?: Record<string, any>;
}

const NATURE_OPTIONS: { val: NatureOfEnquiry; label: string; bg: string; color: string }[] = [
  { val: 'visit', label: 'visit', bg: '#fee2e2', color: '#b91c1c' },
  { val: 'phone', label: 'phone', bg: '#dcfce7', color: '#15803d' },
  { val: 'whatsapp', label: 'whatsapp', bg: '#065f46', color: '#ffffff' },
  { val: 'Telegram', label: 'Telegram', bg: '#bae6fd', color: '#0369a1' },
  { val: 'W35', label: 'W35', bg: '#1e3a8a', color: '#ffffff' },
  { val: 'FB', label: 'FB', bg: '#ede9fe', color: '#6d28d9' },
  { val: 'Instagram', label: 'Instagram', bg: '#fef3c7', color: '#b45309' },
  { val: 'portal', label: 'portal', bg: '#f1f5f9', color: '#475569' }
];

const MODE_OPTIONS: ('Offline' | 'Online' | 'Hybrid')[] = ['Offline', 'Online', 'Hybrid'];

const JOIN_STATUS_OPTIONS: { val: UnifiedRecord['joinStatus']; label: string; bg: string; color: string }[] = [
  { val: 'new', label: 'New Enquiry', bg: '#f1f5f9', color: '#0f172a' },
  { val: 'contacted', label: 'Contacted', bg: '#fef3c7', color: '#b45309' },
  { val: 'follow_up', label: 'Follow Up', bg: '#e0e7ff', color: '#4338ca' },
  { val: 'joined', label: 'Joined', bg: '#dcfce7', color: '#15803d' },
  { val: 'not_interested', label: 'Not Interested', bg: '#fee2e2', color: '#dc2626' }
];

const DEFAULT_STAFF_LIST = [
  'Admin Staff',
  'Reception',
  'Counselor 1',
  'Counselor 2',
  'Faculty Team',
  'Academic Coordinator'
];

export default function MergedLeadsAdmissionsPage() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [admissions, setAdmissions] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Staff List for ATTEN
  const [staffList, setStaffList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('crm_atten_staff_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_STAFF_LIST;
  });

  // Modal to Add New Staff Name
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffInput, setNewStaffInput] = useState('');
  const [targetRecordForStaff, setTargetRecordForStaff] = useState<UnifiedRecord | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'admission' | 'lead'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'joined'>('all');

  // Excel File Upload Ref & State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  // Active Dropdown Popover (for mobile & custom dropdowns)
  const [activePicker, setActivePicker] = useState<{
    recordId: string;
    field: 'nature' | 'mode' | 'joinStatus' | 'atten';
    currentVal: string;
  } | null>(null);

  // Selected Record for Full Editing Modal
  const [selectedRecord, setSelectedRecord] = useState<UnifiedRecord | null>(null);
  const [editNature, setEditNature] = useState<NatureOfEnquiry>('phone');
  const [editJoinStatus, setEditJoinStatus] = useState<UnifiedRecord['joinStatus']>('new');
  const [editAtten, setEditAtten] = useState('Admin Staff');
  const [editMode, setEditMode] = useState<'Offline' | 'Online' | 'Hybrid'>('Offline');
  const [editReminder1, setEditReminder1] = useState('');
  const [editReminder2, setEditReminder2] = useState('');
  const [editReminder3, setEditReminder3] = useState('');
  const [editReference, setEditReference] = useState('');
  const [editRemarks1, setEditRemarks1] = useState('');
  const [editRemarks2, setEditRemarks2] = useState('');
  const [updating, setUpdating] = useState(false);

  // Add New Enquiry Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCourse, setNewCourse] = useState('');
  const [newNature, setNewNature] = useState<NatureOfEnquiry>('phone');
  const [newMode, setNewMode] = useState<'Offline' | 'Online' | 'Hybrid'>('Offline');
  const [newAtten, setNewAtten] = useState('Admin Staff');
  const [newReference, setNewReference] = useState('');
  const [newRemarks, setNewRemarks] = useState('');
  const [adding, setAdding] = useState(false);

  // Lead Broadcast Notice Modal
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMsg, setNotifyMsg] = useState('');
  const [sendingNotify, setSendingNotify] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [admRes, leadsRes] = await Promise.allSettled([
        api.get('/crm/admission'),
        api.get('/crm/leads')
      ]);

      if (admRes.status === 'fulfilled') {
        const d = admRes.value.data;
        const list = Array.isArray(d) ? d : (d?.data || d?.admissions || []);
        setAdmissions(Array.isArray(list) ? list : []);
      }

      if (leadsRes.status === 'fulfilled') {
        const d = leadsRes.value.data;
        const list = Array.isArray(d) ? d : (d?.data || d?.leads || []);
        setLeads(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      console.error('Failed to fetch merged enquiry data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Convert raw API records into unified enquiry rows matching the official Excel layout
  const unifiedList = useMemo<UnifiedRecord[]>(() => {
    const list: UnifiedRecord[] = [];

    // Map Admissions
    admissions.forEach((item: any) => {
      const dateVal = item.createdAt?._seconds
        ? new Date(item.createdAt._seconds * 1000).toLocaleDateString()
        : (item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date().toLocaleDateString());

      let normNature: NatureOfEnquiry = item.natureOfEnquiry || (item.source?.toLowerCase().includes('walk') ? 'visit' : item.source?.toLowerCase().includes('what') ? 'whatsapp' : item.source?.toLowerCase().includes('tele') ? 'Telegram' : item.source?.toLowerCase().includes('fb') ? 'FB' : item.source?.toLowerCase().includes('insta') ? 'Instagram' : 'phone');
      
      let normMode: 'Offline' | 'Online' | 'Hybrid' = 'Offline';
      if (item.preferredMode?.toLowerCase() === 'online') normMode = 'Online';
      else if (item.preferredMode?.toLowerCase() === 'hybrid') normMode = 'Hybrid';

      let normJoinStatus: UnifiedRecord['joinStatus'] = item.status === 'converted' ? 'joined' : (item.joinStatus || 'new');

      list.push({
        id: item.id || item._id,
        sourceType: 'admission',
        dateStr: dateVal,
        natureOfEnquiry: normNature,
        name: item.name || item.studentName || 'Applicant',
        contact: item.phone || item.mobile || '',
        email: item.email || '',
        mode: normMode,
        joinStatus: normJoinStatus,
        atten: item.atten || item.attendedBy || item.createdBy || 'Admin Staff',
        reminder1: item.reminder1 || item.reminders?.[0] || '',
        reminder2: item.reminder2 || item.reminders?.[1] || '',
        reminder3: item.reminder3 || item.reminders?.[2] || '',
        reference: item.reference || item.source || item.referral || '',
        remarks1: item.remarks1 || item.notes || item.remarks || '',
        remarks2: item.remarks2 || item.counselorNotes || '',
        preferredCourse: item.preferredCourse || item.course || '',
        city: item.city || item.address || '',
        createdAt: item.createdAt || item.appliedAt,
        rawDetails: item
      });
    });

    // Map Guest Leads
    leads.forEach((item: any) => {
      const dateVal = item.registeredAt?._seconds
        ? new Date(item.registeredAt._seconds * 1000).toLocaleDateString()
        : (item.registeredAt ? new Date(item.registeredAt).toLocaleDateString() : new Date().toLocaleDateString());

      let normNature: NatureOfEnquiry = item.natureOfEnquiry || (item.source?.toLowerCase().includes('insta') ? 'Instagram' : item.source?.toLowerCase().includes('fb') ? 'FB' : item.source?.toLowerCase().includes('tele') ? 'Telegram' : item.source?.toLowerCase().includes('what') ? 'whatsapp' : 'portal');

      let normMode: 'Offline' | 'Online' | 'Hybrid' = 'Offline';
      if (item.mode?.toLowerCase() === 'online') normMode = 'Online';
      else if (item.mode?.toLowerCase() === 'hybrid') normMode = 'Hybrid';

      let normJoinStatus: UnifiedRecord['joinStatus'] = item.status === 'converted' ? 'joined' : item.status === 'applied' ? 'follow_up' : (item.joinStatus || 'new');

      list.push({
        id: item.id || item._id,
        sourceType: 'lead',
        dateStr: dateVal,
        natureOfEnquiry: normNature,
        name: item.name || (item.email ? item.email.split('@')[0] : 'Guest Lead'),
        contact: item.phone || '',
        email: item.email || '',
        mode: normMode,
        joinStatus: normJoinStatus,
        atten: item.atten || item.attendedBy || 'Admin Staff',
        reminder1: item.reminder1 || '',
        reminder2: item.reminder2 || '',
        reminder3: item.reminder3 || '',
        reference: item.reference || item.source || 'Online Portal',
        remarks1: item.remarks1 || item.notes || '',
        remarks2: item.remarks2 || '',
        preferredCourse: item.course || item.targetExam || '',
        city: item.city || '',
        createdAt: item.registeredAt || item.createdAt,
        rawDetails: item
      });
    });

    // Merge any custom staff names found in existing records into staffList
    const customStaffs = new Set<string>();
    list.forEach(r => {
      if (r.atten && r.atten.trim()) customStaffs.add(r.atten.trim());
    });
    setStaffList(prev => {
      let changed = false;
      const combined = [...prev];
      customStaffs.forEach(cs => {
        if (!combined.includes(cs)) {
          combined.push(cs);
          changed = true;
        }
      });
      return changed ? combined : prev;
    });

    // Sort by Date Descending
    return list.sort((a, b) => {
      const timeA = a.createdAt?._seconds ? a.createdAt._seconds * 1000 : new Date(a.createdAt || 0).getTime();
      const timeB = b.createdAt?._seconds ? b.createdAt._seconds * 1000 : new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
  }, [admissions, leads]);

  // Metrics Calculation
  const metrics = useMemo(() => {
    const total = unifiedList.length;
    const pendingCount = unifiedList.filter(r => r.joinStatus !== 'joined').length;
    const joinedCount = unifiedList.filter(r => r.joinStatus === 'joined').length;
    const visitCount = unifiedList.filter(r => r.natureOfEnquiry === 'visit').length;
    return { total, pendingCount, joinedCount, visitCount };
  }, [unifiedList]);

  // Filtered List
  const filteredList = useMemo(() => {
    return unifiedList.filter(item => {
      // Source type filter
      if (typeFilter !== 'all' && item.sourceType !== typeFilter) {
        return false;
      }
      // Status filter
      if (statusFilter === 'pending' && item.joinStatus === 'joined') {
        return false;
      }
      if (statusFilter === 'joined' && item.joinStatus !== 'joined') {
        return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesContact = item.contact.includes(q);
        const matchesEmail = item.email ? item.email.toLowerCase().includes(q) : false;
        const matchesAtten = item.atten.toLowerCase().includes(q);
        const matchesRef = item.reference.toLowerCase().includes(q);
        const matchesRemarks = item.remarks1.toLowerCase().includes(q) || item.remarks2.toLowerCase().includes(q);
        const matchesCourse = item.preferredCourse ? item.preferredCourse.toLowerCase().includes(q) : false;

        if (!matchesName && !matchesContact && !matchesEmail && !matchesAtten && !matchesRef && !matchesRemarks && !matchesCourse) {
          return false;
        }
      }
      return true;
    });
  }, [unifiedList, typeFilter, statusFilter, searchTerm]);

  // Direct Inline Dropdown Update Handler
  const handleInlineUpdate = async (record: UnifiedRecord, field: 'nature' | 'mode' | 'joinStatus' | 'atten', value: string) => {
    // If Admin clicked "➕ Add New Staff..."
    if (field === 'atten' && value === '__ADD_NEW__') {
      setTargetRecordForStaff(record);
      setNewStaffInput('');
      setShowAddStaffModal(true);
      return;
    }

    const payload: any = { updatedBy: 'admin' };

    if (field === 'nature') {
      payload.natureOfEnquiry = value;
    } else if (field === 'mode') {
      payload.mode = value;
      payload.preferredMode = value;
    } else if (field === 'joinStatus') {
      payload.joinStatus = value;
      payload.status = value === 'joined' ? 'converted' : 'pending';
    } else if (field === 'atten') {
      payload.atten = value;
      payload.attendedBy = value;
    }

    // Optimistic local state update
    if (record.sourceType === 'admission') {
      setAdmissions(prev =>
        prev.map(a => (a.id === record.id || a._id === record.id) ? { ...a, ...payload } : a)
      );
    } else {
      setLeads(prev =>
        prev.map(l => (l.id === record.id || l._id === record.id) ? { ...l, ...payload } : l)
      );
    }

    try {
      if (record.sourceType === 'admission') {
        await api.patch(`/crm/admission/${record.id}`, payload);
      } else {
        await api.patch(`/crm/leads/${record.id}`, payload);
      }
    } catch (err) {
      console.error(`Failed to update ${field}:`, err);
    }
  };

  // Add new staff handler
  const handleAddNewStaffSubmit = async () => {
    const trimmed = newStaffInput.trim();
    if (!trimmed) {
      Alert.alert('Required', 'Please enter a staff / counselor name.');
      return;
    }

    // Update staff list
    setStaffList(prev => {
      const updated = prev.includes(trimmed) ? prev : [...prev, trimmed];
      try {
        localStorage.setItem('crm_atten_staff_list', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // If a target record was being updated, assign this new staff to that record
    if (targetRecordForStaff) {
      await handleInlineUpdate(targetRecordForStaff, 'atten', trimmed);
    }

    setShowAddStaffModal(false);
    setNewStaffInput('');
    setTargetRecordForStaff(null);
  };

  // Handle Save Full Details from Modal
  const handleSaveRecord = async () => {
    if (!selectedRecord) return;
    setUpdating(true);
    try {
      const payload: any = {
        natureOfEnquiry: editNature,
        status: editJoinStatus === 'joined' ? 'converted' : 'pending',
        joinStatus: editJoinStatus,
        atten: editAtten,
        mode: editMode,
        preferredMode: editMode,
        reminder1: editReminder1,
        reminder2: editReminder2,
        reminder3: editReminder3,
        reference: editReference,
        remarks1: editRemarks1,
        remarks2: editRemarks2,
        notes: editRemarks1,
        updatedBy: 'admin'
      };

      if (selectedRecord.sourceType === 'admission') {
        await api.patch(`/crm/admission/${selectedRecord.id}`, payload);
        setAdmissions(prev =>
          prev.map(a => (a.id === selectedRecord.id || a._id === selectedRecord.id) ? { ...a, ...payload } : a)
        );
      } else {
        await api.patch(`/crm/leads/${selectedRecord.id}`, payload);
        setLeads(prev =>
          prev.map(l => (l.id === selectedRecord.id || l._id === selectedRecord.id) ? { ...l, ...payload } : l)
        );
      }

      setSelectedRecord(null);
      Alert.alert('Saved', 'Enquiry details updated successfully!');
    } catch (err) {
      console.error('Failed to update enquiry:', err);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle Adding New Walk-in / Direct Enquiry
  const handleCreateEnquiry = async () => {
    if (!newName.trim() || !newContact.trim()) {
      Alert.alert('Required Fields', 'Please enter candidate name and contact phone number.');
      return;
    }
    setAdding(true);
    try {
      const payload = {
        name: newName.trim(),
        phone: newContact.trim(),
        email: newEmail.trim(),
        course: newCourse.trim(),
        preferredCourse: newCourse.trim(),
        natureOfEnquiry: newNature,
        mode: newMode,
        preferredMode: newMode,
        atten: newAtten.trim() || 'Admin Staff',
        reference: newReference.trim(),
        notes: newRemarks.trim(),
        remarks1: newRemarks.trim(),
        status: 'pending',
        joinStatus: 'new'
      };

      const res = await api.post('/crm/admission', payload);
      const createdItem = res.data?.data || payload;
      setAdmissions(prev => [createdItem, ...prev]);

      setShowAddModal(false);
      setNewName('');
      setNewContact('');
      setNewEmail('');
      setNewCourse('');
      setNewReference('');
      setNewRemarks('');
      Alert.alert('Success', 'New Enquiry recorded successfully!');
    } catch (err) {
      console.error('Failed to create enquiry:', err);
      Alert.alert('Error', 'Could not save new enquiry.');
    } finally {
      setAdding(false);
    }
  };

  // Delete Record
  const handleDeleteRecord = async (record: UnifiedRecord) => {
    if (!window.confirm(`Are you sure you want to delete enquiry record for "${record.name}"?`)) {
      return;
    }
    try {
      if (record.sourceType === 'admission') {
        await api.delete(`/crm/admission/${record.id}`);
        setAdmissions(prev => prev.filter(a => (a.id || a._id) !== record.id));
      } else {
        await api.delete(`/crm/leads/${record.id}`);
        setLeads(prev => prev.filter(l => (l.id || l._id) !== record.id));
      }
      if (selectedRecord?.id === record.id) setSelectedRecord(null);
    } catch (err) {
      console.error('Failed to delete enquiry:', err);
      Alert.alert('Error', 'Failed to delete record.');
    }
  };

  // Lead Broadcast Notice
  const handleSendLeadNotification = async () => {
    if (!notifyTitle.trim() || !notifyMsg.trim()) {
      Alert.alert('Required Fields', 'Please enter a notification title and message.');
      return;
    }
    setSendingNotify(true);
    try {
      await api.post('/crm/leads/notify', {
        title: notifyTitle,
        message: notifyMsg,
        target: 'all_pending'
      });
      Alert.alert('Success', 'Broadcast notification sent to pending leads successfully!');
      setShowNotifyModal(false);
      setNotifyTitle('');
      setNotifyMsg('');
    } catch (err) {
      console.error('Failed to send broadcast notification:', err);
      Alert.alert('Error', 'Could not send broadcast notification.');
    } finally {
      setSendingNotify(false);
    }
  };

  // Export to Excel in the Exact Academy Enquiry Format
  const handleExportExcel = () => {
    if (filteredList.length === 0) {
      Alert.alert('Export', 'No records to export.');
      return;
    }

    const rows = filteredList.map((r, index) => {
      return {
        'SL. NO': index + 1,
        'date': r.dateStr,
        'nature of enquiry': r.natureOfEnquiry,
        'NAME': r.name,
        'CONTACT': r.contact,
        'MODE': r.mode,
        'join status': r.joinStatus.toUpperCase(),
        'ATTEN': r.atten,
        'REMINDER 1': r.reminder1 || '',
        'REMINDER 2': r.reminder2 || '',
        'REMINDER 3': r.reminder3 || '',
        'REFERENCE / REMARKS': r.reference || '',
        'REMARKS 1': r.remarks1 || '',
        'REMARKS 2': r.remarks2 || ''
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'G_ENQUIRY_2026');
    XLSX.writeFile(wb, `NERMAI_IAS_ACADEMY_G_ENQUIRY_2026_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Import and Extract Data from Excel File
  const handleFileUpload = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!jsonRows || jsonRows.length === 0) {
        Alert.alert('Empty Sheet', 'No data rows found in the uploaded Excel file.');
        setImporting(false);
        return;
      }

      // Helper function to find case-insensitive column key
      const getVal = (row: any, ...keys: string[]) => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== '') return String(row[k]).trim();
          const lowerK = k.toLowerCase();
          for (const rk of Object.keys(row)) {
            if (rk.trim().toLowerCase() === lowerK && row[rk] !== '') {
              return String(row[rk]).trim();
            }
          }
        }
        return '';
      };

      const promises = [];
      let validCount = 0;

      for (const row of jsonRows) {
        const name = getVal(row, 'NAME', 'Name', 'Applicant Name', 'Candidate Name', 'student name');
        const contact = getVal(row, 'CONTACT', 'Contact', 'PHONE', 'Phone', 'Mobile', 'phone number');

        // Skip completely empty rows
        if (!name && !contact) continue;

        const rawNature = getVal(row, 'nature of enquiry', 'Nature of enquiry', 'nature', 'Nature', 'source').toLowerCase();
        let natureOfEnquiry: NatureOfEnquiry = 'phone';
        if (rawNature.includes('visit') || rawNature.includes('walk')) natureOfEnquiry = 'visit';
        else if (rawNature.includes('what')) natureOfEnquiry = 'whatsapp';
        else if (rawNature.includes('tele')) natureOfEnquiry = 'Telegram';
        else if (rawNature.includes('w35')) natureOfEnquiry = 'W35';
        else if (rawNature.includes('fb') || rawNature.includes('face')) natureOfEnquiry = 'FB';
        else if (rawNature.includes('insta')) natureOfEnquiry = 'Instagram';
        else if (rawNature.includes('phone') || rawNature.includes('call')) natureOfEnquiry = 'phone';

        const rawMode = getVal(row, 'MODE', 'Mode', 'mode', 'Class Mode').toLowerCase();
        let mode: 'Offline' | 'Online' | 'Hybrid' = 'Offline';
        if (rawMode.includes('online')) mode = 'Online';
        else if (rawMode.includes('hyb')) mode = 'Hybrid';

        const rawStatus = getVal(row, 'join status', 'Join Status', 'status', 'Status').toLowerCase();
        let joinStatus: UnifiedRecord['joinStatus'] = 'new';
        let apiStatus = 'pending';
        if (rawStatus.includes('join') || rawStatus.includes('convert') || rawStatus.includes('admit')) {
          joinStatus = 'joined';
          apiStatus = 'converted';
        } else if (rawStatus.includes('follow')) {
          joinStatus = 'follow_up';
        } else if (rawStatus.includes('contact')) {
          joinStatus = 'contacted';
        } else if (rawStatus.includes('not') || rawStatus.includes('reject')) {
          joinStatus = 'not_interested';
        }

        const atten = getVal(row, 'ATTEN', 'Atten', 'Attended By', 'staff', 'Staff') || 'Admin Staff';
        const reminder1 = getVal(row, 'REMINDER 1', 'REMINDER', 'Reminder 1', 'Reminder');
        const reminder2 = getVal(row, 'REMINDER 2', 'Reminder 2');
        const reminder3 = getVal(row, 'REMINDER 3', 'Reminder 3');
        const reference = getVal(row, 'REFERENCE / REMARKS', 'REFERENCE', 'Reference', 'Source', 'Referral');
        const remarks1 = getVal(row, 'REMARKS 1', 'REMARKS', 'Remarks 1', 'Remarks', 'Notes');
        const remarks2 = getVal(row, 'REMARKS 2', 'Remarks 2');

        const payload = {
          name: name || 'Enquiry Candidate',
          phone: contact,
          natureOfEnquiry,
          mode,
          preferredMode: mode,
          joinStatus,
          status: apiStatus,
          atten,
          reminder1,
          reminder2,
          reminder3,
          reference,
          remarks1,
          notes: remarks1,
          remarks2,
          source: natureOfEnquiry,
          updatedBy: 'excel_import'
        };

        promises.push(api.post('/crm/admission', payload));
        validCount++;
      }

      if (validCount > 0) {
        await Promise.allSettled(promises);
        await fetchData();
        Alert.alert('Excel Import Complete', `Successfully imported and arranged ${validCount} enquiries from Excel!`);
      } else {
        Alert.alert('No Valid Data', 'Could not find any candidate rows with Name or Contact.');
      }
    } catch (err) {
      console.error('Failed to parse Excel file:', err);
      Alert.alert('Error', 'Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.');
    } finally {
      setImporting(false);
      if (e.target) e.target.value = '';
    }
  };

  const getNatureBadge = (nature: NatureOfEnquiry) => {
    const found = NATURE_OPTIONS.find(n => n.val === nature);
    return found || { val: 'portal', label: 'portal', bg: '#f1f5f9', color: '#475569' };
  };

  const getJoinStatusBadge = (status: UnifiedRecord['joinStatus']) => {
    const found = JOIN_STATUS_OPTIONS.find(s => s.val === status);
    return found || { val: 'new', label: 'New Enquiry', bg: '#f1f5f9', color: '#0f172a' };
  };

  return (
    <View style={[styles.container, isMobile && { padding: 12 }]}>
      {/* Top Header */}
      <View style={[styles.header, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: 14 }]}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="book-account-outline" size={26} color="#b91c1c" />
            <Text style={[styles.headerTitle, isMobile && { fontSize: 18 }]}>NERMAI IAS ACADEMY G ENQUIRY 2026</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Consolidated management of Academy Admissions, Walk-in Enquiries, and Social Leads.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: isMobile ? 'space-between' : 'flex-end', flexWrap: 'wrap' }}>
          {/* Hidden File Input for Excel Upload */}
          {Platform.OS === 'web' && (
            <input
              type="file"
              ref={fileInputRef as any}
              style={{ display: 'none' }}
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
            />
          )}

          <TouchableOpacity
            style={[styles.addBtn, isMobile && { flex: 1, justifyContent: 'center' }]}
            onPress={() => setShowAddModal(true)}
          >
            <MaterialCommunityIcons name="plus-circle-outline" size={17} color="#fff" />
            <Text style={styles.addBtnText}>New Enquiry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.uploadBtn, isMobile && { flex: 1, justifyContent: 'center' }]}
            onPress={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator size="small" color="#1d4ed8" />
            ) : (
              <MaterialCommunityIcons name="file-upload-outline" size={18} color="#1d4ed8" />
            )}
            <Text style={styles.uploadBtnText}>{importing ? 'Importing...' : 'Upload Excel'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.notifyBtn, isMobile && { flex: 1, justifyContent: 'center' }]}
            onPress={() => setShowNotifyModal(true)}
          >
            <MaterialCommunityIcons name="send-outline" size={16} color="#1d4ed8" />
            <Text style={styles.notifyBtnText}>Notify Leads</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.refreshBtn, isMobile && { flex: 1, justifyContent: 'center' }]}
            onPress={fetchData}
            disabled={loading}
          >
            <MaterialCommunityIcons name="refresh" size={18} color="#475569" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, isMobile && { flex: 1, justifyContent: 'center' }]}
            onPress={handleExportExcel}
          >
            <MaterialCommunityIcons name="file-excel-outline" size={18} color="#15803d" />
            <Text style={styles.exportBtnText}>Export Excel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4 Stat Metric Cards */}
      <View style={[styles.metricsRow, isMobile && { flexWrap: 'wrap', gap: 8 }]}>
        <View style={[styles.metricCard, isMobile && { minWidth: '47%', flex: undefined, padding: 12 }]}>
          <Text style={[styles.metricLabel, isMobile && { fontSize: 9 }]} numberOfLines={1}>TOTAL ENQUIRIES</Text>
          <Text style={[styles.metricValue, { color: '#0f172a' }, isMobile && { fontSize: 20, marginTop: 2 }]}>{metrics.total}</Text>
        </View>
        <View style={[styles.metricCard, isMobile && { minWidth: '47%', flex: undefined, padding: 12 }]}>
          <Text style={[styles.metricLabel, isMobile && { fontSize: 9 }]} numberOfLines={1}>PENDING FOLLOW-UPS</Text>
          <Text style={[styles.metricValue, { color: '#d97706' }, isMobile && { fontSize: 20, marginTop: 2 }]}>{metrics.pendingCount}</Text>
        </View>
        <View style={[styles.metricCard, isMobile && { minWidth: '47%', flex: undefined, padding: 12 }]}>
          <Text style={[styles.metricLabel, isMobile && { fontSize: 9 }]} numberOfLines={1}>DIRECT VISITS</Text>
          <Text style={[styles.metricValue, { color: '#b91c1c' }, isMobile && { fontSize: 20, marginTop: 2 }]}>{metrics.visitCount}</Text>
        </View>
        <View style={[styles.metricCard, isMobile && { minWidth: '47%', flex: undefined, padding: 12 }]}>
          <Text style={[styles.metricLabel, isMobile && { fontSize: 9 }]} numberOfLines={1}>JOINED / ADMITTED</Text>
          <Text style={[styles.metricValue, { color: '#16a34a' }, isMobile && { fontSize: 20, marginTop: 2 }]}>{metrics.joinedCount}</Text>
        </View>
      </View>

      {/* Clean Toolbar with Search & Nature Filter Pills */}
      <View style={[styles.toolbar, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: 10 }]}>
        <View style={[styles.searchBox, isMobile && { width: '100%' }]}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, contact, staff, reference, or remarks..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filter Pills for Type (All / Admissions / Guest Leads) & Status */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
          {[
            { key: 'all', label: 'ALL' },
            { key: 'admission', label: 'ADMISSIONS' },
            { key: 'lead', label: 'GUEST LEADS' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterPill,
                typeFilter === tab.key && styles.filterPillActive
              ]}
              onPress={() => setTypeFilter(tab.key as any)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  typeFilter === tab.key && styles.filterPillTextActive
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={{ width: 1, height: 20, backgroundColor: '#e2e8f0', marginHorizontal: 4 }} />

          {/* Status Filter */}
          {[
            { key: 'all', label: 'ALL STATUS' },
            { key: 'pending', label: 'PENDING' },
            { key: 'joined', label: 'JOINED' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterPill,
                statusFilter === tab.key && styles.filterPillActive
              ]}
              onPress={() => setStatusFilter(tab.key as any)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  statusFilter === tab.key && styles.filterPillTextActive
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Table / Mobile Cards */}
      {loading ? (
        <View style={styles.tableLoading}>
          <ActivityIndicator size="large" color="#b91c1c" />
          <Text style={{ marginTop: 10, color: '#64748b' }}>Loading enquiry sheet...</Text>
        </View>
      ) : filteredList.length === 0 ? (
        <View style={styles.emptyTable}>
          <MaterialCommunityIcons name="account-search-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTableTitle}>No Enquiries Found</Text>
          <Text style={styles.emptyTableSubtitle}>
            No entries matched your current filter criteria. Click "New Enquiry" to add one!
          </Text>
        </View>
      ) : isMobile ? (
        <ScrollView style={{ gap: 10 }} showsVerticalScrollIndicator={false}>
          {filteredList.map((record, idx) => {
            const natureBadge = getNatureBadge(record.natureOfEnquiry);
            const statusBadge = getJoinStatusBadge(record.joinStatus);

            return (
              <View key={record.id + idx} style={{ backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    {/* DROPDOWN 1: NATURE OF ENQUIRY (MOBILE) */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <TouchableOpacity
                        style={[styles.natureBadgePill, { backgroundColor: natureBadge.bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                        onPress={() => setActivePicker({ recordId: record.id, field: 'nature', currentVal: record.natureOfEnquiry })}
                      >
                        <Text style={[styles.natureBadgeText, { color: natureBadge.color }]}>{natureBadge.label}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={12} color={natureBadge.color} />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 11, color: '#94a3b8' }}>{record.dateStr}</Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>{record.name}</Text>
                    {record.contact ? <Text style={{ fontSize: 13, color: '#1e293b', fontWeight: '600', marginTop: 2 }}>📞 {record.contact}</Text> : null}
                    
                    {/* DROPDOWN 4: ATTEN STAFF NAME (MOBILE) */}
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
                      onPress={() => setActivePicker({ recordId: record.id, field: 'atten', currentVal: record.atten })}
                    >
                      <Text style={{ fontSize: 11, color: '#475569', fontWeight: '500' }}>👤 Atten: <Text style={{ color: '#1d4ed8', fontWeight: '700' }}>{record.atten || 'Admin Staff'}</Text></Text>
                      <MaterialCommunityIcons name="pencil-outline" size={12} color="#1d4ed8" />
                    </TouchableOpacity>
                  </View>

                  {/* DROPDOWN 3: JOIN STATUS (MOBILE) */}
                  <TouchableOpacity
                    style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}
                    onPress={() => setActivePicker({ recordId: record.id, field: 'joinStatus', currentVal: record.joinStatus })}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={14} color={statusBadge.color} />
                  </TouchableOpacity>
                </View>

                {/* Reminders / Reference snippet */}
                {(record.reminder1 || record.reference || record.remarks1) && (
                  <View style={{ backgroundColor: '#f8fafc', padding: 8, borderRadius: 6, marginTop: 8 }}>
                    {record.reminder1 ? <Text style={{ fontSize: 11, color: '#b45309' }}>⏰ Rem: {record.reminder1}</Text> : null}
                    {record.reference ? <Text style={{ fontSize: 11, color: '#475569' }}>🔗 Ref: {record.reference}</Text> : null}
                    {record.remarks1 ? <Text style={{ fontSize: 11, color: '#334155' }} numberOfLines={2}>💬 {record.remarks1}</Text> : null}
                  </View>
                )}

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                  {/* DROPDOWN 2: MODE (MOBILE) */}
                  <TouchableOpacity
                    style={[styles.modeBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                    onPress={() => setActivePicker({ recordId: record.id, field: 'mode', currentVal: record.mode })}
                  >
                    <Text style={styles.modeBadgeText}>{record.mode}</Text>
                    <MaterialCommunityIcons name="chevron-down" size={12} color="#475569" />
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        setSelectedRecord(record);
                        setEditNature(record.natureOfEnquiry);
                        setEditJoinStatus(record.joinStatus);
                        setEditAtten(record.atten);
                        setEditMode(record.mode);
                        setEditReminder1(record.reminder1);
                        setEditReminder2(record.reminder2);
                        setEditReminder3(record.reminder3);
                        setEditReference(record.reference);
                        setEditRemarks1(record.remarks1);
                        setEditRemarks2(record.remarks2);
                      }}
                      title="Edit Full Enquiry"
                    >
                      <MaterialCommunityIcons name="note-edit-outline" size={16} color="#0f172a" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
                      onPress={() => handleDeleteRecord(record)}
                      title="Delete Record"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <ScrollView style={styles.tableCard} horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Table Header matching the exact sheet columns */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { width: 50 }]}>SL. NO</Text>
              <Text style={[styles.thCell, { width: 95 }]}>date</Text>
              <Text style={[styles.thCell, { width: 140 }]}>nature of enquiry</Text>
              <Text style={[styles.thCell, { width: 160 }]}>NAME</Text>
              <Text style={[styles.thCell, { width: 120 }]}>CONTACT</Text>
              <Text style={[styles.thCell, { width: 110 }]}>MODE</Text>
              <Text style={[styles.thCell, { width: 135 }]}>join status</Text>
              <Text style={[styles.thCell, { width: 145 }]}>ATTEN</Text>
              <Text style={[styles.thCell, { width: 110 }]}>REMINDER 1</Text>
              <Text style={[styles.thCell, { width: 110 }]}>REMINDER 2</Text>
              <Text style={[styles.thCell, { width: 110 }]}>REMINDER 3</Text>
              <Text style={[styles.thCell, { width: 150 }]}>REFERENCE / REMARKS</Text>
              <Text style={[styles.thCell, { width: 150 }]}>REMARKS 1</Text>
              <Text style={[styles.thCell, { width: 150 }]}>REMARKS 2</Text>
              <Text style={[styles.thCell, { width: 80 }]}>ACTIONS</Text>
            </View>

            {/* Table Body Rows */}
            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={true}>
              {filteredList.map((record, idx) => {
                const natureBadge = getNatureBadge(record.natureOfEnquiry);
                const statusBadge = getJoinStatusBadge(record.joinStatus);

                return (
                  <View key={record.id + idx} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#f8fafc' }]}>
                    {/* 1. SL. NO */}
                    <Text style={[styles.tdCell, { width: 50, color: '#94a3b8' }]}>{idx + 1}</Text>

                    {/* 2. date */}
                    <Text style={[styles.tdCell, { width: 95, color: '#475569', fontSize: 12 }]}>{record.dateStr}</Text>

                    {/* 3. nature of enquiry (INLINE DROPDOWN BOX) */}
                    <View style={{ width: 140, justifyContent: 'center' }}>
                      {Platform.OS === 'web' ? (
                        <select
                          value={record.natureOfEnquiry}
                          onChange={(e: any) => handleInlineUpdate(record, 'nature', e.target.value)}
                          style={{
                            backgroundColor: natureBadge.bg,
                            color: natureBadge.color,
                            fontWeight: '700',
                            fontSize: '11px',
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: '14px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            outline: 'none',
                            width: '120px'
                          }}
                        >
                          {NATURE_OPTIONS.map(opt => (
                            <option key={opt.val} value={opt.val} style={{ backgroundColor: '#fff', color: '#0f172a' }}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <TouchableOpacity
                          style={[styles.natureBadgePill, { backgroundColor: natureBadge.bg, flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                          onPress={() => setActivePicker({ recordId: record.id, field: 'nature', currentVal: record.natureOfEnquiry })}
                        >
                          <Text style={[styles.natureBadgeText, { color: natureBadge.color }]}>{natureBadge.label}</Text>
                          <MaterialCommunityIcons name="chevron-down" size={12} color={natureBadge.color} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* 4. NAME */}
                    <View style={{ width: 160, paddingRight: 6 }}>
                      <Text style={styles.nameText} numberOfLines={1}>{record.name}</Text>
                      {record.preferredCourse ? <Text style={{ fontSize: 11, color: '#64748b' }} numberOfLines={1}>🎓 {record.preferredCourse}</Text> : null}
                    </View>

                    {/* 5. CONTACT */}
                    <Text style={[styles.tdCell, { width: 120, fontWeight: '600', color: '#1e293b' }]}>
                      {record.contact || '-'}
                    </Text>

                    {/* 6. MODE (INLINE DROPDOWN BOX) */}
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      {Platform.OS === 'web' ? (
                        <select
                          value={record.mode}
                          onChange={(e: any) => handleInlineUpdate(record, 'mode', e.target.value)}
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontWeight: '600',
                            fontSize: '11px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            outline: 'none',
                            width: '90px'
                          }}
                        >
                          {MODE_OPTIONS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      ) : (
                        <TouchableOpacity
                          style={[styles.modeBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                          onPress={() => setActivePicker({ recordId: record.id, field: 'mode', currentVal: record.mode })}
                        >
                          <Text style={styles.modeBadgeText}>{record.mode}</Text>
                          <MaterialCommunityIcons name="chevron-down" size={12} color="#475569" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* 7. join status (INLINE DROPDOWN BOX) */}
                    <View style={{ width: 135, justifyContent: 'center' }}>
                      {Platform.OS === 'web' ? (
                        <select
                          value={record.joinStatus}
                          onChange={(e: any) => handleInlineUpdate(record, 'joinStatus', e.target.value)}
                          style={{
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.color,
                            fontWeight: '700',
                            fontSize: '11px',
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            outline: 'none',
                            width: '120px'
                          }}
                        >
                          {JOIN_STATUS_OPTIONS.map(s => (
                            <option key={s.val} value={s.val} style={{ backgroundColor: '#fff', color: '#0f172a' }}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <TouchableOpacity
                          style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}
                          onPress={() => setActivePicker({ recordId: record.id, field: 'joinStatus', currentVal: record.joinStatus })}
                        >
                          <Text style={[styles.statusBadgeText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
                          <MaterialCommunityIcons name="chevron-down" size={14} color={statusBadge.color} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* 8. ATTEN (INLINE DROPDOWN BOX WITH "+ Add New Staff...") */}
                    <View style={{ width: 145, justifyContent: 'center' }}>
                      {Platform.OS === 'web' ? (
                        <select
                          value={record.atten || 'Admin Staff'}
                          onChange={(e: any) => handleInlineUpdate(record, 'atten', e.target.value)}
                          style={{
                            backgroundColor: '#f8fafc',
                            color: '#0f172a',
                            fontWeight: '600',
                            fontSize: '12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '4px 6px',
                            cursor: 'pointer',
                            outline: 'none',
                            width: '135px'
                          }}
                        >
                          {staffList.map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                          <option value="__ADD_NEW__" style={{ fontWeight: 'bold', color: '#b91c1c' }}>
                            ➕ Add New Staff...
                          </option>
                        </select>
                      ) : (
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                          onPress={() => setActivePicker({ recordId: record.id, field: 'atten', currentVal: record.atten })}
                        >
                          <Text style={[styles.tdCell, { color: '#334155', fontWeight: '500' }]} numberOfLines={1}>
                            {record.atten || 'Admin Staff'}
                          </Text>
                          <MaterialCommunityIcons name="chevron-down" size={12} color="#64748b" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* 9. REMINDER 1 */}
                    <Text style={[styles.tdCell, { width: 110, color: '#b45309', fontSize: 12 }]} numberOfLines={1}>
                      {record.reminder1 || '-'}
                    </Text>

                    {/* 10. REMINDER 2 */}
                    <Text style={[styles.tdCell, { width: 110, color: '#b45309', fontSize: 12 }]} numberOfLines={1}>
                      {record.reminder2 || '-'}
                    </Text>

                    {/* 11. REMINDER 3 */}
                    <Text style={[styles.tdCell, { width: 110, color: '#b45309', fontSize: 12 }]} numberOfLines={1}>
                      {record.reminder3 || '-'}
                    </Text>

                    {/* 12. REFERENCE / REMARKS */}
                    <Text style={[styles.tdCell, { width: 150, color: '#475569', fontSize: 12 }]} numberOfLines={1}>
                      {record.reference || '-'}
                    </Text>

                    {/* 13. REMARKS 1 */}
                    <Text style={[styles.tdCell, { width: 150, color: '#475569', fontSize: 12 }]} numberOfLines={1}>
                      {record.remarks1 || '-'}
                    </Text>

                    {/* 14. REMARKS 2 */}
                    <Text style={[styles.tdCell, { width: 150, color: '#475569', fontSize: 12 }]} numberOfLines={1}>
                      {record.remarks2 || '-'}
                    </Text>

                    {/* ACTIONS */}
                    <View style={{ width: 80, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => {
                          setSelectedRecord(record);
                          setEditNature(record.natureOfEnquiry);
                          setEditJoinStatus(record.joinStatus);
                          setEditAtten(record.atten);
                          setEditMode(record.mode);
                          setEditReminder1(record.reminder1);
                          setEditReminder2(record.reminder2);
                          setEditReminder3(record.reminder3);
                          setEditReference(record.reference);
                          setEditRemarks1(record.remarks1);
                          setEditRemarks2(record.remarks2);
                        }}
                        title="Edit Row"
                      >
                        <MaterialCommunityIcons name="note-edit-outline" size={16} color="#0f172a" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
                        onPress={() => handleDeleteRecord(record)}
                        title="Delete Row"
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </ScrollView>
      )}

      {/* QUICK ADD NEW STAFF MODAL */}
      <Modal
        visible={showAddStaffModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddStaffModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dialogBox, { maxWidth: 420 }]}>
            <View style={styles.dialogHeader}>
              <View>
                <Text style={styles.dialogTitle}>Add New Attending Staff</Text>
                <Text style={styles.dialogSubtitle}>Enter name of counselor, teacher, or receptionist.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddStaffModal(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20, gap: 12 }}>
              <Text style={styles.sectionLabel}>STAFF / COUNSELOR NAME *</Text>
              <TextInput
                style={styles.dialogInput}
                placeholder="e.g. Anand (Senior Counselor)"
                value={newStaffInput}
                onChangeText={setNewStaffInput}
                autoFocus={true}
              />
            </View>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowAddStaffModal(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogSaveBtn, { backgroundColor: '#b91c1c' }]}
                onPress={handleAddNewStaffSubmit}
              >
                <Text style={styles.dialogSaveText}>Add Staff</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MOBILE / MODAL DROPDOWN SELECTOR POPOVER */}
      <Modal
        visible={!!activePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setActivePicker(null)}
        >
          <View style={[styles.dialogBox, { maxWidth: 360, padding: 16 }]} onStartShouldSetResponder={() => true}>
            <Text style={[styles.dialogTitle, { marginBottom: 12 }]}>
              Select {activePicker?.field === 'nature' ? 'Nature of Enquiry' : activePicker?.field === 'mode' ? 'Class Mode' : activePicker?.field === 'joinStatus' ? 'Join Status' : 'Attending Staff'}
            </Text>

            {activePicker?.field === 'nature' && (
              <View style={{ gap: 6 }}>
                {NATURE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.val}
                    style={[styles.pickerItem, { backgroundColor: opt.bg }]}
                    onPress={() => {
                      const rec = unifiedList.find(r => r.id === activePicker.recordId);
                      if (rec) handleInlineUpdate(rec, 'nature', opt.val);
                      setActivePicker(null);
                    }}
                  >
                    <Text style={[styles.natureBadgeText, { color: opt.color, fontSize: 13 }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activePicker?.field === 'mode' && (
              <View style={{ gap: 6 }}>
                {MODE_OPTIONS.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={styles.pickerItem}
                    onPress={() => {
                      const rec = unifiedList.find(r => r.id === activePicker.recordId);
                      if (rec) handleInlineUpdate(rec, 'mode', m);
                      setActivePicker(null);
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activePicker?.field === 'joinStatus' && (
              <View style={{ gap: 6 }}>
                {JOIN_STATUS_OPTIONS.map(s => (
                  <TouchableOpacity
                    key={s.val}
                    style={[styles.pickerItem, { backgroundColor: s.bg }]}
                    onPress={() => {
                      const rec = unifiedList.find(r => r.id === activePicker.recordId);
                      if (rec) handleInlineUpdate(rec, 'joinStatus', s.val);
                      setActivePicker(null);
                    }}
                  >
                    <Text style={[styles.statusBadgeText, { color: s.color, fontSize: 13 }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {activePicker?.field === 'atten' && (
              <View style={{ gap: 6 }}>
                {staffList.map(st => (
                  <TouchableOpacity
                    key={st}
                    style={styles.pickerItem}
                    onPress={() => {
                      const rec = unifiedList.find(r => r.id === activePicker.recordId);
                      if (rec) handleInlineUpdate(rec, 'atten', st);
                      setActivePicker(null);
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }}>{st}</Text>
                  </TouchableOpacity>
                ))}

                {/* Add New Staff Button in Popover */}
                <TouchableOpacity
                  style={[styles.pickerItem, { backgroundColor: '#fee2e2', borderColor: '#b91c1c' }]}
                  onPress={() => {
                    const rec = unifiedList.find(r => r.id === activePicker.recordId);
                    setActivePicker(null);
                    if (rec) {
                      setTargetRecordForStaff(rec);
                      setNewStaffInput('');
                      setShowAddStaffModal(true);
                    }
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#b91c1c' }}>➕ Add New Staff...</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* FULL ENQUIRY EDIT MODAL */}
      <Modal
        visible={!!selectedRecord}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedRecord(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogBox}>
            <View style={styles.dialogHeader}>
              <View>
                <Text style={styles.dialogTitle}>{selectedRecord?.name}</Text>
                <Text style={styles.dialogSubtitle}>
                  Contact: {selectedRecord?.contact} • Date: {selectedRecord?.dateStr}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedRecord(null)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 20, gap: 14 }}>
              {/* Nature of Enquiry Pill Selection */}
              <View>
                <Text style={styles.sectionLabel}>NATURE OF ENQUIRY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {NATURE_OPTIONS.map(opt => {
                    const isSelected = editNature === opt.val;
                    return (
                      <TouchableOpacity
                        key={opt.val}
                        style={[
                          styles.natureSelectPill,
                          { backgroundColor: isSelected ? opt.color : opt.bg },
                          isSelected && { borderColor: opt.color }
                        ]}
                        onPress={() => setEditNature(opt.val)}
                      >
                        <Text style={[styles.natureBadgeText, { color: isSelected ? '#fff' : opt.color }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Join Status Selection */}
              <View>
                <Text style={styles.sectionLabel}>JOIN STATUS</Text>
                <View style={styles.statusSelectRow}>
                  {JOIN_STATUS_OPTIONS.map(s => (
                    <TouchableOpacity
                      key={s.val}
                      style={[
                        styles.statusSelectBtn,
                        editJoinStatus === s.val && styles.statusSelectBtnActive
                      ]}
                      onPress={() => setEditJoinStatus(s.val)}
                    >
                      <Text
                        style={[
                          styles.statusSelectBtnText,
                          editJoinStatus === s.val && styles.statusSelectBtnTextActive
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Attended By & Mode */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>ATTEN (STAFF NAME)</Text>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="Staff name..."
                    value={editAtten}
                    onChangeText={setEditAtten}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>CLASS MODE</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {MODE_OPTIONS.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.modeSelectBtn,
                          editMode === m && styles.modeSelectBtnActive
                        ]}
                        onPress={() => setEditMode(m)}
                      >
                        <Text style={[styles.modeSelectText, editMode === m && { color: '#b91c1c', fontWeight: '700' }]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* 3 Reminders */}
              <View>
                <Text style={styles.sectionLabel}>FOLLOW-UP REMINDERS (1, 2, 3)</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.dialogInput, { flex: 1 }]}
                    placeholder="Reminder 1..."
                    value={editReminder1}
                    onChangeText={setEditReminder1}
                  />
                  <TextInput
                    style={[styles.dialogInput, { flex: 1 }]}
                    placeholder="Reminder 2..."
                    value={editReminder2}
                    onChangeText={setEditReminder2}
                  />
                  <TextInput
                    style={[styles.dialogInput, { flex: 1 }]}
                    placeholder="Reminder 3..."
                    value={editReminder3}
                    onChangeText={setEditReminder3}
                  />
                </View>
              </View>

              {/* Reference */}
              <View>
                <Text style={styles.sectionLabel}>REFERENCE / LEAD SOURCE</Text>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="e.g. Alumni referral, Newspaper Ad, Friend..."
                  value={editReference}
                  onChangeText={setEditReference}
                />
              </View>

              {/* Remarks 1 & Remarks 2 */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>REMARKS 1</Text>
                  <TextInput
                    style={[styles.dialogTextarea, { height: 70 }]}
                    multiline
                    placeholder="Counselor discussion note 1..."
                    value={editRemarks1}
                    onChangeText={setEditRemarks1}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>REMARKS 2</Text>
                  <TextInput
                    style={[styles.dialogTextarea, { height: 70 }]}
                    multiline
                    placeholder="Discussion note 2..."
                    value={editRemarks2}
                    onChangeText={setEditRemarks2}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setSelectedRecord(null)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogSaveBtn}
                disabled={updating}
                onPress={handleSaveRecord}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.dialogSaveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CREATE NEW ENQUIRY MODAL */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogBox}>
            <View style={styles.dialogHeader}>
              <View>
                <Text style={styles.dialogTitle}>Record New Candidate Enquiry</Text>
                <Text style={styles.dialogSubtitle}>Add a new walk-in, phone call, or social enquiry.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 20, gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>CANDIDATE NAME *</Text>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="Full name..."
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>CONTACT PHONE *</Text>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="Phone number..."
                    value={newContact}
                    onChangeText={setNewContact}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>EMAIL (OPTIONAL)</Text>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="Email address..."
                    value={newEmail}
                    onChangeText={setNewEmail}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>COURSE / TARGET EXAM</Text>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="e.g. UPSC Mains / TNPSC Grp 1"
                    value={newCourse}
                    onChangeText={setNewCourse}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.sectionLabel}>NATURE OF ENQUIRY</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {NATURE_OPTIONS.map(opt => {
                    const isSelected = newNature === opt.val;
                    return (
                      <TouchableOpacity
                        key={opt.val}
                        style={[
                          styles.natureSelectPill,
                          { backgroundColor: isSelected ? opt.color : opt.bg },
                          isSelected && { borderColor: opt.color }
                        ]}
                        onPress={() => setNewNature(opt.val)}
                      >
                        <Text style={[styles.natureBadgeText, { color: isSelected ? '#fff' : opt.color }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>ATTEN (STAFF NAME)</Text>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder="Staff name..."
                    value={newAtten}
                    onChangeText={setNewAtten}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionLabel}>CLASS MODE</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {MODE_OPTIONS.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.modeSelectBtn,
                          newMode === m && styles.modeSelectBtnActive
                        ]}
                        onPress={() => setNewMode(m)}
                      >
                        <Text style={[styles.modeSelectText, newMode === m && { color: '#b91c1c', fontWeight: '700' }]}>{m}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View>
                <Text style={styles.sectionLabel}>REFERENCE / LEAD SOURCE</Text>
                <TextInput
                  style={styles.dialogInput}
                  placeholder="e.g. Alumni, Banner, Newspaper..."
                  value={newReference}
                  onChangeText={setNewReference}
                />
              </View>

              <View>
                <Text style={styles.sectionLabel}>REMARKS / DISCUSSION NOTES</Text>
                <TextInput
                  style={[styles.dialogTextarea, { height: 60 }]}
                  multiline
                  placeholder="Counselor notes..."
                  value={newRemarks}
                  onChangeText={setNewRemarks}
                />
              </View>
            </ScrollView>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogSaveBtn, { backgroundColor: '#b91c1c' }]}
                disabled={adding}
                onPress={handleCreateEnquiry}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.dialogSaveText}>Record Enquiry</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BROADCAST NOTIFICATION MODAL */}
      <Modal
        visible={showNotifyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotifyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogBox}>
            <View style={styles.dialogHeader}>
              <View>
                <Text style={styles.dialogTitle}>Broadcast Notification</Text>
                <Text style={styles.dialogSubtitle}>Send an in-app / push notice to all pending guest leads.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowNotifyModal(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20, gap: 14 }}>
              <View>
                <Text style={styles.sectionLabel}>NOTIFICATION TITLE</Text>
                <TextInput
                  style={[styles.dialogInput]}
                  placeholder="e.g. Free Scholarship Test this Sunday!"
                  value={notifyTitle}
                  onChangeText={setNotifyTitle}
                />
              </View>

              <View>
                <Text style={styles.sectionLabel}>MESSAGE</Text>
                <TextInput
                  style={styles.dialogTextarea}
                  multiline
                  numberOfLines={4}
                  placeholder="Type announcement or offer message..."
                  value={notifyMsg}
                  onChangeText={setNotifyMsg}
                />
              </View>
            </View>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowNotifyModal(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogSaveBtn, { backgroundColor: '#1d4ed8' }]}
                disabled={sendingNotify}
                onPress={handleSendLeadNotification}
              >
                {sendingNotify ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.dialogSaveText}>Send Notification</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 8
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff'
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8'
  },
  notifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8
  },
  notifyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1d4ed8'
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803d'
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800',
    marginTop: 6
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 16,
    gap: 14
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a'
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  filterPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc'
  },
  filterPillActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#b91c1c'
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b'
  },
  filterPillTextActive: {
    color: '#b91c1c',
    fontWeight: '800'
  },
  tableLoading: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  emptyTable: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  emptyTableTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12
  },
  emptyTableSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 400
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fae8e8',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  thCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  tdCell: {
    fontSize: 13,
    color: '#0f172a'
  },
  nameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a'
  },
  natureBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start'
  },
  natureSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  natureBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  modeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start'
  },
  modeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    width: 115
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  actionBtn: {
    padding: 7,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center'
  },

  /* PICKER POPOVER ITEM */
  pickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center'
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  dialogBox: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 24,
    display: 'flex',
    flexDirection: 'column'
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  dialogSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: 6
  },
  statusSelectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc'
  },
  statusSelectBtnActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#b91c1c'
  },
  statusSelectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b'
  },
  statusSelectBtnTextActive: {
    color: '#b91c1c',
    fontWeight: '700'
  },
  modeSelectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc'
  },
  modeSelectBtnActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#b91c1c'
  },
  modeSelectText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500'
  },
  dialogInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#fff'
  },
  dialogTextarea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#fff',
    height: 80,
    textAlignVertical: 'top'
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc'
  },
  dialogCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff'
  },
  dialogCancelText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600'
  },
  dialogSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: '#b91c1c'
  },
  dialogSaveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  }
});
