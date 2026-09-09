import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, Upload, CheckCircle2, AlertCircle, 
  ChevronRight, ChevronDown, Layers, BookOpen, 
  FileText, Sparkles, X, ArrowRight, RefreshCw, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseSyllabusFile, ParsedSyllabusResult } from '../utils/excelSyllabusParser';
import { CourseApi } from '../core/services';
import { AdminModal, AdminButton } from './admin-ui';

interface ExcelSyllabusModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Array<{ id: string; name: string }>;
  defaultCourseId?: string;
  onSyncSuccess?: (syncedCourseId?: string) => void;
}

export const ExcelSyllabusModal: React.FC<ExcelSyllabusModalProps> = ({
  isOpen,
  onClose,
  courses,
  defaultCourseId,
  onSyncSuccess
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(defaultCourseId || (courses[0]?.id || ''));
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedSyllabusResult | null>(null);
  
  // Tree preview state
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync defaultCourseId changes when modal opens
  React.useEffect(() => {
    if (defaultCourseId) {
      setSelectedCourseId(defaultCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [defaultCourseId, courses]);

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setParseError(null);
    setSyncSuccess(null);
    setSyncError(null);
    setExpandedSubjects({});
    setExpandedTopics({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      setParseError('Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    setSyncSuccess(null);
    setSyncError(null);

    try {
      const result = await parseSyllabusFile(selectedFile);
      if (result.subjects.length === 0) {
        setParseError('No curriculum sheets matching Subject / Topic / Sub-topic structure were found in the workbook.');
        setParsedData(null);
      } else {
        setFile(selectedFile);
        setParsedData(result);
        // Expand first subject by default for convenience
        if (result.subjects.length > 0) {
          setExpandedSubjects({ [result.subjects[0].name]: true });
        }
      }
    } catch (err: any) {
      console.error('Failed to parse syllabus Excel', err);
      setParseError(err.message || 'Failed to parse Excel file. Please ensure it is a valid workbook.');
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

  const toggleSubject = (subjectName: string) => {
    setExpandedSubjects(prev => ({ ...prev, [subjectName]: !prev[subjectName] }));
  };

  const toggleTopic = (topicKey: string) => {
    setExpandedTopics(prev => ({ ...prev, [topicKey]: !prev[topicKey] }));
  };

  const handleConfirmSync = async () => {
    if (!selectedCourseId) {
      setSyncError('Please select a course to sync the syllabus with.');
      return;
    }
    if (!parsedData || parsedData.subjects.length === 0) {
      setSyncError('No parsed syllabus data available to sync.');
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);

    try {
      const res = await CourseApi.syncSyllabus(selectedCourseId, {
        subjects: parsedData.subjects
      });

      const processedSubjects = res.data?.result?.length || parsedData.subjects.length;
      setSyncSuccess(`Successfully synced ${processedSubjects} Subjects, ${parsedData.stats.totalTopics} Topics, and ${parsedData.stats.totalSubtopics} Subtopics into course curriculum!`);
      
      if (onSyncSuccess) {
        onSyncSuccess(selectedCourseId);
      }

      // Automatically close modal after 1.5 seconds so admin sees the success feedback and page refreshes
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Sync failed', err);
      setSyncError(err.response?.data?.message || err.message || 'Failed to sync syllabus with server.');
    } finally {
      setIsSyncing(false);
    }
  };

  const selectedCourseObj = courses.find(c => c.id === selectedCourseId);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Course Syllabus (Excel)"
    >
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
        {/* Course Target Selection */}
        <div className="bg-gray-50 dark:bg-[#151525] p-4 rounded-xl border border-gray-200 dark:border-[#8B0000]/30 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#8B0000] dark:text-[#ff8a80]" />
            Target Course for Syllabus Sync
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            disabled={isSyncing}
            className="w-full bg-white dark:bg-[#1a1a2e] border border-gray-300 dark:border-[#8B0000]/40 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-[#8B0000] focus:ring-2 focus:ring-[#8B0000]/20 cursor-pointer"
          >
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Syllabus subjects, topics, and subtopics will be mapped under <span className="font-bold text-gray-900 dark:text-white">{selectedCourseObj?.name || 'Selected Course'}</span>.
          </p>
        </div>

        {/* Upload Dropzone */}
        {!parsedData && (
          <div
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isParsing
                ? 'border-[#8B0000] bg-[#8B0000]/5'
                : 'border-gray-300 dark:border-[#8B0000]/40 hover:border-[#8B0000] hover:bg-gray-50 dark:hover:bg-[#1a1a2e]/60'
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
                <div className="w-10 h-10 border-3 border-[#8B0000] border-t-transparent rounded-full animate-spin" />
                <p className="font-bold text-gray-900 dark:text-white text-sm">Parsing Excel syllabus sheets & hierarchy...</p>
                <p className="text-xs text-gray-500">Mapping Subject sheets, Topics, and Subtopics</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-[#8B0000]/10 dark:bg-[#8B0000]/20 text-[#8B0000] dark:text-[#ff8a80] flex items-center justify-center shadow-inner">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-base">
                    Click to select or drag & drop Faculty Tracker / Syllabus Excel
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Supports .xlsx and .xls workbooks (e.g. Nermai_Faculty_Tracker, SSC/UPSC Syllabus)
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Auto-detects Sheets ➔ Subjects, Topics & Subtopics
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
              <p className="font-bold">Excel Parsing Error</p>
              <p className="text-xs mt-0.5">{parseError}</p>
            </div>
          </div>
        )}

        {/* Sync Status Feedback */}
        {syncSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Sync Completed Successfully!</p>
              <p className="text-xs">{syncSuccess}</p>
            </div>
          </div>
        )}

        {syncError && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Sync Failed</p>
              <p className="text-xs">{syncError}</p>
            </div>
          </div>
        )}

        {/* Parsed Structure Preview */}
        {parsedData && (
          <div className="space-y-4">
            {/* File info bar & Re-upload */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-[#151525] p-3 rounded-xl border border-gray-200 dark:border-[#8B0000]/30">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {parsedData.fileName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={isSyncing}
                className="text-xs font-semibold text-[#8B0000] dark:text-[#ff8a80] hover:underline px-2 py-1"
              >
                Change File
              </button>
            </div>

            {/* Stats Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-[#8B0000]/30 text-center shadow-sm">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subjects</div>
                <div className="text-2xl font-extrabold text-[#8B0000] dark:text-[#ff8a80] mt-0.5">
                  {parsedData.stats.totalSubjects}
                </div>
              </div>
              <div className="p-3.5 bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-[#8B0000]/30 text-center shadow-sm">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Topics</div>
                <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-0.5">
                  {parsedData.stats.totalTopics}
                </div>
              </div>
              <div className="p-3.5 bg-white dark:bg-[#1a1a2e] rounded-xl border border-gray-200 dark:border-[#8B0000]/30 text-center shadow-sm">
                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sub-topics</div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {parsedData.stats.totalSubtopics}
                </div>
              </div>
            </div>

            {/* Hierarchical Preview Tree */}
            <div className="border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a2e] shadow-sm">
              <div className="px-4 py-3 bg-gray-50 dark:bg-[#151525] border-b border-gray-200 dark:border-[#8B0000]/30 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Curriculum Tree Preview
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Expand to verify hierarchy
                </span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-white/5 max-h-72 overflow-y-auto p-2">
                {parsedData.subjects.map((subject, sIdx) => {
                  const isSubjExpanded = !!expandedSubjects[subject.name];
                  return (
                    <div key={sIdx} className="rounded-xl overflow-hidden mb-1">
                      {/* Subject Header */}
                      <button
                        type="button"
                        onClick={() => toggleSubject(subject.name)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-[#151525] transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          {isSubjExpanded ? (
                            <ChevronDown className="w-4 h-4 text-[#8B0000] dark:text-[#ff8a80]" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <Layers className="w-4 h-4 text-[#8B0000] dark:text-[#ff8a80]" />
                          <span className="font-bold text-sm text-gray-900 dark:text-white">
                            {subject.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/30 dark:text-[#ff8a80]">
                            {subject.topics.length} topics
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            {subject.totalSubtopics} subtopics
                          </span>
                        </div>
                      </button>

                      {/* Topics list inside Subject */}
                      <AnimatePresence>
                        {isSubjExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pl-6 pr-2 py-1 space-y-1"
                          >
                            {subject.topics.map((topic, tIdx) => {
                              const topicKey = `${subject.name}_${topic.name}_${tIdx}`;
                              const isTopicExpanded = !!expandedTopics[topicKey];

                              return (
                                <div key={tIdx} className="bg-gray-50/50 dark:bg-[#121220] rounded-lg border border-gray-100 dark:border-white/5 overflow-hidden">
                                  {/* Topic Item */}
                                  <button
                                    type="button"
                                    onClick={() => toggleTopic(topicKey)}
                                    className="w-full flex items-center justify-between p-2 text-left hover:bg-gray-100/60 dark:hover:bg-[#1a1a2e]"
                                  >
                                    <div className="flex items-center gap-2">
                                      {isTopicExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                                      ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                                      )}
                                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                                      <span className="font-semibold text-xs text-gray-800 dark:text-gray-200">
                                        {topic.name}
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                                      {topic.subtopics.length} subtopics
                                    </span>
                                  </button>

                                  {/* Subtopics list inside Topic */}
                                  {isTopicExpanded && (
                                    <div className="pl-6 pr-3 py-1.5 space-y-1 bg-white dark:bg-[#151525] border-t border-gray-100 dark:border-white/5">
                                      {topic.subtopics.map((st, stIdx) => (
                                        <div key={stIdx} className="flex items-center justify-between py-1 text-xs text-gray-600 dark:text-gray-400 border-b last:border-0 border-gray-50 dark:border-white/5">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 font-mono w-4">
                                              {stIdx + 1}.
                                            </span>
                                            <span className="font-medium text-gray-700 dark:text-gray-300">
                                              {st.name}
                                            </span>
                                          </div>
                                          {st.facultyName ? (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                              {st.facultyName}
                                            </span>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 flex justify-between items-center border-t border-gray-100 dark:border-white/10">
          <AdminButton type="button" variant="secondary" onClick={handleClose} disabled={isSyncing}>
            {syncSuccess ? 'Close' : 'Cancel'}
          </AdminButton>

          {parsedData && !syncSuccess && (
            <AdminButton
              type="button"
              onClick={handleConfirmSync}
              isLoading={isSyncing}
              disabled={isSyncing}
            >
              <Check className="w-4 h-4" />
              Confirm & Sync Syllabus
            </AdminButton>
          )}
        </div>
      </div>
    </AdminModal>
  );
};
