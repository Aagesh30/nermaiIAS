import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Clock, History, Lock,
  CheckCircle2, XCircle, Search, SlidersHorizontal, X, ChevronDown,
  RotateCcw, Ban, Filter, Radio, Video, Calendar, Users, RefreshCw
} from 'lucide-react';
import { AdminButton as Button } from '../components/admin-ui';
import { Badge } from '../components/ui/Badge';
import { AccessRulesApi } from '../core/services';

/* ─── Sub-tabs ─────────────────────────────────────────────────────────────── */
const SUB_TABS = [
  { key: 'permissions', label: 'Permissions', Icon: ShieldCheck },
  { key: 'requests',    label: 'Requests',    Icon: Clock       },
  { key: 'history',    label: 'History',     Icon: History     },
  { key: 'permanent',  label: 'Permanent',   Icon: Lock        },
];

/* ─── Premium Day Picker ─────────────────────────────────────────────────────── */
const DURATION_PRESETS = [
  { label: '1 Day',   days: 1   },
  { label: '3 Days',  days: 3   },
  { label: '7 Days',  days: 7   },
  { label: '14 Days', days: 14  },
  { label: '30 Days', days: 30  },
  { label: 'Perm.',   days: 0   },
];

const DaysPicker = ({
  value,
  onChange,
  allowPermanent = true,
}: {
  value: string;
  onChange: (v: string) => void;
  allowPermanent?: boolean;
}) => {
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const presets = allowPermanent ? DURATION_PRESETS : DURATION_PRESETS.filter(p => p.days !== 0);

  const handlePreset = (days: number) => {
    setShowCustom(false);
    setCustomInput('');
    onChange(String(days));
  };

  const handleCustom = (v: string) => {
    setCustomInput(v);
    const n = parseInt(v, 10);
    if (!isNaN(n) && n >= 1) onChange(String(n));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => (
          <button
            key={p.days}
            onClick={() => handlePreset(p.days)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
              value === String(p.days) && !showCustom
                ? 'bg-[#8B0000]/10 dark:bg-[#ff8a80]/10 border-[#8B0000] dark:border-[#ff8a80] text-[#8B0000] dark:text-[#ff8a80]'
                : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-[#8B0000]/40'
            }`}
          >
            {p.days === 0 ? 'Permanent' : p.label}
          </button>
        ))}
        <button
          onClick={() => { setShowCustom(true); onChange(''); }}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
            showCustom
              ? 'bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400'
              : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-orange-400/40'
          }`}
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 mt-1">
          <input
            autoFocus
            type="number"
            min={1}
            max={365}
            value={customInput}
            placeholder="e.g. 5"
            onChange={e => handleCustom(e.target.value)}
            className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/40"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">days</span>
          {customInput && !isNaN(parseInt(customInput)) && parseInt(customInput) >= 1 && (
            <span className="text-xs text-[#8B0000] dark:text-[#ff8a80] font-bold">✓ {customInput} day(s) selected</span>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Inline Approve Modal ────────────────────────────────────────────────────── */
const ApproveModal = ({
  req,
  onConfirm,
  onClose,
}: {
  req: any;
  onConfirm: (reqId: string, days: string, overrideLimit: boolean) => Promise<void>;
  onClose: () => void;
}) => {
  const [days, setDays] = useState('7');
  const [overrideLimit, setOverrideLimit] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onConfirm(req.id, days, overrideLimit);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Approve Access</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[260px]">
              {req?.studentName || req?.studentId} — {req?.contentName || req?.contentId}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {req?.reason && (
          <div className="mb-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-xs text-gray-600 dark:text-gray-300">
            <span className="font-bold text-gray-400 mr-1">Reason:</span>{req.reason}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
            Grant Duration
          </label>
          <DaysPicker value={days} onChange={setDays} allowPermanent={true} />
        </div>

        <div className="flex items-center gap-2 mb-5">
          <input
            type="checkbox"
            id="override-limit-modal"
            checked={overrideLimit}
            onChange={e => setOverrideLimit(e.target.checked)}
            className="rounded cursor-pointer"
          />
          <label htmlFor="override-limit-modal" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer font-semibold">
            Override monthly quota limit
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            style={{ backgroundColor: '#f3f4f6', color: '#374151', minHeight: '38px' }}
            className="flex-1 py-2 text-sm dark:bg-white/10 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={loading || (days === '' || isNaN(parseInt(days)))}
            style={{ backgroundColor: '#059669', color: '#ffffff', minHeight: '38px' }}
            className="flex-1 py-2 text-sm font-bold hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <CheckCircle2 size={15} color="#ffffff" />
            <span style={{ color: '#ffffff', fontWeight: 'bold' }}>
              {loading ? 'Approving...' : days === '0' ? 'Grant Permanent' : `Approve (${days} day${parseInt(days) > 1 ? 's' : ''})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Reject Modal ────────────────────────────────────────────────────────────── */
const RejectModal = ({
  label,
  onConfirm,
  onClose,
}: {
  label: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [reason, setReason] = useState('Rejected by admin');
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <XCircle size={18} className="text-rose-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Reject Request</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Rejection Reason</label>
        <textarea
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            style={{ backgroundColor: '#f3f4f6', color: '#374151', minHeight: '38px' }}
            className="flex-1 py-2 text-sm dark:bg-white/10 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={async () => { setLoading(true); try { await onConfirm(reason); onClose(); } finally { setLoading(false); } }}
            disabled={loading || !reason.trim()}
            style={{ backgroundColor: '#e11d48', color: '#ffffff', minHeight: '38px' }}
            className="flex-1 py-2 text-sm font-bold hover:bg-rose-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <XCircle size={15} color="#ffffff" />
            <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{loading ? 'Rejecting...' : 'Confirm Reject'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Bulk Approve Modal ─────────────────────────────────────────────────────── */
const BulkApproveModal = ({
  count,
  onConfirm,
  onClose,
}: {
  count: number;
  onConfirm: (days: string, overrideLimit: boolean) => Promise<void>;
  onClose: () => void;
}) => {
  const [days, setDays] = useState('7');
  const [overrideLimit, setOverrideLimit] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Bulk Approve — {count} Request{count > 1 ? 's' : ''}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Choose a grant duration for all selected requests</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Grant Duration (for all)</label>
          <DaysPicker value={days} onChange={setDays} allowPermanent={true} />
        </div>

        <div className="flex items-center gap-2 mb-5">
          <input type="checkbox" id="bulk-override" checked={overrideLimit} onChange={e => setOverrideLimit(e.target.checked)} className="rounded cursor-pointer" />
          <label htmlFor="bulk-override" className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer font-semibold">Override monthly quota limit</label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            style={{ backgroundColor: '#f3f4f6', color: '#374151', minHeight: '38px' }}
            className="flex-1 py-2 text-sm dark:bg-white/10 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={async () => { setLoading(true); try { await onConfirm(days, overrideLimit); onClose(); } finally { setLoading(false); } }}
            disabled={loading || days === '' || isNaN(parseInt(days))}
            style={{ backgroundColor: '#059669', color: '#ffffff', minHeight: '38px' }}
            className="flex-1 py-2 text-sm font-bold hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <CheckCircle2 size={15} color="#ffffff" />
            <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{loading ? 'Approving...' : `Approve All (${count})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Revert Modal (History) ─────────────────────────────────────────────────── */
const RevertModal = ({
  label,
  onConfirm,
  onClose,
}: {
  label: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}) => {
  const [reason, setReason] = useState('Permission reverted by admin');
  const [loading, setLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <RotateCcw size={18} className="text-orange-500" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Revert / Cancel Permission</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[260px]">{label}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Reason for Reverting</label>
        <textarea
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
          rows={3}
          value={reason}
          onChange={e => setReason(e.target.value)}
        />

        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <button
            onClick={onClose}
            style={{ backgroundColor: '#f3f4f6', color: '#374151', minHeight: '40px' }}
            className="flex-1 py-2 px-4 text-sm dark:bg-white/10 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20 rounded-xl transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={async () => { setLoading(true); try { await onConfirm(reason); onClose(); } finally { setLoading(false); } }}
            disabled={loading || !reason.trim()}
            style={{ backgroundColor: '#ea580c', color: '#ffffff', minHeight: '40px' }}
            className="flex-1 py-2 px-4 text-sm font-bold hover:bg-orange-600 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
          >
            <RotateCcw size={15} color="#ffffff" />
            <span style={{ color: '#ffffff', fontWeight: 'bold' }}>{loading ? 'Reverting...' : 'Confirm Revert'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Filter Bar ─────────────────────────────────────────────────────────────── */
const FilterBar = ({
  search, setSearch,
  filterBatch, setFilterBatch,
  filterRequestType, setFilterRequestType,
  filterTime, setFilterTime,
  batches,
  extraSlot,
}: {
  search: string; setSearch: (v: string) => void;
  filterBatch: string; setFilterBatch: (v: string) => void;
  filterRequestType: string; setFilterRequestType: (v: string) => void;
  filterTime: string; setFilterTime: (v: string) => void;
  batches: string[];
  extraSlot?: React.ReactNode;
}) => (
  <div className="flex flex-wrap gap-3 items-center mb-5 py-1">
    {/* Search */}
    <div className="relative flex-1 min-w-[200px] max-w-xs">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search student, content..."
        style={{ paddingLeft: '36px', paddingRight: '28px', height: '38px', boxSizing: 'border-box' }}
        className="w-full text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#8B0000]/30 shadow-sm"
      />
      {search && (
        <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
          <X size={13} className="text-gray-400 hover:text-gray-700 dark:hover:text-white" />
        </button>
      )}
    </div>

    {/* Batch */}
    <div className="relative">
      <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <select
        value={filterBatch}
        onChange={e => setFilterBatch(e.target.value)}
        style={{ paddingLeft: '34px', paddingRight: '30px', height: '38px', minWidth: '130px', boxSizing: 'border-box' }}
        className="text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white focus:outline-none cursor-pointer appearance-none shadow-sm font-medium"
      >
        <option value="">All Batches</option>
        {batches.map(b => <option key={b} value={b}>{b}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>

    {/* Request Type */}
    <div className="relative">
      <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <select
        value={filterRequestType}
        onChange={e => setFilterRequestType(e.target.value)}
        style={{ paddingLeft: '34px', paddingRight: '30px', height: '38px', minWidth: '120px', boxSizing: 'border-box' }}
        className="text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white focus:outline-none cursor-pointer appearance-none shadow-sm font-medium"
      >
        <option value="">All Types</option>
        <option value="LIVE_SESSION">Live Class</option>
        <option value="CLASS">Recorded / Class</option>
        <option value="COURSE">Course</option>
        <option value="TOPIC">Topic</option>
        <option value="SUBJECT">Subject</option>
        <option value="RESOURCE">Resource</option>
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>

    {/* Time */}
    <div className="relative">
      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <select
        value={filterTime}
        onChange={e => setFilterTime(e.target.value)}
        style={{ paddingLeft: '34px', paddingRight: '30px', height: '38px', minWidth: '115px', boxSizing: 'border-box' }}
        className="text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white focus:outline-none cursor-pointer appearance-none shadow-sm font-medium"
      >
        <option value="">All Time</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>

    {extraSlot}
  </div>
);

/* ─── Helper: filter items ───────────────────────────────────────────────────── */
const applyFilters = (
  items: any[],
  search: string,
  filterBatch: string,
  filterRequestType: string,
  filterTime: string,
) => {
  const q = search.toLowerCase();
  const now = Date.now();
  const dayMs = 86400000;

  return items.filter(item => {
    const student = (item.studentName || item.studentId || '').toLowerCase();
    const content = (item.contentName || item.entityName || item.contentId || '').toLowerCase();
    const reason  = (item.reason || item.customReason || '').toLowerCase();
    if (q && !student.includes(q) && !content.includes(q) && !reason.includes(q)) return false;

    if (filterBatch && item.batchId !== filterBatch && item.batchName !== filterBatch) return false;

    if (filterRequestType) {
      const rt = (item.requestType || item.entityType || '').toUpperCase();
      if (rt !== filterRequestType) return false;
    }

    if (filterTime) {
      const itemTime = new Date(item.requestedAt || item.updatedAt || item.createdAt || 0).getTime();
      if (filterTime === 'today'  && now - itemTime > dayMs)     return false;
      if (filterTime === 'week'   && now - itemTime > 7 * dayMs) return false;
      if (filterTime === 'month'  && now - itemTime > 30 * dayMs) return false;
    }

    return true;
  });
};

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
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
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <tab.Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="pb-20">
        {activeTab === 'permissions' && (
          <div className="p-12 text-center border border-dashed rounded-xl bg-white dark:bg-[#1a1a2e] border-gray-200 dark:border-[#8B0000]/30">
            <ShieldCheck className="mx-auto mb-3 text-[#8B0000] dark:text-[#ff8a80] opacity-60" size={40} />
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">Manage Content Permissions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Navigate to any Course, Subject, Topic, or Class in the LMS and use the <strong>🔒 Permissions</strong> button to configure access rules for that content.
            </p>
          </div>
        )}
        {activeTab === 'requests'    && <RequestsTab />}
        {activeTab === 'history'     && <HistoryTab />}
        {activeTab === 'permanent'   && <PermanentGrantsTab />}
      </div>
    </div>
  );
};

/* ─── Requests Tab ─────────────────────────────────────────────────────────────── */
const RequestsTab: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [overrideLimit, setOverrideLimit] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterRequestType, setFilterRequestType] = useState('');
  const [filterTime, setFilterTime] = useState('');

  // Modal state
  const [approveModal, setApproveModal] = useState<any | null>(null);
  const [rejectModal, setRejectModal]  = useState<{ id: string; label: string } | null>(null);
  const [bulkApproveModal, setBulkApproveModal] = useState(false);
  const [bulkRejectModal, setBulkRejectModal]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await AccessRulesApi.listAccessRequests();
      setRequests(res.data?.data || res.data || []);
    } catch (err) {
      setError('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const batches = [...new Set(requests.map(r => r.batchName || r.batchId).filter(Boolean))];
  const filtered = applyFilters(requests, search, filterBatch, filterRequestType, filterTime);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const handleSelectAll = () => {
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)));
  };

  // Individual approve (opens modal)
  const handleIndividualApprove = (req: any) => setApproveModal(req);

  // Confirm individual approve
  const confirmIndividualApprove = async (reqId: string, days: string, override: boolean) => {
    const daysNum = parseInt(days, 10);
    const durationHours = daysNum === 0 ? null : daysNum * 24;
    setProcessingIds(prev => new Set(prev).add(reqId));
    try {
      const res = await AccessRulesApi.bulkApprove({
        requestIds: [reqId],
        grantType: daysNum === 0 ? 'PERMANENT' : 'TEMPORARY',
        durationHours,
        consumeMonthlyUnits: true,
        respectMonthlyLimit: !override,
        presetId: null,
        overrideLimit: override,
      });
      const data = res.data?.data || res.data;
      if (data?.failed > 0) {
        alert(`Approval failed: ${data.errors?.join(', ') || 'Unknown error'}`);
      } else {
        setRequests(prev => prev.filter(r => r.id !== reqId));
        setSelectedIds(prev => { const n = new Set(prev); n.delete(reqId); return n; });
      }
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Approval failed');
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(reqId); return s; });
    }
  };

  // Individual reject
  const confirmIndividualReject = async (reqId: string, reason: string) => {
    setProcessingIds(prev => new Set(prev).add(reqId));
    try {
      await AccessRulesApi.bulkReject({ requestIds: [reqId], reason });
      setRequests(prev => prev.filter(r => r.id !== reqId));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(reqId); return n; });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Rejection failed');
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(reqId); return s; });
    }
  };

  // Bulk approve confirm
  const confirmBulkApprove = async (days: string, override: boolean) => {
    const daysNum = parseInt(days, 10);
    const durationHours = daysNum === 0 ? null : daysNum * 24;
    try {
      const res = await AccessRulesApi.bulkApprove({
        requestIds: Array.from(selectedIds),
        grantType: daysNum === 0 ? 'PERMANENT' : 'TEMPORARY',
        durationHours,
        consumeMonthlyUnits: true,
        respectMonthlyLimit: !override,
        presetId: null,
        overrideLimit: override,
      });
      const data = res.data?.data || res.data;
      if (data?.failed > 0) {
        alert(`Approved ${data.approved}, Failed ${data.failed}. Errors: ${data.errors?.join(', ')}`);
        await load();
      } else {
        setRequests(prev => prev.filter(r => !selectedIds.has(r.id)));
      }
      setSelectedIds(new Set());
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Approval failed');
    }
  };

  // Bulk reject confirm
  const confirmBulkReject = async (reason: string) => {
    try {
      await AccessRulesApi.bulkReject({ requestIds: Array.from(selectedIds), reason });
      setRequests(prev => prev.filter(r => !selectedIds.has(r.id)));
      setSelectedIds(new Set());
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Rejection failed');
    }
  };

  if (loading) return <div className="text-gray-500 dark:text-gray-400 p-4 font-medium flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Loading requests...</div>;
  if (error)   return <div className="text-red-600 dark:text-red-400 p-4 font-medium">{error}</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Pending <span className="text-sm font-semibold text-gray-500">({filtered.length}{filtered.length !== requests.length ? ` of ${requests.length}` : ''})</span>
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="secondary" className="px-3 py-1.5 text-xs font-bold" onClick={handleSelectAll}>
            {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </Button>
          {selectedIds.size > 0 && (
            <>
              <Button className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setBulkApproveModal(true)}>
                Approve ({selectedIds.size})
              </Button>
              <Button className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white" onClick={() => setBulkRejectModal(true)}>
                Reject ({selectedIds.size})
              </Button>
            </>
          )}
          <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <RefreshCw size={14} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        filterBatch={filterBatch} setFilterBatch={setFilterBatch}
        filterRequestType={filterRequestType} setFilterRequestType={setFilterRequestType}
        filterTime={filterTime} setFilterTime={setFilterTime}
        batches={batches}
      />

      {filtered.length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 p-8 text-center bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
          {requests.length === 0 ? 'No pending requests.' : 'No requests match your filters.'}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((req, i) => {
          const isSelected = selectedIds.has(req.id);
          const isProcessing = processingIds.has(req.id);
          const studentReason = req.customReason || req.reason || '';
          const reqType = (req.requestType || req.entityType || 'Resource').toUpperCase();

          return (
            <div
              key={req.id || i}
              className={`bg-white dark:bg-[#1a1a2e] border shadow-sm rounded-2xl transition-all ${isSelected ? 'border-[#8B0000] bg-[#8B0000]/5 dark:border-[#ff8a80] dark:bg-[#8B0000]/10' : 'border-gray-200 dark:border-[#8B0000]/30 hover:border-[#8B0000]/50'}`}
            >
              <div className="p-5 flex items-start gap-4">
                {/* Checkbox */}
                <div
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${isSelected ? 'bg-[#8B0000] dark:bg-[#ff8a80] border-[#8B0000] dark:border-[#ff8a80]' : 'border-gray-300 dark:border-gray-700 hover:border-[#8B0000]/60'}`}
                  onClick={() => toggleSelect(req.id)}
                >
                  {isSelected && <CheckCircle2 size={14} className="text-white" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 dark:text-white text-sm">
                    {req.studentName || req.studentId || 'Unknown Student'}
                    {req.batchName && <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Batch: {req.batchName}</span>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{req.contentName || req.entityName || req.contentId || 'General Access Request'}</div>
                  {studentReason && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-[#252525] rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10">
                      <span className="font-semibold text-gray-400 dark:text-gray-500 mr-1">Reason:</span>{studentReason}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2.5 items-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${reqType === 'LIVE_SESSION' ? 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400' : 'border-[#8B0000]/40 bg-[#8B0000]/10 text-[#8B0000] dark:text-[#ff8a80]'}`}>
                      {reqType === 'LIVE_SESSION' ? <Radio size={10} /> : <Video size={10} />}
                      {reqType === 'LIVE_SESSION' ? 'Live Session' : reqType}
                    </span>
                    {(req.requestedAt || req.createdAt) && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(req.requestedAt || req.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Individual Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    disabled={isProcessing}
                    onClick={() => handleIndividualApprove(req)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 disabled:opacity-50 transition-colors"
                  >
                    <CheckCircle2 size={13} />
                    {isProcessing ? '...' : 'Approve'}
                  </button>
                  <button
                    disabled={isProcessing}
                    onClick={() => setRejectModal({ id: req.id, label: req.studentName || req.studentId || 'Request' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
                  >
                    <XCircle size={13} />
                    {isProcessing ? '...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {approveModal && (
        <ApproveModal
          req={approveModal}
          onConfirm={confirmIndividualApprove}
          onClose={() => setApproveModal(null)}
        />
      )}
      {rejectModal && (
        <RejectModal
          label={rejectModal.label}
          onConfirm={(reason) => confirmIndividualReject(rejectModal.id, reason)}
          onClose={() => setRejectModal(null)}
        />
      )}
      {bulkApproveModal && (
        <BulkApproveModal
          count={selectedIds.size}
          onConfirm={confirmBulkApprove}
          onClose={() => setBulkApproveModal(false)}
        />
      )}
      {bulkRejectModal && (
        <RejectModal
          label={`Reject ${selectedIds.size} selected request(s)`}
          onConfirm={async (reason) => { await confirmBulkReject(reason); }}
          onClose={() => setBulkRejectModal(false)}
        />
      )}
    </div>
  );
};

/* ─── History Tab ─────────────────────────────────────────────────────────────── */
const HistoryTab: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [revertModal, setRevertModal] = useState<{ id: string; label: string } | null>(null);
  const [bulkRevertModal, setBulkRevertModal] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterRequestType, setFilterRequestType] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = () => {
    setLoading(true);
    AccessRulesApi.listAccessHistory()
      .then(res => setHistory(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const batches = [...new Set(history.map(r => r.batchName || r.batchId).filter(Boolean))];

  let filtered = applyFilters(history, search, filterBatch, filterRequestType, filterTime);
  if (filterStatus) filtered = filtered.filter(item => item.status === filterStatus);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const handleSelectAll = () => {
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(r => r.id)));
  };

  // Revert single
  const confirmRevert = async (grantId: string, reason: string) => {
    setProcessingIds(prev => new Set(prev).add(grantId));
    try {
      await AccessRulesApi.revokeGrant(grantId, reason);
      setHistory(prev => prev.filter(h => h.id !== grantId));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(grantId); return n; });
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Revert failed');
    } finally {
      setProcessingIds(prev => { const s = new Set(prev); s.delete(grantId); return s; });
    }
  };

  // Bulk revert
  const confirmBulkRevert = async (reason: string) => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map(id => AccessRulesApi.revokeGrant(id, reason).catch(() => {})));
    setHistory(prev => prev.filter(h => !selectedIds.has(h.id)));
    setSelectedIds(new Set());
  };

  if (loading) return <div className="text-gray-500 dark:text-gray-400 p-4 font-medium flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Loading history...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          History <span className="text-sm font-semibold text-gray-500">({filtered.length}{filtered.length !== history.length ? ` of ${history.length}` : ''})</span>
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          <Button variant="secondary" className="px-3 py-1.5 text-xs font-bold" onClick={handleSelectAll}>
            {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
          </Button>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setBulkRevertModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold hover:bg-orange-500/20 transition-colors"
            >
              <RotateCcw size={13} />
              Revert / Cancel ({selectedIds.size})
            </button>
          )}
          <button onClick={load} className="p-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <RefreshCw size={14} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <FilterBar
        search={search} setSearch={setSearch}
        filterBatch={filterBatch} setFilterBatch={setFilterBatch}
        filterRequestType={filterRequestType} setFilterRequestType={setFilterRequestType}
        filterTime={filterTime} setFilterTime={setFilterTime}
        batches={batches}
        extraSlot={
          <div className="relative">
            <SlidersHorizontal size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              style={{ paddingLeft: '34px', paddingRight: '30px', height: '38px', minWidth: '125px', boxSizing: 'border-box' }}
              className="text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white focus:outline-none cursor-pointer appearance-none shadow-sm font-medium"
            >
              <option value="">All Status</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        }
      />

      {filtered.length === 0 && (
        <div className="text-gray-500 dark:text-gray-400 p-8 text-center bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
          {history.length === 0 ? 'No history found.' : 'No items match your filters.'}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((item, i) => {
          const isApproved = item.status === 'APPROVED';
          const isSelected = selectedIds.has(item.id);
          const isProcessing = processingIds.has(item.id);
          const reqType = (item.requestType || item.entityType || 'Resource').toUpperCase();

          return (
            <div
              key={item.id || i}
              className={`bg-white dark:bg-[#1a1a2e] border-l-4 shadow-sm rounded-2xl border-y border-r transition-all ${
                isSelected
                  ? 'border-y-[#8B0000]/50 border-r-[#8B0000]/50 dark:border-y-[#ff8a80]/40 dark:border-r-[#ff8a80]/40'
                  : 'border-y-gray-200 border-r-gray-200 dark:border-y-[#8B0000]/30 dark:border-r-[#8B0000]/30'
              } ${isApproved ? 'border-l-emerald-500' : 'border-l-rose-500'}`}
            >
              <div className="p-5 flex items-start gap-4">
                {/* Checkbox */}
                <div
                  className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 cursor-pointer transition-colors ${isSelected ? 'bg-[#8B0000] dark:bg-[#ff8a80] border-[#8B0000] dark:border-[#ff8a80]' : 'border-gray-300 dark:border-gray-700 hover:border-[#8B0000]/60'}`}
                  onClick={() => toggleSelect(item.id)}
                >
                  {isSelected && <CheckCircle2 size={14} className="text-white" />}
                </div>

                {/* Status icon */}
                {isApproved
                  ? <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={18} />
                  : <XCircle className="text-rose-500 shrink-0 mt-0.5" size={18} />
                }

                {/* Info */}
                <div className="flex-1">
                  <div className="font-bold text-gray-900 dark:text-white text-sm">
                    {item.studentName || item.studentId}
                    {item.batchName && <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">Batch: {item.batchName}</span>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.contentName || item.entityName || 'General Access'}</div>
                  <div className="flex flex-wrap gap-2 mt-2.5 items-center">
                    <Badge variant={isApproved ? 'success' : 'destructive'}>{item.status}</Badge>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${reqType === 'LIVE_SESSION' ? 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400' : 'border-gray-300 dark:border-[#8B0000]/30 text-gray-600 dark:text-gray-300'}`}>
                      {reqType === 'LIVE_SESSION' ? <Radio size={10} /> : <Video size={10} />}
                      {reqType}
                    </span>
                    {item.grantExpiresAt && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        Expires: {new Date(item.grantExpiresAt).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(item.grantedAt || item.updatedAt || item.requestedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Revert button (only for approved) */}
                {isApproved && (
                  <button
                    disabled={isProcessing}
                    onClick={() => setRevertModal({ id: item.id, label: `${item.studentName || item.studentId} — ${item.contentName || 'Access'}` })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold hover:bg-orange-500/20 disabled:opacity-50 transition-colors shrink-0"
                  >
                    <RotateCcw size={13} />
                    {isProcessing ? '...' : 'Revert'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Revert Modal - individual */}
      {revertModal && (
        <RevertModal
          label={revertModal.label}
          onConfirm={(reason) => confirmRevert(revertModal.id, reason)}
          onClose={() => setRevertModal(null)}
        />
      )}

      {/* Bulk Revert Modal */}
      {bulkRevertModal && (
        <RevertModal
          label={`Revert / Cancel permission for ${selectedIds.size} selected item(s)`}
          onConfirm={confirmBulkRevert}
          onClose={() => setBulkRevertModal(false)}
        />
      )}
    </div>
  );
};

/* ─── Permanent Grants Tab ─────────────────────────────────────────────────────── */
const PermanentGrantsTab: React.FC = () => {
  const [grants, setGrants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AccessRulesApi.listPermanentGrants()
      .then(res => setGrants(res.data?.data || res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500 dark:text-gray-400 p-4 font-medium flex items-center gap-2"><RefreshCw size={14} className="animate-spin" /> Loading permanent grants...</div>;

  if (grants.length === 0) return (
    <div className="p-12 text-center border border-dashed border-gray-200 dark:border-white/10 rounded-2xl bg-white dark:bg-[#1a1a2e] text-gray-500 dark:text-gray-400">
      <Lock className="mx-auto mb-3 opacity-40" size={36} />
      <p className="font-semibold text-sm">No permanent grants</p>
      <p className="text-xs mt-1">Approved permanent access requests will appear here.</p>
    </div>
  );

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
            <Button variant="danger" className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white" onClick={async () => {
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