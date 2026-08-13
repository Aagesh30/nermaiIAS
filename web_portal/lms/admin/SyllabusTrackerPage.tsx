import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Layers, Search, RefreshCw, CheckCircle, 
  AlertCircle, ChevronDown, ChevronRight, User, Calendar, 
  Clock, Award, HelpCircle as HelpIcon 
} from 'lucide-react';
import { CourseApi } from '../core/services';

export const SyllabusTrackerPage = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [subtopics, setSubtopics] = useState<any[]>([]);
  
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [facultyFilter, setFacultyFilter] = useState<string>('all');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  
  // Track expanded subjects and topics in the list
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});

  // Inline saving states
  const [isSavingInline, setIsSavingInline] = useState<Record<string, boolean>>({});

  const fetchData = async (showSpinner = false) => {
    if (showSpinner) {
      setIsLoading(true);
    }
    try {
      const [coursesRes, subjectsRes, topicsRes, subtopicsRes] = await Promise.all([
        CourseApi.listCourses(),
        CourseApi.listAllSubjects(),
        CourseApi.listAllTopics(),
        CourseApi.listAllSubtopics()
      ]);

      const coursesList = coursesRes.data?.data || coursesRes.data || [];
      const subjectsList = subjectsRes.data?.data || subjectsRes.data || [];
      const topicsList = topicsRes.data?.data || topicsRes.data || [];
      const subtopicsList = subtopicsRes.data?.data || subtopicsRes.data || [];

      setCourses(coursesList);
      setSubjects(subjectsList);
      setTopics(topicsList);
      setSubtopics(subtopicsList);

      // Select first active course by default if none selected
      if (!selectedCourse && coursesList.length > 0) {
        setSelectedCourse(coursesList[0].id || '');
      }
    } catch (error) {
      console.error('Failed to load syllabus tracker data', error);
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const handleSyncExcel = async () => {
    if (!selectedCourse) {
      alert('Please select a course to sync the syllabus.');
      return;
    }
    setIsSyncing(true);
    setSyncStatus({ type: 'idle', message: 'Syncing syllabus with Nermai Faculty Tracker Excel...' });
    try {
      const res = await CourseApi.syncSyllabus(selectedCourse);
      setSyncStatus({ 
        type: 'success', 
        message: `Successfully synced curriculum! Processed ${res.data?.result?.length || 0} subjects.` 
      });
      fetchData(false);
    } catch (err: any) {
      console.error(err);
      setSyncStatus({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to parse Faculty Tracker Excel file on server. Make sure the file exists.' 
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle expanded states
  const toggleSubject = (subjId: string) => {
    setExpandedSubjects(prev => ({ ...prev, [subjId]: !prev[subjId] }));
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics(prev => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  // Inline status updates
  const handleStatusChange = async (itemId: string, type: 'subtopic' | 'topic', newStatus: string) => {
    setIsSavingInline(prev => ({ ...prev, [itemId]: true }));
    try {
      const dbStatus = newStatus === 'Completed' ? 'Done' : newStatus;
      const pct = dbStatus === 'Done' ? 100 : dbStatus === 'Pending' ? 0 : 50;
      
      const payload = {
        coverageStatus: dbStatus,
        percentCovered: pct,
        completed: dbStatus === 'Done'
      };

      if (type === 'subtopic') {
        await CourseApi.updateSubtopic(itemId, payload);
      } else {
        // Find all subtopics belonging to this topic
        const topicSubtopics = subtopics.filter(st => st.topicId === itemId);
        
        // Update the topic itself
        await CourseApi.updateTopic(itemId, payload);
        
        // Cascade update all subtopics
        if (topicSubtopics.length > 0) {
          const savingStates = topicSubtopics.reduce((acc, st) => ({ ...acc, [st.id!]: true }), {});
          setIsSavingInline(prev => ({ ...prev, ...savingStates }));
          
          await Promise.all(
            topicSubtopics.map(st => CourseApi.updateSubtopic(st.id!, payload))
          );
          
          const idleStates = topicSubtopics.reduce((acc, st) => ({ ...acc, [st.id!]: false }), {});
          setIsSavingInline(prev => ({ ...prev, ...idleStates }));
        }
      }
      fetchData(false);
    } catch (error) {
      console.error(error);
      alert('Failed to save update.');
    } finally {
      setIsSavingInline(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Filter subjects, topics, and subtopics for the selected course
  const courseSubjects = useMemo(() => {
    if (!selectedCourse) return [];
    return subjects.filter(s => s.courseId === selectedCourse);
  }, [subjects, selectedCourse]);

  const courseTopics = useMemo(() => {
    const subjIds = new Set(courseSubjects.map(s => s.id));
    return topics.filter(t => subjIds.has(t.subjectId));
  }, [topics, courseSubjects]);

  const courseSubtopics = useMemo(() => {
    const topicIds = new Set(courseTopics.map(t => t.id));
    return subtopics.filter(st => topicIds.has(st.topicId));
  }, [subtopics, courseTopics]);

  // Combine topics (that have 0 subtopics) and subtopics into a unified trackable list
  const trackedItems = useMemo(() => {
    if (!selectedCourse) return [];
    const list: any[] = [];
    courseTopics.forEach(t => {
      const subtopicsInTopic = courseSubtopics.filter(st => st.topicId === t.id);
      if (subtopicsInTopic.length === 0) {
        // Direct topic-level tracking
        list.push({ ...t, isDirectTopic: true });
      } else {
        subtopicsInTopic.forEach(st => {
          list.push({ ...st, isDirectTopic: false });
        });
      }
    });
    return list;
  }, [courseTopics, courseSubtopics, selectedCourse]);

  // Extract all unique faculty names for filters
  const uniqueFacultyList = useMemo(() => {
    const list = trackedItems
      .map(item => item.facultyName)
      .filter(Boolean)
      .map(f => String(f).trim());
    return [...new Set(list)];
  }, [trackedItems]);

  // Filtering trackable items by search and dropdowns
  const filteredTrackedItems = useMemo(() => {
    return trackedItems.filter(item => {
      let topic, subject;
      if (item.isDirectTopic) {
        topic = item;
        subject = courseSubjects.find(s => s.id === item.subjectId);
      } else {
        topic = courseTopics.find(t => t.id === item.topicId);
        subject = courseSubjects.find(s => s.id === topic?.subjectId);
      }
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (item.name || '').toLowerCase().includes(q) ||
        (topic?.name || '').toLowerCase().includes(q) ||
        (subject?.name || '').toLowerCase().includes(q);

      const status = item.coverageStatus || 'Pending';
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'Done' && status.toLowerCase() === 'done') ||
        (statusFilter === 'Partial' && status.toLowerCase() === 'partial') ||
        (statusFilter === 'Pending' && (status.toLowerCase() === 'pending' || !status));

      const matchesFaculty = facultyFilter === 'all' || item.facultyName === facultyFilter;

      return matchesSearch && matchesStatus && matchesFaculty;
    });
  }, [trackedItems, courseTopics, courseSubjects, searchQuery, statusFilter, facultyFilter]);

  // Analytics
  const stats = useMemo(() => {
    const total = trackedItems.length;
    const done = trackedItems.filter(st => (st.coverageStatus || '').toLowerCase() === 'done').length;
    const partial = trackedItems.filter(st => (st.coverageStatus || '').toLowerCase() === 'partial').length;
    const pending = total - done - partial;
    
    // Overall completion percentage
    let totalCoveredPct = 0;
    trackedItems.forEach(st => {
      totalCoveredPct += Number(st.percentCovered || 0);
    });
    const avgCoverage = total > 0 ? Math.round(totalCoveredPct / total) : 0;

    return { total, done, partial, pending, avgCoverage };
  }, [trackedItems]);

  // Subject completion progress list
  const subjectProgress = useMemo(() => {
    return courseSubjects.map(subj => {
      const itemsInSubj = trackedItems.filter(item => {
        if (item.isDirectTopic) {
          return item.subjectId === subj.id;
        } else {
          const topic = courseTopics.find(t => t.id === item.topicId);
          return topic?.subjectId === subj.id;
        }
      });
      
      const total = itemsInSubj.length;
      const done = itemsInSubj.filter(item => (item.coverageStatus || '').toLowerCase() === 'done').length;
      
      let sumPct = 0;
      itemsInSubj.forEach(item => {
        sumPct += Number(item.percentCovered || 0);
      });
      
      const avgPct = total > 0 ? Math.round(sumPct / total) : 0;
      return {
        ...subj,
        total,
        done,
        avgPct
      };
    });
  }, [courseSubjects, courseTopics, trackedItems]);

  const getTopicStatus = (topic: any, topicSubtopics: any[]) => {
    const rawStatus = topic.coverageStatus;
    if (rawStatus) return rawStatus;
    if (topicSubtopics.length === 0) return 'Pending';

    const allDone = topicSubtopics.every(st => (st.coverageStatus || '').toLowerCase() === 'done');
    if (allDone) return 'Done';

    const allPending = topicSubtopics.every(st => !st.coverageStatus || st.coverageStatus.toLowerCase() === 'pending');
    if (allPending) return 'Pending';

    return 'Partial';
  };

  // Render coverage status select box
  const renderStatusDropdown = (item: any, type: 'subtopic' | 'topic') => {
    let rawStatus = item.coverageStatus;
    if (type === 'topic') {
      const topicSubtopics = subtopics.filter(st => st.topicId === item.id);
      rawStatus = getTopicStatus(item, topicSubtopics);
    } else {
      rawStatus = rawStatus || 'Pending';
    }
    const statusVal = (rawStatus.toLowerCase() === 'done' || rawStatus.toLowerCase() === 'completed') ? 'Completed' : rawStatus;
    
    // Determine dynamic background/text colors based on selection
    let colorClasses = '';
    if (statusVal === 'Completed') {
      colorClasses = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-transparent';
    } else if (statusVal === 'Partial') {
      colorClasses = 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-transparent';
    } else {
      colorClasses = 'bg-gray-50 text-gray-500 dark:bg-slate-500/20 dark:text-slate-400 border-gray-200 dark:border-transparent';
    }

    return (
      <div 
        className="relative inline-block shrink-0 select-none"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      >
        <select
          value={statusVal}
          onChange={(e) => handleStatusChange(item.id!, type, e.target.value)}
          disabled={isSavingInline[item.id!]}
          className={`pl-2.5 pr-6 py-0.5 rounded-full text-[10px] font-extrabold border focus:outline-none cursor-pointer appearance-none bg-no-repeat ${colorClasses} ${isSavingInline[item.id!] ? 'opacity-50' : ''}`}
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundPosition: 'right 6px center',
            backgroundSize: '8px'
          }}
        >
          <option value="Pending" className="bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white">PENDING</option>
          <option value="Partial" className="bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white">PARTIAL</option>
          <option value="Completed" className="bg-white dark:bg-[#1a1a2e] text-gray-900 dark:text-white">COMPLETED</option>
        </select>
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full pb-10 text-gray-900 dark:text-white">
      {/* Header Banner */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#8B0000]/10 dark:bg-[#8B0000]/30 text-[#8B0000] dark:text-[#ff8a80] flex items-center justify-center border border-[#8B0000]/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Syllabus Tracker</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Track faculty class logs and curriculum progress against Master Tracker spreadsheet.</p>
            </div>
          </div>
        </div>

        {/* Sync Panel */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#8B0000] cursor-pointer w-full sm:w-60"
          >
            <option value="" disabled>Select course to track...</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.title}
              </option>
            ))}
          </select>
          <button
            onClick={handleSyncExcel}
            disabled={isSyncing || !selectedCourse}
            className="flex items-center justify-center gap-2 px-5 py-2 bg-[#8B0000] hover:bg-[#a00000] text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:scale-100 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Excel Tracker'}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus.message ? (
        <div className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-300 ${
          syncStatus.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
            : syncStatus.type === 'error' 
              ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400' 
              : 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400'
        }`}>
          {syncStatus.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : syncStatus.type === 'error' ? (
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <RefreshCw className="w-5 h-5 shrink-0 mt-0.5 animate-spin" />
          )}
          <div className="text-sm font-semibold">{syncStatus.message}</div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="py-20 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-[#8B0000]" />
          <p className="font-semibold text-sm">Loading syllabus tracking metrics...</p>
        </div>
      ) : (
        <>
          {/* Stats Analytics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-5 shadow-sm hover:border-[#8B0000]/20 transition-all">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Subtopics</div>
              <div className="text-3xl font-extrabold mt-2 text-gray-900 dark:text-white">{stats.total}</div>
            </div>
            
            <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-5 shadow-sm hover:border-emerald-500/20 transition-all">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Done (Coverage)</div>
              <div className="text-3xl font-extrabold mt-2 text-emerald-600 dark:text-emerald-400">{stats.done}</div>
            </div>
            
            <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-5 shadow-sm hover:border-amber-500/20 transition-all">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Partial Classes</div>
              <div className="text-3xl font-extrabold mt-2 text-amber-600 dark:text-amber-400">{stats.partial}</div>
            </div>
            
            <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-5 shadow-sm hover:border-red-500/20 transition-all">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pending Topics</div>
              <div className="text-3xl font-extrabold mt-2 text-red-600 dark:text-red-400">{stats.pending}</div>
            </div>
            
            <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-5 shadow-sm hover:border-purple-500/20 transition-all">
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Overall Progress</div>
              <div className="text-3xl font-extrabold mt-2 text-gray-900 dark:text-white flex items-baseline gap-1">
                {stats.avgCoverage}%
                <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">avg covered</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Subject Level Summary list */}
            <div className="space-y-4">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2 px-1">
                <Award className="w-4 h-4 text-[#8B0000]" /> Subject-wise Progress
              </h2>
              <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-5 shadow-sm space-y-4 max-h-[500px] overflow-y-auto">
                {subjectProgress.map((subj) => (
                  <div key={subj.id} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-bold text-gray-800 dark:text-gray-200">{subj.name}</span>
                      <span className="font-semibold text-gray-500 dark:text-gray-400">{subj.avgPct}%</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${subj.avgPct}%` }} 
                        className={`h-full rounded-full ${
                          subj.avgPct >= 80 
                            ? 'bg-emerald-500' 
                            : subj.avgPct >= 40 
                              ? 'bg-amber-500' 
                              : 'bg-red-600'
                        }`} 
                      />
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 flex justify-between font-semibold">
                      <span>{subj.done} of {subj.total} subtopics Done</span>
                    </div>
                  </div>
                ))}
                {subjectProgress.length === 0 && (
                  <p className="text-center py-10 text-gray-400 dark:text-gray-500 italic text-sm">No subjects synced yet.</p>
                )}
              </div>
            </div>

            {/* Subtopics Listing and Search */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search and Filters */}
              <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search box */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search syllabus..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-[#8B0000] font-medium"
                    />
                  </div>
                  {/* Status Filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3.5 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#8B0000] cursor-pointer"
                  >
                    <option value="all">All Coverage</option>
                    <option value="Done">Done</option>
                    <option value="Partial">Partial</option>
                    <option value="Pending">Pending</option>
                  </select>
                  {/* Faculty Filter */}
                  <select
                    value={facultyFilter}
                    onChange={(e) => setFacultyFilter(e.target.value)}
                    className="px-3.5 py-2 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#8B0000] cursor-pointer max-w-[150px]"
                  >
                    <option value="all">All Faculty</option>
                    {uniqueFacultyList.map(fac => (
                      <option key={fac} value={fac}>{fac}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Hierarchy Curriculum List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#8B0000]" /> Curriculum Details
                  </h2>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold">
                    Showing {filteredTrackedItems.length} items
                  </span>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {courseSubjects.map((subj) => {
                    const isExpanded = !!expandedSubjects[subj.id!];
                    const subjTopics = courseTopics.filter(t => t.subjectId === subj.id);
                    
                    const subjTrackedItems = trackedItems.filter(item => {
                      if (item.isDirectTopic) {
                        return item.subjectId === subj.id;
                      } else {
                        const topic = courseTopics.find(t => t.id === item.topicId);
                        return topic?.subjectId === subj.id;
                      }
                    });

                    // Filtered counts
                    const hasFilteredItems = filteredTrackedItems.some(item => {
                      if (item.isDirectTopic) {
                        return item.subjectId === subj.id;
                      } else {
                        const topic = courseTopics.find(t => t.id === item.topicId);
                        return topic?.subjectId === subj.id;
                      }
                    });

                    // If filters are active but subject has no matching items, skip rendering it
                    if ((searchQuery || statusFilter !== 'all' || facultyFilter !== 'all') && !hasFilteredItems) {
                      return null;
                    }

                    return (
                      <div key={subj.id} className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl overflow-hidden shadow-sm transition-all">
                        {/* Subject Header Row */}
                        <div 
                          onClick={() => toggleSubject(subj.id!)}
                          className="w-full flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-5 h-5 text-[#8B0000]" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                            <div>
                              <div className="font-extrabold text-gray-900 dark:text-white text-base">{subj.name}</div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subjTopics.length} Topics • {subjTrackedItems.length} Tracked Items</div>
                            </div>
                          </div>
                          {subj.avgPct !== undefined ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-gray-600 dark:text-slate-300">
                              {subj.avgPct || 0}% covered
                            </span>
                          ) : null}
                        </div>

                        {/* Subject Body (Topics) */}
                        {isExpanded && (
                          <div className="border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 p-4 space-y-4">
                            {subjTopics.map((topic) => {
                              const isTopicExpanded = !!expandedTopics[topic.id!];
                              const topicSubtopics = courseSubtopics.filter(st => st.topicId === topic.id);
                              
                              const topicFilteredTrackedItems = filteredTrackedItems.filter(item => {
                                if (item.isDirectTopic) {
                                  return item.id === topic.id;
                                } else {
                                  return item.topicId === topic.id;
                                }
                              });

                              if ((searchQuery || statusFilter !== 'all' || facultyFilter !== 'all') && topicFilteredTrackedItems.length === 0) {
                                return null;
                              }

                              return (
                                <div key={topic.id} className="border border-gray-100 dark:border-white/5 rounded-xl overflow-hidden bg-white dark:bg-black/30 shadow-sm">
                                  {/* Topic Header Row */}
                                  <div
                                    onClick={() => toggleTopic(topic.id!)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors text-left cursor-pointer"
                                  >
                                    <div className="flex items-center gap-2">
                                      {isTopicExpanded ? <ChevronDown className="w-4 h-4 text-amber-500" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                                      <div className="font-bold text-gray-800 dark:text-slate-200 text-sm flex items-center gap-2">
                                        <div className="w-1.5 h-3.5 bg-amber-500 rounded-full" />
                                        {topic.name}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                      {topicSubtopics.length > 0 && (
                                        <span className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">
                                          {topicSubtopics.length} subtopics
                                        </span>
                                      )}
                                      {renderStatusDropdown(topic, 'topic')}
                                    </div>
                                  </div>

                                  {/* Topic Body (Subtopics or Direct Topic description) */}
                                  {isTopicExpanded && (
                                    <div className="p-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/30 dark:bg-black/10 divide-y divide-gray-100 dark:divide-white/5">
                                      {topicSubtopics.length === 0 ? (
                                        <div className="w-full py-4 px-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                          <div className="space-y-1">
                                            <div className="text-xs text-amber-600 dark:text-amber-500 font-bold flex items-center gap-1.5">
                                              Direct tracking enabled (No subtopics in this topic)
                                            </div>
                                            {topic.remarks ? (
                                              <div className="text-xs text-gray-400 dark:text-slate-500 italic font-medium">{topic.remarks}</div>
                                            ) : null}
                                          </div>
                                          <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-slate-400 shrink-0 flex-wrap">
                                            {topic.facultyName ? (
                                              <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="font-bold">{topic.facultyName}</span>
                                              </div>
                                            ) : null}
                                            {topic.dateOfClass ? (
                                              <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{topic.dateOfClass}</span>
                                              </div>
                                            ) : null}
                                            {topic.durationHrs ? (
                                              <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                <span>{topic.durationHrs} Hrs</span>
                                              </div>
                                            ) : null}
                                            {topic.percentCovered !== undefined ? (
                                              <span className="font-extrabold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                                {topic.percentCovered}% covered
                                              </span>
                                            ) : null}
                                          </div>
                                        </div>
                                      ) : (
                                        topicFilteredTrackedItems.map((st) => (
                                          <div
                                            key={st.id}
                                            className="w-full py-3 px-2 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl transition-all"
                                          >
                                            <div className="space-y-1 md:max-w-[60%]">
                                              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                                                <span>{st.name}</span>
                                                {renderStatusDropdown(st, 'subtopic')}
                                              </div>
                                              {st.remarks ? (
                                                <div className="text-xs text-gray-400 dark:text-slate-500 italic font-medium">{st.remarks}</div>
                                              ) : null}
                                            </div>

                                            <div className="flex items-center gap-6 text-xs text-gray-500 dark:text-slate-400 shrink-0 flex-wrap">
                                              {st.facultyName ? (
                                                <div className="flex items-center gap-1.5">
                                                  <User className="w-3.5 h-3.5 text-gray-400" />
                                                  <span className="font-bold">{st.facultyName}</span>
                                                </div>
                                              ) : null}
                                              {st.dateOfClass ? (
                                                <div className="flex items-center gap-1.5">
                                                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                  <span>{st.dateOfClass}</span>
                                                </div>
                                              ) : null}
                                              {st.durationHrs ? (
                                                <div className="flex items-center gap-1.5">
                                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                  <span>{st.durationHrs} Hrs</span>
                                                </div>
                                              ) : null}
                                              {st.percentCovered !== undefined ? (
                                                <span className="font-extrabold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                                  {st.percentCovered}% covered
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {courseSubjects.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                      <HelpIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-gray-700 dark:text-slate-300">Syllabus is Empty</h3>
                      <p className="text-gray-400 dark:text-gray-500 mt-2">Select a course and sync curriculum from the Faculty Tracker Excel sheet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
