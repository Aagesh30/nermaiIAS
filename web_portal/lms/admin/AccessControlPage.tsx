import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Clock, History, Lock, Grid3X3, BookTemplate,
  CheckCircle2, XCircle
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { AdminButton as Button } from '../components/admin-ui';
import { Badge } from '../components/ui/Badge';
import { AccessRulesApi } from '../core/services';

/* ─── Sub-tabs ─────────────────────────────────────────────────────────────── */
const SUB_TABS = [
  { key: 'permissions', label: 'Permissions', Icon: ShieldCheck },
  { key: 'requests',    label: 'Requests',    Icon: Clock       },
  { key: 'history',    label: 'History',     Icon: History     },
  { key: 'permanent',  label: 'Permanent',   Icon: Lock        },
  { key: 'analytics',  label: 'Analytics',   Icon: Grid3X3     },
  { key: 'templates',  label: 'Templates',   Icon: BookTemplate },
];

export const AccessControlPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div className="space-y-6 w-full text-gray-900 dark:text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">Access Control (SACS)</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage NERMAI's Smart Access Control System across all modules.</p>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-250 dark:border-white/10 mb-6 overflow-x-auto pb-2">
        {SUB_TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors
                ${isActive 
                  ? 'text-[#8B0000] border-b-2 border-[#8B0000] bg-[#8B0000]/5 dark:text-[#ff8a80] dark:bg-[#8B0000]/15' 
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}
              `}
            >
              <tab.Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pb-20">
        {activeTab === 'permissions' && <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#1a1a2e]">Select an entity from LMS to manage its permissions.</div>}
        {activeTab === 'requests'    && <RequestsTab />}
        {activeTab === 'history'     && <HistoryTab />}
        {activeTab === 'permanent'   && <PermanentGrantsTab />}
        {activeTab === 'analytics'   && <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#1a1a2e]">Analytics module coming soon.</div>}
        {activeTab === 'templates'   && <div className="p-8 text-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#1a1a2e]">Templates module coming soon.</div>}
      </div>
    </div>
  );
};

/* ─── Requests Tab ─────────────────────────────────────────────────────────────── */
const RequestsTab: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    AccessRulesApi.listAccessRequests()
      .then((res) => {
        if (mounted) {
          setRequests(res.data?.data || res.data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (mounted) {
          setError('Failed to sync requests');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === requests.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(requests.map(r => r.id)));
  };

  const handleBulkApprove = async () => {
    if (!window.confirm(`Approve ${selectedIds.size} requests?`)) return;
    try {
      await AccessRulesApi.bulkApprove({
        requestIds: Array.from(selectedIds),
        grantType: 'TEMPORARY',
        durationHours: 48,
        consumeMonthlyUnits: true,
        respectMonthlyLimit: true,
        presetId: null,
        overrideLimit: false
      });
      setRequests(prev => prev.filter(req => !selectedIds.has(req.id)));
      setSelectedIds(new Set());
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Approval failed');
    }
  };

  if (loading) return <div className="text-gray-500 dark:text-gray-400 p-4 font-medium">Loading requests...</div>;
  if (error) return <div className="text-destructive p-4 font-medium">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pending ({requests.length})</h2>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-3 py-1.5 text-xs font-bold" onClick={handleSelectAll}>
            {selectedIds.size === requests.length ? 'Deselect All' : 'Select All'}
          </Button>
          {selectedIds.size > 0 && (
            <Button className="px-3 py-1.5 text-xs font-bold bg-[#8B0000] hover:bg-[#8B0000]/90" onClick={handleBulkApprove}>Approve ({selectedIds.size})</Button>
          )}
        </div>
      </div>

      {requests.length === 0 && <div className="text-gray-500 dark:text-gray-400 p-8 text-center bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">No pending requests found.</div>}

      <div className="grid grid-cols-1 gap-4">
        {requests.map((req, i) => {
          const isSelected = selectedIds.has(req.id);
          return (
            <div 
              key={req.id || i} 
              className={`bg-white dark:bg-[#1a1a2e] border shadow-sm rounded-2xl cursor-pointer transition-all ${isSelected ? 'border-[#8B0000] bg-[#8B0000]/5 dark:border-[#ff8a80] dark:bg-[#8B0000]/10' : 'border-gray-200 dark:border-[#8B0000]/30 hover:border-[#8B0000]/50'}`}
              onClick={() => toggleSelect(req.id)}
            >
              <div className="p-5 flex items-center gap-4">
                <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#8B0000] dark:bg-[#ff8a80] border-[#8B0000] dark:border-[#ff8a80]' : 'border-gray-300 dark:border-gray-700'}`}>
                  {isSelected && <CheckCircle2 size={14} className="text-white" />}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white text-sm">{req.studentName || req.studentId || 'Unknown Student'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{req.contentName || req.entityName || req.contentId || 'Unknown Content'}</div>
                  <div className="flex gap-2 mt-2.5">
                    <Badge variant="outline" className="border-[#8B0000] text-[#8B0000] dark:border-[#ff8a80] dark:text-[#ff8a80] font-bold">{(req.requestType || req.entityType || 'Resource').toUpperCase()}</Badge>
                    <Badge variant="secondary" className="font-semibold">{req.reason || 'General'}</Badge>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── History Tab ─────────────────────────────────────────────────────────────── */
const HistoryTab: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AccessRulesApi.listAccessHistory()
      .then(res => setHistory(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 dark:text-gray-400 p-4 font-medium">Loading history...</div>;

  return (
    <div className="space-y-4">
      {history.map((item, i) => {
        const isApproved = item.status === 'APPROVED';
        return (
          <div key={item.id || i} className={`bg-white dark:bg-[#1a1a2e] border-l-4 shadow-sm rounded-2xl border-y border-r border-y-gray-200 border-r-gray-200 dark:border-y-[#8B0000]/30 dark:border-r-[#8B0000]/30 ${isApproved ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
            <div className="p-5 flex gap-4">
              {isApproved ? <CheckCircle2 className="text-emerald-500 shrink-0" /> : <XCircle className="text-rose-500 shrink-0" />}
              <div className="flex-1">
                <div className="font-bold text-gray-900 dark:text-white text-sm">{item.studentName || item.studentId}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.contentName || item.entityName}</div>
                <div className="flex gap-2 mt-2.5">
                  <Badge variant={isApproved ? 'success' : 'destructive'}>{item.status}</Badge>
                  <Badge variant="outline" className="border-gray-300 dark:border-[#8B0000]/30 text-gray-600 dark:text-gray-300">{(item.requestType || 'Resource').toUpperCase()}</Badge>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">{new Date(item.updatedAt || item.requestedAt).toLocaleString()}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Permanent Grants Tab ─────────────────────────────────────────────────────────────── */
const PermanentGrantsTab: React.FC = () => {
  const [grants, setGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AccessRulesApi.listPermanentGrants()
      .then(res => setGrants(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 dark:text-gray-400 p-4 font-medium">Loading permanent grants...</div>;

  return (
    <div className="space-y-4">
      {grants.map((grant, i) => (
        <div key={grant.id || i} className="bg-white dark:bg-[#1a1a2e] border-l-4 border-l-emerald-500 shadow-sm rounded-2xl border-y border-r border-y-gray-200 border-r-gray-200 dark:border-y-[#8B0000]/30 dark:border-r-[#8B0000]/30">
          <div className="p-5 flex gap-4 items-center justify-between">
            <div className="flex-1">
              <div className="font-bold text-gray-900 dark:text-white text-sm">{grant.studentName || 'Unknown Student'}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{grant.studentEmail || ''}</div>
              <div className="flex gap-2 mt-2.5">
                <Badge variant="outline" className="border-gray-300 dark:border-[#8B0000]/30 text-gray-600 dark:text-gray-300">{(grant.entityType || 'Resource').toUpperCase()}</Badge>
                <Badge variant="success">PERMANENT</Badge>
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 font-medium">Granted: {new Date(grant.grantedAt).toLocaleDateString()}</div>
            </div>
            <Button variant="danger" className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700" onClick={async () => {
              if (window.confirm('Permanently revoke this grant?')) {
                await AccessRulesApi.revokeGrant(grant.id, 'Revoked by admin');
                setGrants(prev => prev.filter(g => g.id !== grant.id));
              }
            }}>Revoke</Button>
          </div>
        </div>
      ))}
    </div>
  );
};


