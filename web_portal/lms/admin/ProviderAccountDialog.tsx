import React, { useState, useEffect } from 'react';
import { EyeOff, ShieldCheck } from 'lucide-react';
import { Dialog } from '../components/ui/Dialog';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { ProviderAccountsApi } from '../core/services';

// ── Types ────────────────────────────────────────────────────────────────────

type ProviderType = 'zoom' | 'google_meet' | 'youtube' | 'teams' | 'webex' | 'bbb';
type ProviderStatus = 'healthy' | 'busy' | 'rate_limited' | 'disconnected' | 'credential_expired' | 'disabled';

interface ProviderAccountDialogProps {
  isOpen: boolean;
  account?: any | null; // null = create mode, object = edit mode
  onClose: () => void;
  onSaved: () => void;
}

// Sentinel — if a secret field still shows this value the user did not touch it,
// so we must NOT send it to the backend (avoids overwriting encrypted value with '***').
const MASKED_PLACEHOLDER = '***';

const PROVIDER_LABELS: Record<ProviderType, string> = {
  zoom: 'Zoom',
  google_meet: 'Google Meet',
  youtube: 'YouTube',
  teams: 'Microsoft Teams',
  webex: 'Cisco Webex',
  bbb: 'BigBlueButton',
};

const STATUS_LABELS: Record<ProviderStatus, string> = {
  healthy: 'Healthy',
  busy: 'Busy',
  rate_limited: 'Rate Limited',
  disconnected: 'Disconnected',
  credential_expired: 'Credential Expired',
  disabled: 'Disabled',
};

// ── Form state helpers ────────────────────────────────────────────────────────

interface FormState {
  displayName: string;
  provider: ProviderType;
  isActive: boolean;
  maxConcurrentMeetings: number;
  priority: number;
  status: ProviderStatus;
  // Credential fields — always start from empty for create, from masked for edit
  clientId: string;
  accountId: string;
  clientSecret: string;
  sdkKey: string;
  sdkSecret: string;
  hostKey: string;
  refreshToken: string;
}

function emptyForm(): FormState {
  return {
    displayName: '',
    provider: 'zoom',
    isActive: true,
    maxConcurrentMeetings: 2,
    priority: 0,
    status: 'healthy',
    clientId: '',
    accountId: '',
    clientSecret: '',
    sdkKey: '',
    sdkSecret: '',
    hostKey: '',
    refreshToken: '',
  };
}

function formFromAccount(account: any): FormState {
  return {
    displayName: account.displayName || account.name || '',
    provider: account.provider || 'zoom',
    isActive: account.isActive ?? true,
    maxConcurrentMeetings: account.maxConcurrentMeetings ?? 2,
    priority: account.priority ?? 0,
    status: account.status || 'healthy',
    // Credentials come back stripped by the backend — clientId/accountId show as '***',
    // secret fields are not included at all (undefined). We pre-fill '***' so the user
    // sees that something is stored without ever seeing the real value.
    clientId: account.credentials?.clientId ? MASKED_PLACEHOLDER : '',
    accountId: account.credentials?.accountId ? MASKED_PLACEHOLDER : '',
    clientSecret: account.credentials?.clientSecret ? MASKED_PLACEHOLDER : '',
    sdkKey: account.credentials?.sdkKey ? MASKED_PLACEHOLDER : '',
    sdkSecret: account.credentials?.sdkSecret ? MASKED_PLACEHOLDER : '',
    hostKey: account.credentials?.hostKey ? MASKED_PLACEHOLDER : '',
    refreshToken: account.credentials?.refreshToken ? MASKED_PLACEHOLDER : '',
  };
}

// ── Label component ───────────────────────────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode; htmlFor?: string }> = ({ children, htmlFor }) => (
  <label htmlFor={htmlFor} className="block text-xs font-semibold text-textSecondary mb-1 uppercase tracking-wide">
    {children}
  </label>
);

