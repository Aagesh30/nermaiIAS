import React, { useState, useRef, useMemo } from 'react';
import { 
  FileSpreadsheet, Upload, CheckCircle2, AlertCircle, 
  Search, Users, Key, DollarSign, Calendar, Clock, 
  Sparkles, Check, AlertTriangle, X, ShieldCheck
} from 'lucide-react';
import { parseStudentUploadFile, ParsedStudentRow, ParsedStudentUploadResult } from '../utils/excelStudentParser';
import api from '../core/api';
import { AdminModal, AdminButton } from './admin-ui';

interface BulkStudentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: Array<{ id: string; batchName: string; course?: string }>;
  onSuccess?: () => void;
}

export const BulkStudentUploadModal: React.FC<BulkStudentUploadModalProps> = ({
  isOpen,
  onClose,
  batches,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedStudentUploadResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'valid' | 'invalid'>('all');
  
  // Registration state
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
    skipped?: string[];
    errors?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setParseError(null);
    setRegisterResult(null);
    setSearchQuery('');
    setFilterType('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setParseError('Please upload a valid Excel workbook (.xlsx or .xls)');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setRegisterResult(null);

    try {
      const result = await parseStudentUploadFile(selectedFile, batches);
      if (result.students.length === 0) {
        setParseError('No student rows were found in the uploaded file.');
        setParsedData(null);
      } else {
        setFile(selectedFile);
        setParsedData(result);
      }
    } catch (err: any) {
      console.error('Failed to parse student Excel', err);
      setParseError(err.message || 'Failed to parse Excel file. Please ensure it contains student rows.');
      setParsedData(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!parsedData) return [];
    let list = parsedData.students;

    if (filterType === 'valid') {
      list = list.filter(s => s.isValid);
    } else if (filterType === 'invalid') {
      list = list.filter(s => !s.isValid);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.loginUsername.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.batch.toLowerCase().includes(q)
      );
    }

    return list;
  }, [parsedData, searchQuery, filterType]);

  const handleRegisterAll = async () => {
    if (!parsedData || parsedData.students.length === 0) return;

    const validStudents = parsedData.students.filter(s => s.isValid);
    if (validStudents.length === 0) {
      alert('No valid student rows found to register. Please fix the validation errors.');
      return;
    }

    setIsRegistering(true);
    setRegisterResult(null);

    try {
      const payload = validStudents.map(s => ({
        firstName: s.firstName,
        name: s.name,
        loginUsername: s.loginUsername,
        rollNumber: s.rollNumber,
        phone: s.phone,
        email: s.email || '',
        loginPassword: s.password,
        batches: s.batches,
        batchModes: s.batchModes,
        batch: s.batch,
        course: s.course || '',
        type: s.type,
        totalFees: s.totalFees,
        feesPaid: s.feesPaid,
        courseDuration: s.courseDuration,
        joiningDate: s.joiningDate,
        modeOfPayment: s.modeOfPayment,
        transactionId: s.transactionId || ''
      }));

      const res = await api.post('/erp/student/bulk', { students: payload });
      
      setRegisterResult({
        success: true,
        message: res.data?.message || `Successfully registered ${res.data?.count || validStudents.length} students!`,
        count: res.data?.count,
        skipped: res.data?.skipped || [],
        errors: res.data?.errors || []
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Bulk registration failed', err);
      setRegisterResult({
        success: false,
        message: err.response?.data?.message || err.message || 'Failed to complete bulk student registration.'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Student Upload (Excel)"
    >
      <div className="space-y-5 max-h-[78vh] overflow-y-auto pr-1">
        {/* Upload Dropzone */}
        {!parsedData && (
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isParsing
                ? 'border-[#c62828] bg-[#c62828]/5'
                : 'border-gray-300 dark:border-white/20 hover:border-[#c62828] hover:bg-gray-50 dark:hover:bg-[#1a1a2e]/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {isParsing ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-10 h-10 border-3 border-[#c62828] border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-gray-900 dark:text-white text-sm">Extracting student roster & generating credentials...</p>
                <p className="text-xs text-gray-500">Auto-detecting columns in any sequence</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#c62828]/10 text-[#c62828] dark:bg-[#c62828]/20 flex items-center justify-center shadow-inner">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Click to select or drag & drop Student Roster Excel (.xlsx, .xls)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                    Supports any column order: Name, Roll Number, Batches, Fees (Total & Paid), Duration, Joining Date, Phone & Payment Mode.
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-creates Password: <span className="font-mono font-bold">Username + Phone Last 4 Digits</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {parseError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Excel Parsing Failed</p>
              <p className="text-xs mt-0.5">{parseError}</p>
            </div>
          </div>
        )}

        {/* Registration Result Banner */}
        {registerResult && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${
            registerResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
          }`}>
            {registerResult.success ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-bold">{registerResult.success ? 'Registration Succeeded!' : 'Registration Error'}</p>
              <p className="text-xs">{registerResult.message}</p>
              {registerResult.skipped && registerResult.skipped.length > 0 && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  ⚠️ {registerResult.skipped.length} roll numbers skipped because they already exist: {registerResult.skipped.slice(0, 5).join(', ')}{registerResult.skipped.length > 5 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Parsed Student Preview Table */}
        {parsedData && (
          <div className="space-y-4">
            {/* File info bar & Re-upload */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#151525] p-3 rounded-xl border border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {parsedData.fileName}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold">
                  {parsedData.stats.totalRows} Students Detected
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={isRegistering}
                className="text-xs font-semibold text-[#c62828] dark:text-[#ff8a80] hover:underline px-2 py-1 cursor-pointer"
              >
                Upload Different File
              </button>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm text-center">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Valid Rows</div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {parsedData.stats.validCount}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm text-center">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Warnings / Invalids</div>
                <div className={`text-xl font-extrabold mt-0.5 ${parsedData.stats.invalidCount > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                  {parsedData.stats.invalidCount}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm text-center">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Total Fees Sum</div>
                <div className="text-lg font-extrabold text-gray-900 dark:text-white mt-0.5">
                  ₹{parsedData.stats.totalFeesSum.toLocaleString()}
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm text-center">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Total Paid Sum</div>
                <div className="text-lg font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                  ₹{parsedData.stats.totalPaidSum.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter name, roll, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-[#121220] border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#c62828]"
                />
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterType === 'all'
                      ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  All ({parsedData.students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('valid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterType === 'valid'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  Valid ({parsedData.stats.validCount})
                </button>
                {parsedData.stats.invalidCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterType('invalid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      filterType === 'invalid'
                        ? 'bg-amber-600 text-white'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    Warnings ({parsedData.stats.invalidCount})
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Table */}
            <div className="border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#1a1a2e] shadow-sm max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-[#151525] border-b border-gray-200 dark:border-white/10 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">#</th>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">Student Name</th>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">Roll / Username</th>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">Phone</th>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">Password</th>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">Batch & Mode</th>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">Fee (Paid/Total)</th>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">Duration</th>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">Joining Date</th>
                    <th className="py-2.5 px-3 font-bold text-gray-600 dark:text-gray-300">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredStudents.map((s, idx) => (
                    <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-white/5 ${!s.isValid ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}`}>
                      <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">{s.rowIndex}</td>
                      <td className="py-2 px-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">{s.name || '-'}</td>
                      <td className="py-2 px-3 font-semibold text-blue-600 dark:text-blue-400 font-mono whitespace-nowrap">{s.loginUsername || '-'}</td>
                      <td className="py-2 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">{s.phone || '-'}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[11px] text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          <Key className="w-3 h-3 text-amber-500" />
                          {s.password}
                        </span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{s.batch || '-'}</span>
                        <span className="ml-1 text-[10px] uppercase font-bold text-gray-500">({s.type})</span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="font-bold text-emerald-600">₹{s.feesPaid.toLocaleString()}</span>
                        <span className="text-gray-400"> / ₹{s.totalFees.toLocaleString()}</span>
                      </td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{s.courseDuration}</td>
                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">{s.joiningDate}</td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {s.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <Check className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600" title={s.validationErrors.join(', ')}>
                            <AlertTriangle className="w-3.5 h-3.5" /> {s.validationErrors[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 flex justify-between items-center border-t border-gray-100 dark:border-white/10">
          <AdminButton type="button" variant="secondary" onClick={handleClose} disabled={isRegistering}>
            {registerResult?.success ? 'Close' : 'Cancel'}
          </AdminButton>

          {parsedData && !registerResult?.success && (
            <AdminButton
              type="button"
              onClick={handleRegisterAll}
              isLoading={isRegistering}
              disabled={isRegistering || parsedData.stats.validCount === 0}
            >
              <ShieldCheck className="w-4 h-4" />
              Register All ({parsedData.stats.validCount} Students)
            </AdminButton>
          )}
        </div>
      </div>
    </AdminModal>
  );
};
