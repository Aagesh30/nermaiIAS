/**
 * NERMAI SACS — Web Access Request Dashboard
 * 
 * Neumorphic UI to manage pending student access requests.
 * Supports individual approve/reject, bulk selection, and expiration settings.
 */

import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, Clock, Filter, 
  MoreVertical, Check, ShieldCheck 
} from 'lucide-react';

/* ─── Design Tokens ─────────────────────────────────────────────────────────── */
const C = {
  bg:      '#0E0E0E',
  surface: '#1B1B1B',
  surfH:   '#252525',
  gold:    '#D4AF37',
  red:     '#FF3B30',
  text:    '#F8F8F8',
  muted:   '#A0A0A0',
  border:  'rgba(255,255,255,0.07)',
  green:   '#34C759',
};

const NM_RAISED = '5px 5px 14px #0a0a0a, -5px -5px 14px #2c2c2c';
const NM_INSET  = 'inset 3px 3px 8px #0a0a0a, inset -3px -3px 8px #262626';
const NM_FLAT   = '3px 3px 8px #0d0d0d, -3px -3px 8px #292929';

/* ─── Types ─────────────────────────────────────────────────────────────────── */
interface AccessRequest {
  id: string;
  studentName: string;
  studentBatch: string;
  entityName: string;
  entityType: string;
  reason: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

const MOCK_REQUESTS: AccessRequest[] = [
  { id: '1', studentName: 'Rahul Kumar', studentBatch: 'Online Batch A', entityName: 'Indian Polity - Part 1', entityType: 'topic', reason: 'Revision', createdAt: '2026-07-13T10:30:00Z', status: 'pending' },
  { id: '2', studentName: 'Priya Singh', studentBatch: 'Recorded Batch B', entityName: 'Live Session Recording', entityType: 'class', reason: 'Missed Live', createdAt: '2026-07-13T09:15:00Z', status: 'pending' },
  { id: '3', studentName: 'Amit Verma', studentBatch: 'Offline Batch C', entityName: 'Geography Notes PDF', entityType: 'resource', reason: 'Medical', createdAt: '2026-07-12T14:20:00Z', status: 'pending' },
];

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export const AccessRequestDashboard: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>(MOCK_REQUESTS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expiresIn, setExpiresIn] = useState<string>('7'); // days

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (selectedIds.size === requests.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(requests.map(r => r.id)));
  };

  const handleAction = (id: string, action: 'approve' | 'reject') => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    setRequests(prev => prev.map(r => selectedIds.has(r.id) ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r));
    setSelectedIds(new Set());
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: 0 }}>Access Requests</h1>
          <p style={{ color: C.muted, margin: '4px 0 0 0', fontSize: 14 }}>
            Manage {pendingCount} pending student access requests
          </p>
        </div>
        
        {/* Top Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={filterWrapStyle}>
            <Filter size={14} color={C.muted} />
            <select style={selectStyle}>
              <option>All Statuses</option>
              <option>Pending</option>
              <option>Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar (Neumorphic floating bar) */}
      {selectedIds.size > 0 && (
        <div style={bulkActionBarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
              {selectedIds.size} Selected
            </span>
            <div style={{ width: 1, height: 16, backgroundColor: C.border }} />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Grant duration:</span>
              <select 
                value={expiresIn} 
                onChange={e => setExpiresIn(e.target.value)}
                style={inlineSelectStyle}
              >
                <option value="1">24 Hours</option>
                <option value="3">3 Days</option>
                <option value="7">7 Days</option>
                <option value="0">Permanent</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => handleBulkAction('reject')} style={bulkRejectBtnStyle}>Reject Selected</button>
            <button onClick={() => handleBulkAction('approve')} style={bulkApproveBtnStyle}>Approve Selected</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={tableContainerStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>
                <div 
                  onClick={selectAll}
                  style={checkboxStyle(selectedIds.size > 0 && selectedIds.size === requests.length)}
                >
                  {selectedIds.size === requests.length && <Check size={12} color="#000" strokeWidth={3} />}
                </div>
              </th>
              <th style={thStyle}>Student</th>
              <th style={thStyle}>Requested Entity</th>
              <th style={thStyle}>Reason</th>
              <th style={thStyle}>Requested At</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => {
              const selected = selectedIds.has(req.id);
              const pending = req.status === 'pending';
              
              return (
                <tr key={req.id} style={{ 
                  borderBottom: `1px solid ${C.border}`,
                  backgroundColor: selected ? `${C.gold}08` : 'transparent',
                  transition: 'background-color 0.2s',
                  opacity: pending ? 1 : 0.6
                }}>
                  <td style={tdStyle}>
                    <div 
                      onClick={() => toggleSelect(req.id)}
                      style={checkboxStyle(selected)}
                    >
                      {selected && <Check size={12} color="#000" strokeWidth={3} />}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{req.studentName}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{req.studentBatch}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{req.entityName}</div>
                    <div style={{ display: 'inline-flex', padding: '2px 6px', borderRadius: 4, backgroundColor: `${C.gold}15`, border: `1px solid ${C.gold}30`, fontSize: 10, color: C.gold, marginTop: 4, textTransform: 'uppercase', fontWeight: 800 }}>
                      {req.entityType}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 13, color: C.text }}>{req.reason}</div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ fontSize: 12, color: C.muted, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} />
                      {new Date(req.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td style={tdStyle}>
                    {pending ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleAction(req.id, 'approve')} style={actionBtnStyle(C.green)}>
                          <CheckCircle size={16} /> Approve
                        </button>
                        <button onClick={() => handleAction(req.id, 'reject')} style={iconBtnStyle(C.red)}>
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, fontWeight: 700, color: req.status === 'approved' ? C.green : C.red }}>
                        {req.status === 'approved' ? 'Approved' : 'Rejected'}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────────────── */
const filterWrapStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
  backgroundColor: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
  boxShadow: NM_FLAT
};

const selectStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: C.text, fontSize: 13,
  outline: 'none', cursor: 'pointer', fontWeight: 600
};

