import React, { useState, useEffect } from 'react';
import { StudentApi, BatchApi } from '../core/services';
import { AdminTable, AdminInput, AdminSelect, AdminButton, AdminModal } from '../components/admin-ui';
import { Upload, Trash2, ShieldCheck, QrCode, Search, Users, Clock, CheckCircle2, XCircle, AlertCircle, Eye, Check, X, Download } from 'lucide-react';

// Real-time ticking countdown cell for the table
const TimerCountdownCell = ({ enabledAt, duration, unit }: { enabledAt: string; duration: number; unit: string }) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const enabledAtTime = new Date(enabledAt).getTime();
    const durationMs = duration * (unit === 'minutes' ? 60 : 3600) * 1000;
    const expiryTime = enabledAtTime + durationMs;

    const tick = () => {
      const diff = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setTimeLeft(diff);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [enabledAt, duration, unit]);

  if (timeLeft <= 0) {
    return <span className="text-red-500 font-semibold">Expired</span>;
  }

  const hrs = Math.floor(timeLeft / 3600);
  const mins = Math.floor((timeLeft % 3600) / 60);
  const secs = timeLeft % 60;
  const timeString = hrs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;

  return (
    <span className="text-green-400 font-semibold">
      Enabled ({timeString})
    </span>
  );
};

