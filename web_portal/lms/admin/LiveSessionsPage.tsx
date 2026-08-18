import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LiveSessionApi, LiveAttendanceApi } from '../core/services';
import {
  Video, Plus, ChevronDown, Square, Youtube, Trash2,
  CheckSquare, Clock, Calendar, History, CheckCircle2
} from 'lucide-react';
import { ScheduleSessionDialog } from './ScheduleSessionDialog';

// ── Status colour helper ──────────────────────────────────────────────────────
const liveStatusVariant = (status: string) => {
  if (['LIVE', 'ATTENDANCE_RUNNING'].includes(status)) return 'success';
  if (['JOINING', 'HOST_CONNECTED'].includes(status)) return 'destructive';
  if (['ENDED', 'CANCELLED', 'EXPIRED', 'ARCHIVED'].includes(status)) return 'secondary';
  return 'default';
};

// ── End Session Modal ─────────────────────────────────────────────────────────
const EndSessionModal = ({
  session,
  onClose,
  onConfirm,
}: {
  session: any;
  onClose: () => void;
  onConfirm: (convertToYoutube: boolean, youtubeUrl?: string) => Promise<void>;
}) => {
  const [convertOption, setConvertOption] = useState<'none' | 'youtube'>('none');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [ending, setEnding] = useState(false);

  const handleConfirm = async () => {
    if (convertOption === 'youtube' && !youtubeUrl.trim()) return;
    setEnding(true);
    try {
      await onConfirm(convertOption === 'youtube', youtubeUrl.trim() || undefined);
    } finally {
      setEnding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-red-500/20 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
        <h3 className="text-xl font-bold text-white mb-1">End Live Class</h3>
        <p className="text-gray-400 text-sm mb-5">
          End session: <span className="text-white font-semibold">{session.title}</span>
        </p>

        {/* Convert option */}
        <div className="space-y-3 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">After ending:</p>

          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            convertOption === 'none' ? 'border-white/20 bg-white/5' : 'border-white/10 hover:bg-white/5'
          }`}>
            <input
              type="radio"
              name="convertOption"
              checked={convertOption === 'none'}
              onChange={() => setConvertOption('none')}
              className="accent-white"
            />
            <div>
              <p className="text-sm font-medium text-white">End class only</p>
              <p className="text-xs text-gray-500">Session moves to history. No changes to class.</p>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            convertOption === 'youtube' ? 'border-red-500/40 bg-red-500/5' : 'border-white/10 hover:bg-white/5'
          }`}>
            <input
              type="radio"
              name="convertOption"
              checked={convertOption === 'youtube'}
              onChange={() => setConvertOption('youtube')}
              className="accent-red-500"
            />
            <div className="flex items-center gap-2">
              <Youtube size={14} className="text-red-400" />
              <div>
                <p className="text-sm font-medium text-white">Convert to YouTube Recorded Class</p>
                <p className="text-xs text-gray-500">Class becomes a recorded class with a YouTube link.</p>
              </div>
            </div>
          </label>

          {convertOption === 'youtube' && (
            <div className="ml-7 mt-1">
              <input
                type="url"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={ending}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={ending || (convertOption === 'youtube' && !youtubeUrl.trim())}
            className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/30 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Square size={14} />
            {ending ? 'Ending…' : 'End Class'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Convert to YouTube Modal (for history items not yet converted) ─────────────
const ConvertModal = ({
  session,
  onClose,
  onConfirm,
}: {
  session: any;
  onClose: () => void;
  onConfirm: (youtubeUrl: string) => Promise<void>;
}) => {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!youtubeUrl.trim()) return;
    setSaving(true);
    try {
      await onConfirm(youtubeUrl.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-1">Convert to Recorded Class</h3>
        <p className="text-gray-400 text-sm mb-5">
          {session.classTitle} — paste the YouTube recording URL below.
        </p>
        <input
          type="url"
          value={youtubeUrl}
          onChange={e => setYoutubeUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 mb-4"
        />
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving || !youtubeUrl.trim()}
            className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/30 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Youtube size={14} />
            {saving ? 'Saving…' : 'Convert'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const LiveSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState<Record<string, boolean>>({});

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleProvider, setScheduleProvider] = useState<'youtube' | 'zoom' | 'google_meet'>('zoom');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [startConfirm, setStartConfirm] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState<boolean>(false);

  // End session state
  const [endConfirmSession, setEndConfirmSession] = useState<any | null>(null);

  // History state
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());
  const [deletingHistory, setDeletingHistory] = useState(false);
  const [convertModal, setConvertModal] = useState<any | null>(null);

  // ── Data loading ──────────────────────────────────────────────────────────

  const fetchLiveSessions = useCallback(async () => {
    try {
      const res = await LiveSessionApi.listSessions(undefined, { headers: { 'X-Is-Admin': 'true' } });
      setSessions(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await LiveSessionApi.getSessionHistory() as any;
      setHistory(res?.data?.data || res?.data || []);
    } catch (err) {
      console.error('Failed to fetch session history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveSessions();
  }, [fetchLiveSessions]);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
  }, [activeTab, fetchHistory]);

  // ── Attendance ────────────────────────────────────────────────────────────

  const handleStartAttendance = async (sessionId: string, classId: string) => {
    setAttendanceLoading(prev => ({ ...prev, [sessionId]: true }));
    try {
      await LiveAttendanceApi.startAttendance({ liveSessionId: sessionId, classId: classId || sessionId });
      alert('Attendance started successfully.');
      fetchLiveSessions();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to start attendance');
    } finally {
      setAttendanceLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleEndAttendance = async (sessionId: string) => {
    setAttendanceLoading(prev => ({ ...prev, [sessionId]: true }));
    try {
      await LiveAttendanceApi.endAttendance(sessionId);
      alert('Attendance ended successfully.');
      fetchLiveSessions();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to end attendance');
    } finally {
      setAttendanceLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  // ── Start ─────────────────────────────────────────────────────────────────

  const handleStart = (sessionId: string) => setStartConfirm(sessionId);

  const performStart = async (sessionId: string) => {
    const session = sessions.find((s: any) => s.id === sessionId);
    let adminOverride = false;
    const currentUid = (currentUser?.userId || (currentUser as any)?.uid)?.toLowerCase();
    if (session) {
      const isHost = session.hostId?.toLowerCase() === currentUid || session.host?.userId?.toLowerCase() === currentUid;
      if (!isHost) {
        const confirmOverride = window.confirm('You are not the assigned host. Use Admin Override?');
        if (!confirmOverride) return;
        adminOverride = true;
      }
    }
    setStartingSession(true);
    try {
      await LiveSessionApi.startSession(sessionId, adminOverride);
      if (session) handleJoin(sessionId, session.provider, adminOverride);
      else navigate(`/admin/live-session/${sessionId}${adminOverride ? '?adminOverride=true' : ''}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start session');
    } finally {
      setStartingSession(false);
      setStartConfirm(null);
    }
  };

  const handleJoin = async (sessionId: string, provider: string, adminOverride?: boolean) => {
    try {
      if (provider?.toLowerCase() === 'google_meet') {
        const res = await LiveSessionApi.joinSession(sessionId, adminOverride);
        const payload = res.data?.data || res.data;
        window.open(payload.meetUrl || payload.joinUrl || payload.hostUrl || payload.url, '_blank');
      } else {
        navigate(`/admin/live-session/${sessionId}${adminOverride ? '?adminOverride=true' : ''}`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to join session');
    }
  };

  // ── End with optional conversion ──────────────────────────────────────────

  const performEndWithConversion = async (convertToYoutube: boolean, youtubeUrl?: string) => {
    if (!endConfirmSession) return;
    try {
      await LiveSessionApi.endSessionWithConversion(endConfirmSession.id, { convertToYoutube, youtubeUrl });
      alert(convertToYoutube ? 'Session ended and converted to recorded class!' : 'Session ended successfully.');
      setEndConfirmSession(null);
      fetchLiveSessions();
      fetchHistory();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to end session');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const performDelete = async (id: string) => {
    try {
      await LiveSessionApi.deleteSession(id);
      fetchLiveSessions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete session');
    } finally {
      setDeleteConfirm(null);
    }
  };

  // ── History deletion ──────────────────────────────────────────────────────

  const deleteHistoryItem = async (id: string) => {
    if (!window.confirm('Delete this history entry?')) return;
    try {
      await LiveSessionApi.deleteSession(id);
      setHistory(prev => prev.filter(h => h.id !== id));
      setSelectedHistoryIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete history item');
    }
  };

  const deleteSelectedHistory = async () => {
    if (selectedHistoryIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedHistoryIds.size} selected history entries?`)) return;
    setDeletingHistory(true);
    try {
      await Promise.all([...selectedHistoryIds].map(id => LiveSessionApi.deleteSession(id)));
      setHistory(prev => prev.filter(h => !selectedHistoryIds.has(h.id)));
      setSelectedHistoryIds(new Set());
    } catch (err: any) {
      alert('Some entries could not be deleted.');
    } finally {
      setDeletingHistory(false);
    }
  };

  const deleteAllHistory = async () => {
    if (history.length === 0) return;
    if (!window.confirm(`Delete ALL ${history.length} history entries? This cannot be undone.`)) return;
    setDeletingHistory(true);
    try {
      await Promise.all(history.map(h => LiveSessionApi.deleteSession(h.id)));
      setHistory([]);
      setSelectedHistoryIds(new Set());
    } catch (err: any) {
      alert('Some entries could not be deleted.');
    } finally {
      setDeletingHistory(false);
    }
  };

  const handleConvertHistory = async (youtubeUrl: string) => {
    if (!convertModal) return;
    try {
      await LiveSessionApi.endSessionWithConversion(convertModal.id, { convertToYoutube: true, youtubeUrl });
      setHistory(prev => prev.map(h => h.id === convertModal.id ? { ...h, convertedToRecorded: true, recordingUrl: youtubeUrl } : h));
      setConvertModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to convert');
    }
  };

  const toggleHistorySelect = (id: string) => {
    setSelectedHistoryIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedHistoryIds.size === history.length) {
      setSelectedHistoryIds(new Set());
    } else {
      setSelectedHistoryIds(new Set(history.map(h => h.id)));
    }
  };

  // ── Active sessions table columns ─────────────────────────────────────────

  const activeSessionStatuses = ['SCHEDULED', 'DRAFT', 'JOINING', 'HOST_CONNECTED', 'LIVE', 'ATTENDANCE_RUNNING'];

  const columns = [
    {
      header: 'Session Title',
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            ['LIVE', 'ATTENDANCE_RUNNING'].includes(row.liveStatus) ? 'bg-green-500/15 text-green-400 animate-pulse' :
            ['JOINING', 'HOST_CONNECTED'].includes(row.liveStatus) ? 'bg-yellow-500/15 text-yellow-400' :
            'bg-surfaceHighlight text-gray-400'
          }`}>
            <Video size={16} />
          </div>
          <span className="font-semibold text-white">{row.title}</span>
        </div>
      )
    },
    {
      header: 'Start Time',
      cell: (row: any) => row.startTime ? new Date(row.startTime).toLocaleString() : 'TBD'
    },
    {
      header: 'Provider',
      cell: (row: any) => <span className="uppercase text-gray-400 text-sm">{row.provider}</span>
    },
    {
      header: 'Host',
      cell: (row: any) => (
        <span className="text-sm font-medium text-gray-200 capitalize">
          {row.hostName || row.host?.displayName || row.host?.name || row.host?.userId || row.hostId || 'Unassigned'}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (row: any) => (
        <Badge variant={liveStatusVariant(row.liveStatus || 'SCHEDULED') as any}>
          {row.liveStatus || 'SCHEDULED'}
        </Badge>
      )
    },
    {
      header: 'Attendance',
      cell: (row: any) => (
        <Badge variant={row.lamsStatus === 'ATTENDANCE_ACTIVE' ? 'destructive' : 'default'}>
          {row.lamsStatus || 'INACTIVE'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      cell: (row: any) => {
        const status = row.liveStatus || row.status || 'SCHEDULED';
        const isStartable = status === 'SCHEDULED' || status === 'DRAFT' || !status;
        const isJoinable = ['JOINING', 'HOST_CONNECTED', 'LIVE', 'ATTENDANCE_RUNNING'].includes(status);
        const isEndable = ['JOINING', 'HOST_CONNECTED', 'LIVE', 'ATTENDANCE_RUNNING'].includes(status);

        return (
          <div className="flex items-center gap-2 flex-wrap">
            {isStartable && (
              <Button size="sm" onClick={() => handleStart(row.id)}>Start</Button>
            )}
            {isJoinable && (
              <Button size="sm" variant="primary" onClick={() => handleJoin(row.id, row.provider)}>
                Join Live
              </Button>
            )}
            {/* 🔴 End Class Button */}
            {isEndable && (
              <button
                onClick={() => setEndConfirmSession(row)}
                className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 rounded-lg transition-colors flex items-center gap-1.5"
                title="End this live session"
              >
                <Square size={12} />
                End Class
              </button>
            )}
          </div>
        );
      }
    }
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  const activeSessions = sessions.filter(s => activeSessionStatuses.includes(s.liveStatus || s.status || 'SCHEDULED'));

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Live Sessions</h1>
          <p className="text-gray-400">Manage active and scheduled live streaming sessions and LAMS controls.</p>
        </div>
        <div className="relative">
          <Button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
          >
            <Plus size={16} className="mr-2" />
            Schedule Session
            <ChevronDown size={16} className="ml-2" />
          </Button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface border border-white/10 rounded-lg shadow-xl overflow-hidden z-[100]">
              <button
                className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-white flex items-center transition-colors"
                onClick={() => { setScheduleProvider('youtube'); setShowScheduleModal(true); setIsDropdownOpen(false); }}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 mr-3" />
                YouTube Live
              </button>
              <button
                className="w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-white flex items-center transition-colors"
                onClick={() => { setScheduleProvider('zoom'); setShowScheduleModal(true); setIsDropdownOpen(false); }}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
                Zoom Live
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-500 flex items-center cursor-not-allowed" disabled>
                <span className="w-2 h-2 rounded-full bg-green-500 opacity-50 mr-3" />
                Google Meet (Coming Soon)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'active'
              ? 'text-white bg-white/10 border-b-2 border-primary'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="flex items-center gap-2">
            <Video size={14} />
            Active / Scheduled
            {activeSessions.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-primary/20 text-primary rounded-full">{activeSessions.length}</span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'history'
              ? 'text-white bg-white/10 border-b-2 border-primary'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="flex items-center gap-2">
            <History size={14} />
            History
            {history.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-white/10 text-gray-300 rounded-full">{history.length}</span>
            )}
          </span>
        </button>
      </div>

      {/* Active Sessions Tab */}
      {activeTab === 'active' && (
        <DataTable columns={columns} data={activeSessions} isLoading={loading} />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* History toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">{history.length} ended sessions</p>
            <div className="flex items-center gap-3">
              {selectedHistoryIds.size > 0 && (
                <button
                  onClick={deleteSelectedHistory}
                  disabled={deletingHistory}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete Selected ({selectedHistoryIds.size})
                </button>
              )}
              {history.length > 0 && (
                <button
                  onClick={deleteAllHistory}
                  disabled={deletingHistory}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete All History
                </button>
              )}
            </div>
          </div>

          {historyLoading ? (
            <div className="text-center py-12 text-gray-500">Loading history…</div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <History size={40} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 font-medium">No ended sessions yet</p>
              <p className="text-sm text-gray-500 mt-1">Ended sessions will appear here for review and conversion.</p>
            </div>
          ) : (
            <div className="bg-surface border border-white/10 rounded-xl overflow-hidden">
              {/* Select-all row */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-white/2">
                <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white transition-colors">
                  {selectedHistoryIds.size === history.length
                    ? <CheckSquare size={16} className="text-primary" />
                    : <CheckSquare size={16} className="opacity-40" />}
                </button>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {selectedHistoryIds.size === history.length ? 'Deselect All' : 'Select All'}
                </span>
              </div>

              {history.map(h => (
                <div
                  key={h.id}
                  className={`flex items-center gap-4 px-4 py-4 border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors ${selectedHistoryIds.has(h.id) ? 'bg-primary/5' : ''}`}
                >
                  {/* Checkbox */}
                  <button onClick={() => toggleHistorySelect(h.id)} className="text-gray-500 hover:text-primary transition-colors shrink-0">
                    {selectedHistoryIds.has(h.id)
                      ? <CheckSquare size={16} className="text-primary" />
                      : <CheckSquare size={16} className="opacity-30" />}
                  </button>

                  {/* Icon */}
                  <div className="p-2 rounded-lg bg-red-500/10 text-red-400 shrink-0">
                    <Video size={16} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{h.classTitle || 'Unnamed Session'}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {h.scheduledStartTime ? new Date(h.scheduledStartTime).toLocaleDateString() : '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        Ended: {h.actualEndTime ? new Date(h.actualEndTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </span>
                      <span className="uppercase">{h.provider}</span>
                    </div>
                  </div>

                  {/* Status / Converted */}
                  <div className="shrink-0">
                    {h.convertedToRecorded ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-1">
                        <CheckCircle2 size={11} />
                        Converted
                      </span>
                    ) : (
                      <Badge variant="secondary">{h.status}</Badge>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!h.convertedToRecorded && (
                      <button
                        onClick={() => setConvertModal(h)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 rounded-lg transition-colors"
                        title="Convert to YouTube recorded class"
                      >
                        <Youtube size={12} />
                        Convert
                      </button>
                    )}
                    <button
                      onClick={() => deleteHistoryItem(h.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete from history"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}

      {startConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 to-purple-500/50" />
            <h3 className="text-xl font-bold text-white mb-2">Start Session</h3>
            <p className="text-gray-400 mb-6 text-sm">Start this live session now? Students will be allowed to join.</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setStartConfirm(null)}
                disabled={startingSession}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => performStart(startConfirm)}
                disabled={startingSession}
                className="px-4 py-2 text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors border border-blue-500/20 flex items-center gap-2 disabled:opacity-50"
              >
                {startingSession ? 'Starting…' : 'Start Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
            <h3 className="text-xl font-bold text-white mb-2">Delete Live Session</h3>
            <p className="text-gray-400 mb-6 text-sm">Are you sure you want to delete this session? This cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                Cancel
              </button>
              <button
                onClick={() => performDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {endConfirmSession && (
        <EndSessionModal
          session={endConfirmSession}
          onClose={() => setEndConfirmSession(null)}
          onConfirm={performEndWithConversion}
        />
      )}

      {convertModal && (
        <ConvertModal
          session={convertModal}
          onClose={() => setConvertModal(null)}
          onConfirm={handleConvertHistory}
        />
      )}

      {showScheduleModal && (
        <ScheduleSessionDialog
          isOpen={showScheduleModal}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => { setShowScheduleModal(false); fetchLiveSessions(); }}
          defaultProvider={scheduleProvider}
        />
      )}
    </div>
  );
};