const tableContainerStyle: React.CSSProperties = {
  backgroundColor: C.surface, borderRadius: 16, border: `1px solid ${C.border}`,
  boxShadow: NM_RAISED, overflow: 'hidden'
};

const thStyle: React.CSSProperties = {
  padding: '16px', textAlign: 'left', fontSize: 11, fontWeight: 800,
  color: C.muted, textTransform: 'uppercase', letterSpacing: 1,
  borderBottom: `1px solid ${C.border}`, backgroundColor: C.surfH
};

const tdStyle: React.CSSProperties = {
  padding: '16px', verticalAlign: 'middle'
};

const checkboxStyle = (checked: boolean): React.CSSProperties => ({
  width: 18, height: 18, borderRadius: 5, cursor: 'pointer',
  border: `2px solid ${checked ? C.gold : C.muted}`,
  backgroundColor: checked ? C.gold : 'transparent',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
});

const actionBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 12px', borderRadius: 8, border: `1px solid ${color}40`,
  backgroundColor: `${color}15`, color: color, fontSize: 12, fontWeight: 700,
  cursor: 'pointer', transition: 'all 0.2s', boxShadow: NM_FLAT
});

const iconBtnStyle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 8, border: `1px solid ${color}40`,
  backgroundColor: `${color}15`, color: color,
  cursor: 'pointer', transition: 'all 0.2s', boxShadow: NM_FLAT
});

const bulkActionBarStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 20px', backgroundColor: C.surfH, borderRadius: 12,
  border: `1px solid ${C.gold}40`, marginBottom: 20,
  boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px ${C.gold}20`,
  position: 'sticky', top: 80, zIndex: 10
};

const inlineSelectStyle: React.CSSProperties = {
  background: C.bg, border: `1px solid ${C.border}`, color: C.text,
  fontSize: 12, borderRadius: 6, padding: '4px 8px', outline: 'none',
  boxShadow: NM_INSET
};

const bulkApproveBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: 'none',
  background: `linear-gradient(135deg, ${C.gold}, #c9a732)`,
  color: C.bg, fontSize: 13, fontWeight: 800, cursor: 'pointer',
  boxShadow: `0 4px 12px rgba(212,175,55,0.3)`
};

const bulkRejectBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.red}40`,
  background: `${C.red}15`, color: C.red, fontSize: 13, fontWeight: 700,
  cursor: 'pointer', boxShadow: NM_FLAT
};