export const QRCodePermissionsPage = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // QR code upload states
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [timerDuration, setTimerDuration] = useState<number>(24);
  const [timerUnit, setTimerUnit] = useState<string>('hours');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Selected batch for bulk action
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');

  // Payment Acknowledgements States
  const [acknowledgements, setAcknowledgements] = useState<any[]>([]);
  const [ackFilter, setAckFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [ackLoading, setAckLoading] = useState(false);
  const [expandedAckId, setExpandedAckId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [studRes, batchRes, settingsRes] = await Promise.all([
        StudentApi.listStudents(),
        BatchApi.listBatches(),
        StudentApi.getQrSettings()
      ]);
      setStudents(studRes.data?.data || []);
      setBatches(batchRes.data?.data || []);
      
      const settings = settingsRes.data?.data;
      if (settings) {
        setQrCodeUrl(settings.qrCodeUrl || null);
        setTimerDuration(settings.timerDuration !== undefined ? Number(settings.timerDuration) : 24);
        setTimerUnit(settings.timerUnit || 'hours');
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAcknowledgements = async () => {
    setAckLoading(true);
    try {
      const res = await StudentApi.listPaymentAcknowledgements(ackFilter);
      setAcknowledgements(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch acknowledgements', err);
    } finally {
      setAckLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAcknowledgements();
  }, [ackFilter]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      setQrCodeUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteQrCode = () => {
    if (window.confirm('Are you sure you want to delete the QR Code? Students will not be able to scan until you upload a new one.')) {
      setQrCodeUrl(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      await StudentApi.updateQrSettings({
        qrCodeUrl,
        timerDuration,
        timerUnit
      });
      alert('QR Code settings saved successfully!');
      fetchData();
    } catch (err) {
      console.error('Failed to save QR settings', err);
      alert('Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSinglePermission = async (studentId: string, enabled: boolean) => {
    try {
      await StudentApi.updateStudentQrPermission(studentId, enabled);
      fetchData();
    } catch (err) {
      console.error('Failed to update student QR permission', err);
      alert('Failed to update student permission.');
    }
  };

  const handleBulkEnable = async (type: 'batch' | 'paid' | 'free' | 'requested') => {
    if (type === 'batch' && !selectedBatchId) {
      return alert('Please select a batch first.');
    }
    
    const messages = {
      batch: 'Are you sure you want to enable QR access for all active students in this batch?',
      paid: 'Are you sure you want to enable QR access for all Paid tier students?',
      free: 'Are you sure you want to enable QR access for all Free tier students?',
      requested: 'Are you sure you want to enable QR access for all students with pending requests?'
    };

    if (!window.confirm(messages[type])) return;

    setBulkActionLoading(true);
    try {
      const res = await StudentApi.enableQrBulk({
        type,
        batchId: type === 'batch' ? selectedBatchId : undefined
      });
      alert(`Access enabled for ${res.data?.data?.count || 0} students!`);
      fetchData();
    } catch (err) {
      console.error('Bulk action failed', err);
      alert('Bulk action failed.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleUpdateAckStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!window.confirm(`Are you sure you want to mark this transaction as ${status}?`)) return;

    setActionLoading(id);
    try {
      await StudentApi.updatePaymentAcknowledgementStatus(id, status);
      alert(`Transaction reference status updated to ${status}!`);
      
      // Reload both lists
      fetchAcknowledgements();
      fetchData();
    } catch (err) {
      console.error('Failed to update acknowledgement status', err);
      alert('Failed to update transaction status.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadProof = (ack: any) => {
    const link = document.createElement('a');
    link.href = ack.screenshotUrl;
    
    // Format date as YYYY-MM-DD
    const dateStr = ack.submittedAt ? ack.submittedAt.split('T')[0] : new Date().toISOString().split('T')[0];
    const rollNo = ack.rollNumber || 'unknown';
    
    // Set descriptive filename: PaymentProof_RollNumber_YYYY-MM-DD.jpg
    link.download = `PaymentProof_${rollNo}_${dateStr}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 1. Calculate Request Counts
  const requestCount = students.filter(s => s.qrCodeRequested === true).length;
  const pendingAckCount = acknowledgements.filter(a => a.status === 'pending').length;

  // 2. Filter & Sort Students
  // - Students who requested show on top
  const filteredStudents = students
    .filter(s => 
      s.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rollNo?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aRequested = a.qrCodeRequested === true ? 1 : 0;
      const bRequested = b.qrCodeRequested === true ? 1 : 0;
      
      // Sort by requested status first
      if (bRequested !== aRequested) {
        return bRequested - aRequested;
      }
      
      // Secondary sort: timestamp of request if available
      if (aRequested && bRequested) {
        return new Date(b.qrCodeRequestedAt || 0).getTime() - new Date(a.qrCodeRequestedAt || 0).getTime();
      }
      
      // Default fallback: name
      return (a.displayName || '').localeCompare(b.displayName || '');
    });

  const columns = [
    { 
      key: 'rollNo', 
      label: 'Roll No', 
      render: (val: string) => val || <span className="text-gray-500 italic">Unassigned</span> 
    },
    { 
      key: 'displayName', 
      label: 'Name',
      render: (val: string, row: any) => (
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-900 dark:text-white">{val}</span>
          {row.qrCodeRequested === true && (
            <span className="bg-red-500/20 text-red-650 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30">
              Requested
            </span>
          )}
        </div>
      )
    },
    {
      key: 'accessTier',
      label: 'Tier',
      render: (val: string) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${['online','offline','recorded','paid'].includes(val || '') ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-gray-500/20 text-gray-400'}`}>
          {(val || 'free').toUpperCase()}
        </span>
      )
    },
    {
      key: 'qrCodeEnabled',
      label: 'Permission Status',
      render: (val: boolean, row: any) => {
        if (val && row.qrCodeEnabledAt) {
          return (
            <TimerCountdownCell 
              enabledAt={row.qrCodeEnabledAt} 
              duration={timerDuration} 
              unit={timerUnit} 
            />
          );
        }
        return <span className="text-gray-500 font-medium">Disabled</span>;
      }
    },
    {
      key: 'actions',
      label: 'Permissions Action',
      render: (_: any, row: any) => {
        // Check if QR permission is active
        const isCurrentlyEnabled = row.qrCodeEnabled && row.qrCodeEnabledAt && (
          (new Date(row.qrCodeEnabledAt).getTime() + timerDuration * (timerUnit === 'minutes' ? 60 : 3600) * 1000) > Date.now()
        );

        return (
          <div className="flex gap-2">
            <button 
              onClick={() => handleSinglePermission(row.id, true)} 
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                isCurrentlyEnabled 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400 cursor-default' 
                  : 'border-[#8B0000]/30 text-[#8B0000] dark:border-[#ff8a80]/30 dark:text-[#ff8a80] hover:bg-[#8B0000]/10'
              }`}
              disabled={isCurrentlyEnabled}
            >
              {row.qrCodeRequested ? 'Approve & Enable' : 'Enable'}
            </button>
            <button 
              onClick={() => handleSinglePermission(row.id, false)} 
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                !isCurrentlyEnabled 
                  ? 'border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-505 cursor-default' 
                  : 'border-red-500/30 text-red-550 dark:text-red-400 hover:bg-red-500/10'
              }`}
              disabled={!isCurrentlyEnabled}
            >
              Disable
            </button>
          </div>
        )
      }
    }
  ];

  return (
    <div className="space-y-6 w-full text-gray-900 dark:text-white">
      
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1 flex items-center gap-3">
            <QrCode className="text-[#8B0000] dark:text-[#ff8a80]" />
            QR Code Permissions
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage payment QR code uploads and student fees permissions.</p>
        </div>
        
        {/* Top Corner Request Counts Badge */}
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-[#0f0f1a] p-4 rounded-xl border border-gray-200 dark:border-[#8B0000]/20">
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Active Requests</div>
            <div className="text-2xl font-black text-[#8B0000] dark:text-[#ff8a80]">{requestCount}</div>
          </div>
          <div className="h-10 w-[1px] bg-gray-250 dark:bg-[#8B0000]/20" />
          <div className="p-2 bg-[#8B0000]/10 rounded-lg text-[#8B0000] dark:text-[#ff8a80]">
            <Users size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: QR Code Configuration */}
        <div className="lg:col-span-1 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Upload size={18} className="text-[#8B0000] dark:text-[#ff8a80]" />
            Upload Payment QR Code
          </h2>
          
          <form onSubmit={handleSaveSettings} className="space-y-4">
            
            {/* QR Image Viewport */}
            <div className="relative border border-dashed border-gray-300 dark:border-[#8B0000]/30 bg-gray-50 dark:bg-[#0f0f1a] rounded-xl p-4 flex flex-col items-center justify-center min-h-[220px]">
              {qrCodeUrl ? (
                <div className="space-y-3 w-full text-center">
                  <img 
                    src={qrCodeUrl} 
                    alt="Uploaded Payment QR Code" 
                    className="max-h-[160px] mx-auto object-contain bg-white rounded-lg p-2"
                  />
                  <button
                    type="button"
                    onClick={handleDeleteQrCode}
                    className="text-red-500 hover:text-red-650 text-xs font-semibold flex items-center gap-1.5 mx-auto transition-colors"
                  >
                    <Trash2 size={14} />
                    Remove Image
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center text-center p-4">
                  <div className="p-3 bg-[#8B0000]/10 rounded-full text-[#8B0000] dark:text-[#ff8a80] mb-2">
                    <Upload size={24} />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">Choose QR Code image</span>
                  <span className="text-xs text-gray-500 mt-1">PNG, JPG or SVG</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>

            {/* Timer Config */}
            <div className="grid grid-cols-2 gap-4">
              <AdminInput 
                label="Validity Duration" 
                type="number"
                min="1"
                value={timerDuration} 
                onChange={(e) => setTimerDuration(Math.max(1, Number(e.target.value)))}
                required
              />
              
              <AdminSelect
                label="Time Unit"
                value={timerUnit}
                onChange={(e) => setTimerUnit(e.target.value)}
                options={[
                  { value: 'minutes', label: 'Minutes' },
                  { value: 'hours', label: 'Hours' }
                ]}
              />
            </div>

            <AdminButton 
              type="submit" 
              className="w-full font-bold bg-[#8B0000] hover:bg-[#8B0000]/95" 
              isLoading={settingsSaving}
            >
              Save Settings
            </AdminButton>
          </form>
        </div>

        {/* Right Column: Bulk Operations */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#8B0000] dark:text-[#ff8a80]" />
            Bulk Access Operations
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Batch-specific operation */}
            <div className="p-4 bg-gray-50 dark:bg-[#0f0f1a] rounded-xl border border-gray-200 dark:border-[#8B0000]/20 space-y-3">
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={16} className="text-[#8B0000] dark:text-[#ff8a80]" />
                Enable by Batch
              </div>
              
              <AdminSelect
                label="Select Batch"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                options={[
                  { value: '', label: 'Select batch...' },
                  ...batches.map(b => ({ value: b.id || '', label: b.name || '' }))
                ]}
              />
              
              <AdminButton 
                onClick={() => handleBulkEnable('batch')}
                variant="secondary"
                className="w-full text-xs font-bold"
                disabled={bulkActionLoading || !selectedBatchId}
              >
                Enable for Batch Students
              </AdminButton>
            </div>

            {/* General bulk actions */}
            <div className="p-4 bg-gray-50 dark:bg-[#0f0f1a] rounded-xl border border-gray-200 dark:border-[#8B0000]/20 flex flex-col justify-between gap-3">
              <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-[#8B0000] dark:text-[#ff8a80]" />
                General Bulk Actions
              </div>

              <div className="grid grid-cols-1 gap-2">
                <AdminButton 
                  onClick={() => handleBulkEnable('requested')}
                  className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  disabled={bulkActionLoading}
                >
                  Enable All Requested ({requestCount})
                </AdminButton>
                
                <div className="grid grid-cols-2 gap-2">
                  <AdminButton 
                    onClick={() => handleBulkEnable('paid')}
                    variant="secondary"
                    className="w-full text-xs font-bold border-[#8B0000]/30 text-[#8B0000] dark:border-[#ff8a80]/30 dark:text-[#ff8a80]"
                    disabled={bulkActionLoading}
                  >
                    Enable All Paid
                  </AdminButton>
                  
                  <AdminButton 
                    onClick={() => handleBulkEnable('free')}
                    variant="secondary"
                    className="w-full text-xs font-bold border-gray-300 text-gray-500 dark:border-gray-700 dark:text-gray-400"
                    disabled={bulkActionLoading}
                  >
                    Enable All Free
                  </AdminButton>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Directory Table Area */}
      <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Student Permissions Directory</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pending requests are automatically sorted to the top.</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3.5 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 transition-all font-medium"
            />
          </div>
        </div>

        <AdminTable
          columns={columns}
          data={filteredStudents}
          isLoading={loading}
        />
      </div>

      {/* Payment Acknowledgements Verification Queue */}
      <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-6 space-y-6 shadow-sm">
        
        {/* Section Header with status filter tab buttons */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction Acknowledgement Queue</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Verify payment receipts and UTR numbers submitted by students.</p>
          </div>

          {/* Filtering buttons: Default showing pending */}
          <div className="flex bg-gray-50 dark:bg-[#0f0f1a] p-1 rounded-xl border border-gray-200 dark:border-[#8B0000]/20 shadow-inner">
            <button
              onClick={() => setAckFilter('pending')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                ackFilter === 'pending'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-gray-505 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-transparent'
              }`}
            >
              Pending
              {pendingAckCount > 0 && (
                <span className="bg-amber-650 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingAckCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setAckFilter('approved')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                ackFilter === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-505 hover:text-gray-905 dark:text-gray-400 dark:hover:text-white border border-transparent'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setAckFilter('rejected')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                ackFilter === 'rejected'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'text-gray-505 hover:text-gray-905 dark:text-gray-400 dark:hover:text-white border border-transparent'
              }`}
            >
              Rejected
            </button>
          </div>
        </div>

        {ackLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-650 border-t-primary" />
          </div>
        ) : acknowledgements.length === 0 ? (
          <div className="text-gray-500 p-8 text-center bg-gray-50/50 dark:bg-[#1a1a2e]/20 rounded-xl border border-dashed border-gray-200 dark:border-[#8B0000]/10">
            No {ackFilter} transaction proofs found in the queue.
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-2xl border border-gray-250 dark:border-[#8B0000]/25 bg-white dark:bg-[#1a1a2e] shadow-sm">
            <table className="w-full text-left text-sm text-[#E5E5E5]">
              <thead className="bg-gray-50 dark:bg-[#0f0f1a] text-xs uppercase text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-[#8B0000]/30">
                <tr>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-gray-300">Student Name</th>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-gray-300">Roll Number</th>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-gray-300">Submitted Date</th>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-gray-300">Transaction ID / UTR</th>
                  <th className="px-6 py-4 font-bold text-gray-900 dark:text-gray-300">Receipt Screenshot</th>
                  <th className="px-6 py-4 text-right font-bold text-gray-900 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {acknowledgements.map((ack) => (
                  <React.Fragment key={ack.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-gray-900 dark:text-white">
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 dark:text-white">
                        {ack.studentName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">
                        {ack.rollNumber || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-550 dark:text-gray-400">
                        {new Date(ack.submittedAt).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-[#8B0000] dark:text-[#ff8a80] font-bold">
                        {ack.transactionId || <span className="italic text-xs text-gray-500">Not Provided</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ack.screenshotUrl ? (
                          <button
                            onClick={() => handleDownloadProof(ack)}
                            className="flex items-center gap-1 text-xs text-[#8B0000] dark:text-[#ff8a80] hover:underline font-bold"
                          >
                            <Download size={12} />
                            Download Proof
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 italic">No Image</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {ack.status === 'pending' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleUpdateAckStatus(ack.id, 'approved')}
                              disabled={actionLoading === ack.id}
                              className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-650 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                            >
                              <Check size={12} />
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateAckStatus(ack.id, 'rejected')}
                              disabled={actionLoading === ack.id}
                              className="bg-rose-500/10 border border-rose-500/30 text-rose-650 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all"
                            >
                              <X size={12} />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border uppercase ${
                            ack.status === 'approved' 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400' 
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-455'
                          }`}>
                            {ack.status}
                          </span>
                        )}
                      </td>
                    </tr>
                    
                    {/* Collapsible Sub-Row for Inline Preview */}
                    {expandedAckId === ack.id && ack.screenshotUrl && (
                      <tr className="bg-gray-50/50 dark:bg-[#1b1b1b]/50">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="border border-gray-205 dark:border-[#8B0000]/30 bg-white rounded-lg p-2 max-w-sm flex flex-col items-center justify-center relative shadow-inner">
                            <button
                              onClick={() => setExpandedAckId(null)}
                              className="absolute top-2 right-2 text-gray-500 hover:text-black font-bold text-sm"
                            >
                              &times;
                            </button>
                            <span className="text-xs text-gray-500 font-bold mb-2">Receipt Screenshot Preview</span>
                            <img 
                              src={ack.screenshotUrl} 
                              alt="Receipt Screenshot" 
                              className="max-h-60 w-auto object-contain rounded"
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
    </div>
  );
};
