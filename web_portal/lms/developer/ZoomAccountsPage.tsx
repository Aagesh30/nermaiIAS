import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import api from '../core/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ZoomAccount {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  meetingSdkKey: string;
  meetingSdkSecret: string;
  s2sAccountId: string;
  s2sClientId: string;
  s2sClientSecret: string;
}

// ── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    valid: 'bg-green-500/10 text-green-500',
    invalid: 'bg-red-500/10 text-red-500',
    testing: 'bg-yellow-500/10 text-yellow-500',
    disabled: 'bg-gray-500/10 text-gray-500',
  };
  const cls = map[status.toLowerCase()] ?? 'bg-gray-500/10 text-gray-500';
  return (
    <span className={`px-2 py-1 text-xs font-bold rounded-full ${cls}`}>
      {status.toUpperCase()}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ZoomAccountsPage() {
  const [accounts, setAccounts] = useState<ZoomAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<ZoomAccount> | null>(null);
  const [saving, setSaving] = useState(false);

  // Testing state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [activeTests, setActiveTests] = useState<Record<string, {classId: string, sessionId: string, meetingId: string}>>({});

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchAccounts = async () => {
    setFetchError(null);
    setLoading(true);
    try {
      const res = await api.get('/zoom-accounts');
      setAccounts(res.data?.data || []);
    } catch (error: any) {
      console.error('Failed to fetch zoom accounts:', error);
      setFetchError(error?.response?.data?.message || 'Failed to load Zoom accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAdd = () => {
    setEditingAccount({
      name: '',
      meetingSdkKey: '',
      meetingSdkSecret: '',
      s2sAccountId: '',
      s2sClientId: '',
      s2sClientSecret: ''
    });
    setDialogOpen(true);
  };

  const handleEdit = (account: ZoomAccount) => {
    setEditingAccount({
      ...account,
      // Clear out the mask strings so the user doesn't accidentally save them
      meetingSdkKey: '',
      meetingSdkSecret: '',
      s2sAccountId: '',
      s2sClientId: '',
      s2sClientSecret: ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Zoom account?')) return;
    try {
      await api.delete(`/zoom-accounts/${id}`);
      await fetchAccounts();
    } catch (err: any) {
      console.error('Failed to delete account:', err);
      alert(err?.response?.data?.message || 'Failed to delete account.');
    }
  };

  const handleTestKey = async (id: string) => {
    setTestingId(id);
    try {
      const res = await api.post(`/zoom-accounts/${id}/test`);
      alert(res.data?.message || 'Integration test class successfully provisioned.');
      if (res.data?.data) {
        setActiveTests(prev => ({ ...prev, [id]: res.data.data }));
      }
      await fetchAccounts();
    } catch (err: any) {
      console.error('Test failed:', err);
      alert(`Test failed: ${err?.response?.data?.message || err.message}\n${err?.response?.data?.details || ''}`);
      await fetchAccounts();
    } finally {
      setTestingId(null);
    }
  };

  const handleCleanupTest = async (accountId: string) => {
    const testData = activeTests[accountId];
    if (!testData) return;
    setTestingId(accountId);
    try {
      await api.post(`/zoom-accounts/${accountId}/test-cleanup`, testData);
      alert('Test class cleaned up successfully.');
      setActiveTests(prev => {
        const next = { ...prev };
        delete next[accountId];
        return next;
      });
      await fetchAccounts();
    } catch (err: any) {
      alert('Cleanup failed: ' + (err?.response?.data?.message || err.message));
    } finally {
      setTestingId(null);
    }
  };

  const handleOpenTestClass = async (accountId: string) => {
    const testData = activeTests[accountId];
    if (!testData) return;
    try {
      const tokenRes = await api.post(`/live-sessions/${testData.sessionId}/join-token`, {});
      const token = tokenRes.data?.token || tokenRes.token;
      if (token) {
        const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://nermaiiasacademy-519c8.web.app";
        const apiBase = (api.defaults.baseURL || "http://localhost:5000/api").replace(/\/api$/, "");
        const popupUrl = `${baseOrigin}/developer/zoom-test-launch.html?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(testData.sessionId)}&apiUrl=${encodeURIComponent(apiBase)}`;
        window.open(popupUrl, '_blank');
      }
    } catch (err: any) {
      alert("Failed to open test class: " + (err?.response?.data?.message || err.message));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingAccount?.id) {
        await api.put(`/zoom-accounts/${editingAccount.id}`, editingAccount);
      } else {
        await api.post('/zoom-accounts', editingAccount);
      }
      setDialogOpen(false);
      await fetchAccounts();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save account.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 text-gray-500 dark:text-gray-400 text-sm font-medium">
        Loading Zoom SDK Accounts...
      </div>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full text-gray-900 dark:text-white">
      {/* ── Header Banner ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">
            Zoom SDK Accounts
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage your Server-to-Server OAuth and Meeting SDK credentials for Zoom live classes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAccounts}
            title="Refresh accounts"
            className="p-2.5 rounded-xl border border-gray-200 dark:border-[#8B0000]/30 text-gray-500 dark:text-gray-400 hover:border-[#8B0000]/50 hover:text-[#8B0000] dark:hover:text-[#ff8a80] transition-colors"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#8B0000] hover:bg-[#6b0000] text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            <Plus size={18} /> Add Account
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-900/50 flex gap-3">
          <AlertTriangle size={20} className="shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{fetchError}</p>
        </div>
      )}

      {/* ── Account List ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.length === 0 ? (
          <div className="col-span-full p-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 border-dashed">
            No Zoom accounts configured yet.
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc.id} className="flex flex-col bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg mb-1">{acc.name}</h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400">ID: {acc.id}</div>
                </div>
                <StatusBadge status={acc.status} />
              </div>
              <div className="p-5 flex-1 space-y-3">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div className="font-medium text-xs text-gray-400 uppercase tracking-wider mb-1">SDK Key</div>
                  <div className="font-mono bg-gray-50 dark:bg-black/20 p-2 rounded text-xs">{acc.meetingSdkKey || 'Not set'}</div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  <div className="font-medium text-xs text-gray-400 uppercase tracking-wider mb-1">S2S Client ID</div>
                  <div className="font-mono bg-gray-50 dark:bg-black/20 p-2 rounded text-xs">{acc.s2sClientId || 'Not set'}</div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-[#151525] border-t border-gray-100 dark:border-white/5 flex flex-col gap-3">
                <div className="flex gap-2 justify-end w-full">
                  {!activeTests[acc.id] ? (
                    <button
                      onClick={() => handleTestKey(acc.id)}
                      disabled={testingId === acc.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-xs font-semibold rounded-lg transition-colors mr-auto disabled:opacity-50"
                    >
                      <ShieldCheck size={14} />
                      {testingId === acc.id ? 'Testing...' : 'Test Key'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 mr-auto">
                      <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <ShieldCheck size={14} /> Test Class Created
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleEdit(acc)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 bg-white dark:bg-black/20 rounded-md shadow-sm border border-gray-200 dark:border-white/10 transition-colors"
                    title="Edit Account"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 bg-white dark:bg-black/20 rounded-md shadow-sm border border-gray-200 dark:border-white/10 transition-colors"
                    title="Delete Account"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                {activeTests[acc.id] && (
                  <div className="flex gap-2 w-full pt-2 border-t border-gray-200 dark:border-white/10">
                    <button
                      onClick={() => handleOpenTestClass(acc.id)}
                      className="flex-1 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 text-xs font-bold rounded-lg transition-colors text-center"
                    >
                      Open Test Class
                    </button>
                    <button
                      onClick={() => handleCleanupTest(acc.id)}
                      disabled={testingId === acc.id}
                      className="flex-1 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 text-xs font-bold rounded-lg transition-colors text-center disabled:opacity-50"
                    >
                      End Test Class
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Dialog ── */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50 dark:bg-black/20">
              <h2 className="text-xl font-bold">{editingAccount?.id ? 'Edit Zoom Account' : 'Add Zoom Account'}</h2>
              <button type="button" onClick={() => setDialogOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4 pt-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl text-sm text-blue-800 dark:text-blue-200 mb-6">
              <h4 className="font-bold mb-2 flex items-center gap-2"><ShieldCheck size={16} /> How to configure Zoom Credentials</h4>
              <ol className="list-decimal pl-5 space-y-1 mb-3 text-xs opacity-90">
                <li>Go to Zoom App Marketplace and create a <strong>Server-to-Server OAuth</strong> app to get your Account ID, Client ID, and Client Secret.</li>
                <li>Create a <strong>Meeting SDK</strong> app to get your SDK Key and SDK Secret.</li>
              </ol>
              <h5 className="font-bold text-xs mb-1">Required Scopes to Enable (S2S OAuth App):</h5>
              <div className="bg-white/60 dark:bg-black/30 rounded border border-blue-200/50 dark:border-blue-800/30 p-2 max-h-32 overflow-y-auto">
                <ul className="list-disc pl-4 text-[10px] font-mono opacity-80 grid grid-cols-1 gap-x-4">
                  <li>meeting:write:registrant:admin</li>
                  <li>meeting:write:open_app:admin</li>
                  <li>meeting:write:batch_registrants:admin</li>
                  <li className="font-bold text-blue-700 dark:text-blue-300">meeting:write:meeting:admin</li>
                  <li>meeting:write:template:admin</li>
                  <li>meeting:write:poll:admin</li>
                  <li>meeting:write:invite_links:admin</li>
                  <li>meeting:write:batch_polls:admin</li>
                  <li>meeting:delete:meeting:admin</li>
                  <li>meeting:delete:poll:admin</li>
                  <li>meeting:delete:survey:admin</li>
                  <li>meeting:delete:live_meeting_chat_message:admin</li>
                  <li>meeting:write:sip_dialing:admin</li>
                  <li>meeting:delete:open_app:admin</li>
                  <li>meeting:delete:registrant:admin</li>
                  <li>meeting:update:meeting:admin</li>
                  <li>meeting:update:registrant_status:admin</li>
                  <li>meeting:update:in_meeting_controls:admin</li>
                  <li>meeting:update:livestream:admin</li>
                  <li>meeting:update:livestream_status:admin</li>
                  <li>meeting:update:poll:admin</li>
                  <li>meeting:update:registration_question:admin</li>
                  <li>meeting:update:status:admin</li>
                  <li>meeting:update:survey:admin</li>
                  <li>meeting:update:live_meeting_chat_message:admin</li>
                  <li>meeting:read:meeting:admin</li>
                  <li className="font-bold text-blue-700 dark:text-blue-300">meeting:read:meeting:master</li>
                  <li>meeting:update:participant_rtms_app_status:admin</li>
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Friendly Name</label>
                <input
                  type="text"
                  required
                  value={editingAccount?.name || ''}
                  onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  className="w-full bg-white dark:bg-[#0B0B14] border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-transparent transition-all"
                  placeholder="e.g. Primary Academic Zoom"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-100 dark:border-white/10 pb-2">Meeting SDK Credentials</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">SDK Key</label>
                    <input
                      type="text"
                      value={editingAccount?.meetingSdkKey || ''}
                      onChange={e => setEditingAccount({ ...editingAccount, meetingSdkKey: e.target.value })}
                      className="w-full bg-white dark:bg-[#0B0B14] border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000] font-mono"
                      placeholder={editingAccount?.id ? '(unchanged)' : 'Enter SDK Key'}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">SDK Secret</label>
                    <input
                      type="password"
                      value={editingAccount?.meetingSdkSecret || ''}
                      onChange={e => setEditingAccount({ ...editingAccount, meetingSdkSecret: e.target.value })}
                      className="w-full bg-white dark:bg-[#0B0B14] border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000] font-mono"
                      placeholder={editingAccount?.id ? '(unchanged)' : 'Enter SDK Secret'}
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-100 dark:border-white/10 pb-2">Server-to-Server OAuth</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Account ID</label>
                    <input
                      type="text"
                      value={editingAccount?.s2sAccountId || ''}
                      onChange={e => setEditingAccount({ ...editingAccount, s2sAccountId: e.target.value })}
                      className="w-full bg-white dark:bg-[#0B0B14] border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000] font-mono"
                      placeholder={editingAccount?.id ? '(unchanged)' : 'Enter Account ID'}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Client ID</label>
                    <input
                      type="text"
                      value={editingAccount?.s2sClientId || ''}
                      onChange={e => setEditingAccount({ ...editingAccount, s2sClientId: e.target.value })}
                      className="w-full bg-white dark:bg-[#0B0B14] border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000] font-mono"
                      placeholder={editingAccount?.id ? '(unchanged)' : 'Enter Client ID'}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Client Secret</label>
                    <input
                      type="password"
                      value={editingAccount?.s2sClientSecret || ''}
                      onChange={e => setEditingAccount({ ...editingAccount, s2sClientSecret: e.target.value })}
                      className="w-full bg-white dark:bg-[#0B0B14] border border-gray-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000] font-mono"
                      placeholder={editingAccount?.id ? '(unchanged)' : 'Enter Client Secret'}
                      autoComplete="new-password"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDialogOpen(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 hover:bg-gray-200 text-sm font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#8B0000] hover:bg-[#6b0000] text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
