import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ProviderAccountsApi } from '../core/services';
import { ProviderAccountDialog } from './ProviderAccountDialog';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProviderAccount {
  id: string;
  provider: string;
  displayName?: string;
  name?: string;
  credentials: any;
  secretStatus?: string;
  status: string;
  priority: number;
  maxConcurrentMeetings: number;
  currentRunningMeetings: number;
  isActive?: boolean;
  healthStatus?: string;
}

// ── Status badge helper ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    healthy: 'bg-green-500/10 text-green-500',
    busy: 'bg-yellow-500/10 text-yellow-500',
    rate_limited: 'bg-orange-500/10 text-orange-500',
    credential_expired: 'bg-red-500/10 text-red-500',
    disconnected: 'bg-red-500/10 text-red-500',
    disabled: 'bg-gray-500/10 text-gray-500',
  };
  const cls = map[status] ?? 'bg-gray-500/10 text-gray-500';
  return (
    <span className={`px-2 py-1 text-xs font-bold rounded-full ${cls}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProviderAccountsPage() {
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ProviderAccount | null>(null);

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchAccounts = async () => {
    setFetchError(null);
    setLoading(true);
    try {
      const res = await ProviderAccountsApi.listAccounts();
      setAccounts((res.data?.data ?? res.data) || []);
    } catch (error: any) {
      console.error('Failed to fetch provider accounts:', error);
      setFetchError(error?.response?.data?.message || error?.message || 'Failed to load provider accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAdd = () => {
    setEditingAccount(null);
    setDialogOpen(true);
  };

  const handleEdit = (account: ProviderAccount) => {
    setEditingAccount(account);
    setDialogOpen(true);
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      await ProviderAccountsApi.deleteAccount(deleteConfirmId);
      setDeleteConfirmId(null);
      await fetchAccounts();
    } catch (err: any) {
      console.error('Failed to delete provider account:', err);
      alert(err?.response?.data?.message || err?.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogSaved = () => {
    fetchAccounts();
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const getDisplayName = (account: ProviderAccount) =>
    account.displayName || account.name || account.provider;

  // ── Loading State ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 text-gray-500 dark:text-gray-400 text-sm font-medium">
        Loading Provider Accounts...
      </div>
    );
  }

  // ── Main Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full text-gray-900 dark:text-white">

      {/* ── Header Banner (preserves existing layout + adds functional Add button) ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">
            Provider Credential Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage Zoom and Google Meet API credentials for live sessions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAccounts}
            title="Refresh accounts"
            className="p-2.5 rounded-xl border border-gray-200 dark:border-[#8B0000]/30 text-gray-500 dark:text-gray-400 hover:border-[#8B0000]/50 hover:text-[#8B0000] dark:hover:text-[#ff8a80] transition-colors"
          >
            <RefreshCw size={16} />
          </button>
          <button
            id="add-provider-account-btn"
            onClick={handleAdd}
            className="bg-[#8B0000] hover:bg-[#8B0000]/90 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Add Account
          </button>
        </div>
      </div>

      {/* ── Fetch Error ──────────────────────────────────────────────────────── */}
      {fetchError && (
        <div className="flex items-start gap-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* ── Empty State ───────────────────────────────────────────────────────── */}
      {!fetchError && accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 py-16 px-8 text-center">
          <ShieldCheck size={40} className="text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">
            No Provider Accounts
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">
            Add your Zoom, Google Meet or other provider credentials to enable automatic session creation.
          </p>
          <button
            onClick={handleAdd}
            className="bg-[#8B0000] hover:bg-[#8B0000]/90 text-white px-5 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Add Account
          </button>
        </div>
      )}

      {/* ── Account Cards Grid (preserves existing card layout + adds Edit/Delete) ── */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map(account => (
            <div
              key={account.id}
              className={`bg-white dark:bg-[#1a1a2e] rounded-2xl p-6 border ${
                account.isActive === false
                  ? 'border-red-500/20 opacity-75'
                  : 'border-gray-200 dark:border-[#8B0000]/30 hover:border-[#8B0000]/50'
              } shadow-sm transition-colors flex flex-col justify-between relative`}
            >
              {/* Disabled badge overlay */}
              {account.isActive === false && (
                <div className="absolute top-3 right-3 bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Disabled
                </div>
              )}

              {/* ── Card Top Section ──────────────────────────────────────── */}
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize leading-tight">
                      {getDisplayName(account)}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
                      {account.provider.replace('_', ' ')}
                    </p>
                  </div>
                  <StatusBadge status={account.status} />
                </div>

                <div className="space-y-3 mb-6">
                  {/* Secret status (existing field) */}
                  {account.secretStatus && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Secret Status
                      </p>
                      <p className="font-mono text-sm text-gray-800 dark:text-gray-300 capitalize mt-0.5">
                        {account.secretStatus}
                      </p>
                    </div>
                  )}

                  {/* Capacity bar (existing) */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Capacity
                    </p>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mt-1 border border-gray-200 dark:border-transparent">
                      <div
                        className={`h-2.5 rounded-full ${
                          account.currentRunningMeetings >= account.maxConcurrentMeetings
                            ? 'bg-red-500'
                            : 'bg-[#8B0000] dark:bg-[#ff8a80]'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (account.currentRunningMeetings / account.maxConcurrentMeetings) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1 font-medium">
                      {account.currentRunningMeetings} / {account.maxConcurrentMeetings} Active
                    </p>
                  </div>

                  {/* Masked Credentials (existing) */}
                  <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                      Masked Credentials
                    </p>
                    <code className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/20 p-3 block rounded-xl break-all">
                      Client ID: {account.credentials?.clientId || 'N/A'}
                      <br />
                      Account ID: {account.credentials?.accountId || 'N/A'}
                    </code>
                  </div>
                </div>
              </div>

              {/* ── Card Actions ──────────────────────────────────────────── */}
              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-white/10 mt-auto">
                {/* Edit button (new, functional) */}
                <button
                  id={`edit-provider-${account.id}`}
                  onClick={() => handleEdit(account)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold border border-gray-200 dark:border-transparent transition-colors"
                >
                  <Edit2 size={12} />
                  Edit
                </button>

                {/* Delete button (new, functional) */}
                <button
                  id={`delete-provider-${account.id}`}
                  onClick={() => handleDeleteRequest(account.id)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-red-500/10 dark:bg-gray-800 dark:hover:bg-red-500/10 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 rounded-xl text-xs font-bold border border-gray-200 dark:border-transparent transition-colors"
                  title="Delete account"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a2e] rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-2xl p-6 w-full max-w-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="mt-0.5 p-2 rounded-full bg-red-500/10">
                <AlertTriangle size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Delete Provider Account</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  This account will be permanently removed. Any live sessions currently using it may fail. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-provider-btn"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Provider Account Dialog (create / edit) ───────────────────────────── */}
      <ProviderAccountDialog
        isOpen={dialogOpen}
        account={editingAccount}
        onClose={() => setDialogOpen(false)}
        onSaved={handleDialogSaved}
      />
    </div>
  );
}
