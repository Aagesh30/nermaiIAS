import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as XLSX from 'xlsx';
import api from '../core/api';

export interface CustomLead {
  id: string;
  formId?: string;
  formTitle?: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  mode?: string;
  customData?: Record<string, any>;
  status: 'new' | 'contacted' | 'converted' | 'admitted';
  notes?: string;
  source?: string;
  createdAt?: any;
}

export default function CustomLeadsPage() {
  const [leads, setLeads] = useState<CustomLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'contacted' | 'converted'>('all');

  // Selected lead for detail/notes editing
  const [selectedLead, setSelectedLead] = useState<CustomLead | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<CustomLead['status']>('new');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/crm/custom-leads');
      const data = res.data;
      if (data?.success && Array.isArray(data?.data)) {
        setLeads(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch custom leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: CustomLead['status'], newNotes?: string) => {
    setUpdating(true);
    try {
      const res = await api.patch(`/crm/custom-leads/${leadId}`, {
        status: newStatus,
        notes: newNotes !== undefined ? newNotes : (selectedLead?.notes || '')
      });
      const data = res.data;
      if (data?.success) {
        setLeads(prev =>
          prev.map(l => (l.id === leadId ? { ...l, status: newStatus, notes: newNotes ?? l.notes } : l))
        );
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(prev => prev ? { ...prev, status: newStatus, notes: newNotes ?? prev.notes } : null);
        }
      }
    } catch (err) {
      console.error('Failed to update lead:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm('Are you sure you want to delete this custom application lead?')) {
      return;
    }
    try {
      const res = await api.delete(`/crm/custom-leads/${leadId}`);
      const data = res.data;
      if (data?.success) {
        setLeads(prev => prev.filter(l => l.id !== leadId));
        if (selectedLead?.id === leadId) setSelectedLead(null);
      }
    } catch (err) {
      console.error('Failed to delete lead:', err);
    }
  };

  // Find all dynamic custom keys present across all leads
  const customFieldKeys = useMemo(() => {
    const keys = new Set<string>();
    leads.forEach(l => {
      if (l.customData && typeof l.customData === 'object') {
        Object.keys(l.customData).forEach(k => {
          const lk = k.toLowerCase();
          // Exclude already surfaced core keys if duplicated
          if (!lk.includes('full name') && !lk.includes('phone') && !lk.includes('email') && !lk.includes('city') && !lk.includes('mode')) {
            keys.add(k);
          }
        });
      }
    });
    return Array.from(keys);
  }, [leads]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch =
        !searchTerm ||
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.city && lead.city.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'new') {
        matchesStatus = lead.status === 'new';
      } else if (statusFilter === 'contacted') {
        matchesStatus = lead.status === 'contacted';
      } else if (statusFilter === 'converted') {
        matchesStatus = lead.status === 'converted' || (lead.status as any) === 'admitted';
      }

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = leads.length;
    const newCount = leads.filter(l => l.status === 'new').length;
    const contactedCount = leads.filter(l => l.status === 'contacted').length;
    const convertedCount = leads.filter(l => l.status === 'converted' || (l.status as any) === 'admitted').length;
    return { total, newCount, contactedCount, convertedCount };
  }, [leads]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredLeads.length === 0) {
      alert('No leads to export');
      return;
    }

    const rows = filteredLeads.map((l, index) => {
      const rowObj: any = {
        '#': index + 1,
        'Application Date': l.createdAt?._seconds
          ? new Date(l.createdAt._seconds * 1000).toLocaleDateString()
          : new Date().toLocaleDateString(),
        'Applicant Name': l.name,
        'Phone Number': l.phone,
        'Email Address': l.email || '',
        'City / Location': l.city || '',
        'Class Mode': l.mode || '',
        'CRM Status': (l.status === 'converted' || (l.status as any) === 'admitted') ? 'CONVERTED' : l.status.toUpperCase(),
        'Counselor Notes': l.notes || ''
      };

      // Add dynamic custom fields
      customFieldKeys.forEach(k => {
        rowObj[k] = l.customData ? l.customData[k] || '' : '';
      });

      return rowObj;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Custom_Application_Leads');
    XLSX.writeFile(wb, `Custom_Application_Leads_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return { bg: '#dbeafe', color: '#1d4ed8', label: 'New' };
      case 'contacted':
        return { bg: '#fef3c7', color: '#b45309', label: 'Contacted' };
      case 'converted':
      case 'admitted':
        return { bg: '#dcfce7', color: '#15803d', label: 'Converted' };
      default:
        return { bg: '#f1f5f9', color: '#475569', label: 'New' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="clipboard-account-outline" size={26} color="#b91c1c" />
            <Text style={styles.headerTitle}>Custom Application Leads</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Dedicated submissions from the Mock Test & Application Form.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={fetchLeads}
            disabled={loading}
          >
            <MaterialCommunityIcons name="refresh" size={18} color="#475569" />
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportExcel}
          >
            <MaterialCommunityIcons name="file-excel-outline" size={18} color="#15803d" />
            <Text style={styles.exportBtnText}>Export Excel</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics Banner */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>TOTAL SUBMISSIONS</Text>
          <Text style={[styles.metricValue, { color: '#0f172a' }]}>{metrics.total}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>NEW LEADS</Text>
          <Text style={[styles.metricValue, { color: '#2563eb' }]}>{metrics.newCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>CONTACTED</Text>
          <Text style={[styles.metricValue, { color: '#d97706' }]}>{metrics.contactedCount}</Text>
        </View>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>CONVERTED</Text>
          <Text style={[styles.metricValue, { color: '#16a34a' }]}>{metrics.convertedCount}</Text>
        </View>
      </View>

      {/* Clean Toolbar with Search & 3 Status Filter Pills */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, phone, email, or city..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 3 Status Filter Pills (All, New, Contacted, Converted) */}
        <View style={styles.filterPillsRow}>
          {[
            { key: 'all', label: 'ALL' },
            { key: 'new', label: 'NEW' },
            { key: 'contacted', label: 'CONTACTED' },
            { key: 'converted', label: 'CONVERTED' }
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
        </View>
      </View>

      {/* Main Leads Table */}
      {loading ? (
        <View style={styles.tableLoading}>
          <ActivityIndicator size="large" color="#b91c1c" />
          <Text style={{ marginTop: 10, color: '#64748b' }}>Loading custom leads...</Text>
        </View>
      ) : filteredLeads.length === 0 ? (
        <View style={styles.emptyTable}>
          <MaterialCommunityIcons name="account-search-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTableTitle}>No Custom Application Leads Found</Text>
          <Text style={styles.emptyTableSubtitle}>
            When applicants submit the application form, their details will appear right here.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.tableCard} horizontal showsHorizontalScrollIndicator={true}>
          <View>
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thCell, { width: 50 }]}>#</Text>
              <Text style={[styles.thCell, { width: 170 }]}>Applicant Name</Text>
              <Text style={[styles.thCell, { width: 130 }]}>Phone</Text>
              <Text style={[styles.thCell, { width: 180 }]}>Email</Text>
              <Text style={[styles.thCell, { width: 120 }]}>City</Text>
              <Text style={[styles.thCell, { width: 110 }]}>Mode</Text>
              {customFieldKeys.map(k => (
                <Text key={k} style={[styles.thCell, { width: 140 }]}>{k}</Text>
              ))}
              <Text style={[styles.thCell, { width: 130 }]}>Status</Text>
              <Text style={[styles.thCell, { width: 100 }]}>Actions</Text>
            </View>

            {/* Table Rows */}
            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={true}>
              {filteredLeads.map((lead, idx) => {
                const badge = getStatusBadge(lead.status);
                return (
                  <View key={lead.id} style={[styles.tableRow, idx % 2 === 1 && { backgroundColor: '#f8fafc' }]}>
                    <Text style={[styles.tdCell, { width: 50, color: '#94a3b8' }]}>{idx + 1}</Text>
                    <View style={{ width: 170, paddingRight: 8 }}>
                      <Text style={styles.nameText}>{lead.name}</Text>
                      <Text style={styles.sourceText}>
                        {lead.createdAt?._seconds
                          ? new Date(lead.createdAt._seconds * 1000).toLocaleDateString()
                          : 'Recent'}
                      </Text>
                    </View>
                    <Text style={[styles.tdCell, { width: 130, fontWeight: '600', color: '#1e293b' }]}>
                      {lead.phone}
                    </Text>
                    <Text style={[styles.tdCell, { width: 180, color: '#475569' }]}>
                      {lead.email || '-'}
                    </Text>
                    <Text style={[styles.tdCell, { width: 120, color: '#475569' }]}>
                      {lead.city || '-'}
                    </Text>
                    <View style={{ width: 110, justifyContent: 'center' }}>
                      <View style={styles.modeBadge}>
                        <Text style={styles.modeBadgeText}>{lead.mode || 'Offline'}</Text>
                      </View>
                    </View>

                    {/* Custom Dynamic Columns */}
                    {customFieldKeys.map(k => (
                      <Text key={k} style={[styles.tdCell, { width: 140, color: '#334155' }]}>
                        {lead.customData ? String(lead.customData[k] ?? '-') : '-'}
                      </Text>
                    ))}

                    {/* Status Badge Dropdown */}
                    <View style={{ width: 130, justifyContent: 'center' }}>
                      <TouchableOpacity
                        style={[styles.statusBadge, { backgroundColor: badge.bg }]}
                        onPress={() => {
                          setSelectedLead(lead);
                          const currentNorm = (lead.status as any) === 'admitted' ? 'converted' : lead.status;
                          setEditStatus(currentNorm || 'new');
                          setEditNotes(lead.notes || '');
                        }}
                      >
                        <Text style={[styles.statusBadgeText, { color: badge.color }]}>{badge.label}</Text>
                        <MaterialCommunityIcons name="chevron-down" size={14} color={badge.color} />
                      </TouchableOpacity>
                    </View>

                    {/* Action Buttons */}
                    <View style={{ width: 100, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => {
                          setSelectedLead(lead);
                          const currentNorm = (lead.status as any) === 'admitted' ? 'converted' : lead.status;
                          setEditStatus(currentNorm || 'new');
                          setEditNotes(lead.notes || '');
                        }}
                        title="Edit Details"
                      >
                        <MaterialCommunityIcons name="note-edit-outline" size={16} color="#0f172a" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]}
                        onPress={() => handleDeleteLead(lead.id)}
                        title="Delete Lead"
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

      {/* LEAD DETAILS & 3-STATUS UPDATE MODAL */}
      <Modal
        visible={!!selectedLead}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedLead(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialogBox}>
            <View style={styles.dialogHeader}>
              <View>
                <Text style={styles.dialogTitle}>{selectedLead?.name}</Text>
                <Text style={styles.dialogSubtitle}>
                  Phone: {selectedLead?.phone} • {selectedLead?.city || 'Location not specified'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedLead(null)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 20, gap: 16 }}>
              {/* 3 Status Buttons */}
              <View style={styles.dialogSection}>
                <Text style={styles.sectionLabel}>UPDATE STATUS</Text>
                <View style={styles.statusSelectRow}>
                  {[
                    { val: 'new', label: 'New' },
                    { val: 'contacted', label: 'Contacted' },
                    { val: 'converted', label: 'Converted' }
                  ].map(s => (
                    <TouchableOpacity
                      key={s.val}
                      style={[
                        styles.statusSelectBtn,
                        editStatus === s.val && styles.statusSelectBtnActive
                      ]}
                      onPress={() => setEditStatus(s.val as any)}
                    >
                      <Text
                        style={[
                          styles.statusSelectBtnText,
                          editStatus === s.val && styles.statusSelectBtnTextActive
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.dialogSection}>
                <Text style={styles.sectionLabel}>COUNSELOR / STAFF NOTES</Text>
                <TextInput
                  style={styles.dialogTextarea}
                  multiline
                  numberOfLines={4}
                  placeholder="Add notes about call discussion, fee quote, or student preferences..."
                  value={editNotes}
                  onChangeText={setEditNotes}
                />
              </View>

              {/* Submitted Custom Fields Breakdown */}
              {selectedLead?.customData && Object.keys(selectedLead.customData).length > 0 && (
                <View style={styles.dialogSection}>
                  <Text style={styles.sectionLabel}>SUBMITTED FORM DATA</Text>
                  <View style={styles.customDataBox}>
                    {Object.entries(selectedLead.customData).map(([k, v]) => (
                      <View key={k} style={styles.customDataRow}>
                        <Text style={styles.customDataKey}>{k}:</Text>
                        <Text style={styles.customDataVal}>{String(v)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setSelectedLead(null)}
              >
                <Text style={styles.dialogCancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogSaveBtn}
                disabled={updating}
                onPress={async () => {
                  if (selectedLead) {
                    await handleUpdateStatus(selectedLead.id, editStatus, editNotes);
                    setSelectedLead(null);
                  }
                }}
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
    paddingHorizontal: 14,
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
    fontSize: 12,
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
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    textTransform: 'uppercase'
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 12,
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
  sourceText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2
  },
  modeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    width: 105
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
    maxWidth: 500,
    maxHeight: '90%',
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
  dialogSection: {
    marginBottom: 4
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: 8
  },
  statusSelectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  statusSelectBtnTextActive: {
    color: '#b91c1c',
    fontWeight: '700'
  },
  dialogTextarea: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#fff',
    height: 90,
    textAlignVertical: 'top'
  },
  customDataBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 6
  },
  customDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  customDataKey: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  customDataVal: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '500'
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
