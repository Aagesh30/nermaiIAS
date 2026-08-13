import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ProviderAccount {
  id: string;
  provider: string;
  name: string;
  credentials: any;
  secretStatus: string;
  status: string;
  priority: number;
  maxConcurrentMeetings: number;
  currentRunningMeetings: number;
}

export default function ProviderAccountsPage() {
  const [accounts, setAccounts] = useState<ProviderAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('/api/v1/provider-accounts');
      setAccounts(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500 dark:text-gray-400 text-sm font-medium">Loading Provider Accounts...</div>;
  }

  return (
    <div className="space-y-6 w-full text-gray-900 dark:text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">Provider Credential Management</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage Zoom and Google Meet API credentials for live sessions.</p>
        </div>
        <button className="bg-[#8B0000] hover:bg-[#8B0000]/90 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all flex items-center gap-2">
          + Add Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(account => (
          <div key={account.id} className="bg-white dark:bg-[#1a1a2e] rounded-2xl p-6 border border-gray-200 dark:border-[#8B0000]/30 shadow-sm hover:border-[#8B0000]/50 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">{account.name} ({account.provider})</h3>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                  account.status === 'healthy' ? 'bg-green-500/10 text-green-500' :
                  account.status === 'busy' ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  {account.status.toUpperCase()}
                </span>
              </div>
              
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Secret Status</p>
                  <p className="font-mono text-sm text-gray-800 dark:text-gray-300 capitalize mt-0.5">{account.secretStatus}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Capacity</p>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mt-1 border border-gray-200 dark:border-transparent">
                    <div 
                      className="bg-[#8B0000] dark:bg-[#ff8a80] h-2.5 rounded-full" 
                      style={{ width: `${Math.min(100, (account.currentRunningMeetings / account.maxConcurrentMeetings) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-right text-gray-500 dark:text-gray-400 mt-1 font-medium">{account.currentRunningMeetings} / {account.maxConcurrentMeetings} Active</p>
                </div>
                
                <div className="pt-3 border-t border-gray-100 dark:border-white/10">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Masked Credentials</p>
                  <code className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/20 p-3 block rounded-xl break-all">
                    Client ID: {account.credentials?.clientId || 'N/A'}<br/>
                    Account ID: {account.credentials?.accountId || 'N/A'}
                  </code>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-white/10 mt-auto">
              <button className="flex-1 px-3 py-2 bg-gray-50 hover:bg-gray-150 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-850 dark:text-gray-200 rounded-xl text-xs font-bold border border-gray-250 dark:border-transparent transition-colors">
                Rotate Secrets
              </button>
              <button className="flex-1 px-3 py-2 bg-gray-50 hover:bg-gray-150 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-850 dark:text-gray-200 rounded-xl text-xs font-bold border border-gray-250 dark:border-transparent transition-colors">
                Assignments
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