// ── Main Component ────────────────────────────────────────────────────────────

export const ProviderAccountDialog: React.FC<ProviderAccountDialogProps> = ({
  isOpen,
  account,
  onClose,
  onSaved,
}) => {
  const isEditMode = Boolean(account?.id);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-initialise form whenever the dialog opens or the target account changes
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setForm(isEditMode && account ? formFromAccount(account) : emptyForm());
    }
  }, [isOpen, account]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.type === 'number'
        ? Number(e.target.value)
        : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Build the credentials object — only include a field if it was actually edited
  // (i.e. it differs from the masked placeholder). Never send '***' to the backend.
  const buildCredentials = (): Record<string, string> => {
    const creds: Record<string, string> = {};
    const fields: Array<keyof FormState> = [
      'clientId', 'accountId', 'clientSecret', 'sdkKey', 'sdkSecret', 'hostKey', 'refreshToken',
    ];
    for (const f of fields) {
      const val = form[f] as string;
      if (val && val !== MASKED_PLACEHOLDER) {
        creds[f] = val;
      }
    }
    return creds;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    const credentials = buildCredentials();

    const payload: any = {
      displayName: form.displayName.trim(),
      provider: form.provider,
      isActive: form.isActive,
      maxConcurrentMeetings: form.maxConcurrentMeetings,
      priority: form.priority,
      status: form.status,
    };

    // Only include credentials if the user provided at least one value
    if (Object.keys(credentials).length > 0) {
      payload.credentials = credentials;
    }

    setLoading(true);
    try {
      if (isEditMode) {
        await ProviderAccountsApi.updateAccount(account.id, payload);
      } else {
        await ProviderAccountsApi.createAccount(payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save account. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Credential section shown per provider
  const showZoomCreds = form.provider === 'zoom';
  const showGoogleCreds = form.provider === 'google_meet';
  const showGenericCreds = !showZoomCreds && !showGoogleCreds;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Provider Account' : 'Add Provider Account'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Error Banner ──────────────────────────────────────────── */}
        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3">
            {error}
          </div>
        )}

        {/* ── Section: Basic Info ───────────────────────────────────── */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-textSecondary mb-3 pb-1 border-b border-border">
            Account Details
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel htmlFor="pa-displayName">Display Name *</FieldLabel>
              <Input
                id="pa-displayName"
                type="text"
                required
                placeholder="e.g. Zoom – Physics Department"
                value={form.displayName}
                onChange={set('displayName')}
              />
            </div>
            <div>
              <FieldLabel htmlFor="pa-provider">Provider Type *</FieldLabel>
              <Select id="pa-provider" value={form.provider} onChange={set('provider')} required>
                {(Object.entries(PROVIDER_LABELS) as [ProviderType, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="pa-status">Status</FieldLabel>
              <Select id="pa-status" value={form.status} onChange={set('status')}>
                {(Object.entries(STATUS_LABELS) as [ProviderStatus, string][]).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="pa-maxConcurrent">Max Concurrent Sessions *</FieldLabel>
              <Input
                id="pa-maxConcurrent"
                type="number"
                min={1}
                max={200}
                required
                value={form.maxConcurrentMeetings}
                onChange={set('maxConcurrentMeetings')}
              />
            </div>
            <div>
              <FieldLabel htmlFor="pa-priority">Priority (lower = preferred)</FieldLabel>
              <Input
                id="pa-priority"
                type="number"
                min={0}
                value={form.priority}
                onChange={set('priority')}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 mt-4 cursor-pointer w-fit select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={e => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
            />
            <span className="text-sm text-textPrimary">Enable for automatic session assignment</span>
          </label>
        </div>

        {/* ── Section: Credentials ──────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3 pb-1 border-b border-border">
            <ShieldCheck size={13} className="text-textSecondary" />
            <p className="text-xs font-bold uppercase tracking-widest text-textSecondary">
              API Credentials
              <span className="ml-2 normal-case font-normal tracking-normal text-[10px] text-textSecondary/70">
                Encrypted at rest · Secrets masked in UI
              </span>
            </p>
          </div>

          {/* Masked-value notice for edit mode */}
          {isEditMode && (
            <div className="flex items-start gap-2 rounded-lg bg-surfaceHighlight border border-border text-xs text-textSecondary px-3 py-2.5 mb-4">
              <EyeOff size={13} className="mt-0.5 shrink-0 text-textSecondary/70" />
              <span>
                Existing secret values are masked. Leave a field showing <code className="font-mono">***</code> to keep the current stored value unchanged. Clear it and enter a new value to replace it.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Fields common to all providers */}
            <div>
              <FieldLabel htmlFor="pa-clientId">Client ID</FieldLabel>
              <Input
                id="pa-clientId"
                type="text"
                autoComplete="off"
                placeholder="Client ID"
                value={form.clientId}
                onChange={set('clientId')}
              />
            </div>
            <div>
              <FieldLabel htmlFor="pa-accountId">Account ID</FieldLabel>
              <Input
                id="pa-accountId"
                type="text"
                autoComplete="off"
                placeholder="Account / Organisation ID"
                value={form.accountId}
                onChange={set('accountId')}
              />
            </div>
            <div>
              <FieldLabel htmlFor="pa-clientSecret">Client Secret</FieldLabel>
              <Input
                id="pa-clientSecret"
                type="password"
                autoComplete="new-password"
                placeholder="Client Secret"
                value={form.clientSecret}
                onChange={set('clientSecret')}
              />
            </div>

            {/* Zoom-specific fields */}
            {showZoomCreds && (
              <>
                <div>
                  <FieldLabel htmlFor="pa-sdkKey">Meeting SDK Key</FieldLabel>
                  <Input
                    id="pa-sdkKey"
                    type="password"
                    autoComplete="new-password"
                    placeholder="SDK Key"
                    value={form.sdkKey}
                    onChange={set('sdkKey')}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="pa-sdkSecret">Meeting SDK Secret</FieldLabel>
                  <Input
                    id="pa-sdkSecret"
                    type="password"
                    autoComplete="new-password"
                    placeholder="SDK Secret"
                    value={form.sdkSecret}
                    onChange={set('sdkSecret')}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="pa-hostKey">Host Key (optional)</FieldLabel>
                  <Input
                    id="pa-hostKey"
                    type="password"
                    autoComplete="new-password"
                    placeholder="6-digit Host Key"
                    value={form.hostKey}
                    onChange={set('hostKey')}
                  />
                </div>
              </>
            )}

            {/* Google Meet – OAuth refresh token */}
            {showGoogleCreds && (
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="pa-refreshToken">OAuth Refresh Token</FieldLabel>
                <Input
                  id="pa-refreshToken"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Refresh Token"
                  value={form.refreshToken}
                  onChange={set('refreshToken')}
                />
              </div>
            )}

            {/* Generic / other providers — show all fields */}
            {showGenericCreds && (
              <>
                <div>
                  <FieldLabel htmlFor="pa-sdkKey-g">SDK / API Key</FieldLabel>
                  <Input
                    id="pa-sdkKey-g"
                    type="password"
                    autoComplete="new-password"
                    placeholder="SDK / API Key"
                    value={form.sdkKey}
                    onChange={set('sdkKey')}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="pa-sdkSecret-g">SDK / API Secret</FieldLabel>
                  <Input
                    id="pa-sdkSecret-g"
                    type="password"
                    autoComplete="new-password"
                    placeholder="SDK / API Secret"
                    value={form.sdkSecret}
                    onChange={set('sdkSecret')}
                  />
                </div>
              </>
            )}

          </div>
        </div>

        {/* ── Footer Actions ────────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={loading}>
            {isEditMode ? 'Save Changes' : 'Add Account'}
          </Button>
        </div>

      </form>
    </Dialog>
  );
};
