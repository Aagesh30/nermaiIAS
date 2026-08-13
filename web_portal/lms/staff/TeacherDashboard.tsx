import React, { useState, useEffect, useMemo } from 'react';
import { Book, CheckSquare, Square, Award, Users, Search, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Percent, GraduationCap } from 'lucide-react';
import { CourseApi } from '../core/services';
import api from '../core/api';

interface TeacherDashboardProps {
  user: any;
  darkMode?: boolean;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, darkMode = false }) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [subtopics, setSubtopics] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>({});
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  // staffId resolved from the staff collection (different from user.userId which is in users collection)
  const [staffRecordId, setStaffRecordId] = useState<string>('');

  // Fetch all curriculum and test data
  const fetchData = async () => {
    try {
      // The teacher's userId from JWT is the `users` collection doc ID.
      // But defaultStaffId on a subject stores the `staff` collection doc ID — a different UUID.
      // We resolve this by fetching staff records and matching by loginUsername (which equals the user's username in JWT).
      const teacherUsername = user?.username || user?.name || '';

      const [coursesRes, subjectsRes, topicsRes, subtopicsRes, testsRes, staffRes] = await Promise.all([
        CourseApi.listCourses(),
        CourseApi.listAllSubjects(),
        CourseApi.listAllTopics(),
        CourseApi.listAllSubtopics(),
        api.get('/test-portal/review/results/all-tests').catch(() => ({ data: { data: [] } })),
        // Fetch current teacher's staff record
        api.get('/erp/staff/profile/me').catch(() => ({ data: null })),
      ]);

      setCourses(coursesRes.data?.data || coursesRes.data || []);
      setSubjects(subjectsRes.data?.data || subjectsRes.data || []);
      setTopics(topicsRes.data?.data || topicsRes.data || []);
      setSubtopics(subtopicsRes.data?.data || subtopicsRes.data || []);
      setTests(testsRes.data?.data || testsRes.data || []);

      // Resolve the staff record ID for this teacher
      const teacherStaff = staffRes.data?.data || staffRes.data || null;

      if (teacherStaff) {
        setStaffRecordId(teacherStaff.id || '');
      }
    } catch (error) {
      console.error('Failed to load teacher dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // userId from JWT (users collection doc ID)
  const teacherUserId = user?.userId || user?.id || '';

  // 1. Resolve which subjects are allotted to this teacher
  // We check BOTH staffRecordId (staff collection) AND teacherUserId (users collection) for maximum compatibility
  const allottedSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      // Direct subject allotment — check both IDs
      if (staffRecordId && subject.defaultStaffId === staffRecordId) return true;
      if (teacherUserId && subject.defaultStaffId === teacherUserId) return true;

      // Check if parent course is assigned to this teacher
      const parentCourse = courses.find((c) => c.id === subject.courseId);
      if (parentCourse) {
        if (staffRecordId && parentCourse.courseStaffId === staffRecordId) return true;
        if (teacherUserId && parentCourse.courseStaffId === teacherUserId) return true;
        if (Array.isArray(parentCourse.assignedStaffIds)) {
          if (staffRecordId && parentCourse.assignedStaffIds.includes(staffRecordId)) return true;
          if (teacherUserId && parentCourse.assignedStaffIds.includes(teacherUserId)) return true;
        }
        if (Array.isArray(parentCourse.assignedStaff)) {
          if (parentCourse.assignedStaff.some((staff: any) => staff.userId === teacherUserId)) return true;
          if (parentCourse.assignedStaff.some((staff: any) => staff.userId === staffRecordId)) return true;
        }
      }

      // Check if any subtopic under this subject's topics is assigned to this teacher
      const subjectTopics = topics.filter((t) => t.subjectId === subject.id);
      const topicIds = subjectTopics.map((t) => t.id);
      const subjectSubtopics = subtopics.filter((st) => topicIds.includes(st.topicId));
      if (staffRecordId && subjectSubtopics.some((st) => st.defaultStaffId === staffRecordId)) return true;
      if (teacherUserId && subjectSubtopics.some((st) => st.defaultStaffId === teacherUserId)) return true;

      return false;
    });
  }, [subjects, courses, topics, subtopics, teacherUserId, staffRecordId]);

  // Set default selected subject
  useEffect(() => {
    if (allottedSubjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(allottedSubjects[0].id);
    }
  }, [allottedSubjects, selectedSubjectId]);

  // Find parent course name for styling
  const getCourseName = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course ? course.name : 'Unknown Course';
  };

  // Get active subject details
  const activeSubject = allottedSubjects.find((s) => s.id === selectedSubjectId);

  // Topics belonging to the selected subject
  const activeTopics = useMemo(() => {
    if (!selectedSubjectId) return [];
    return topics
      .filter((t) => t.subjectId === selectedSubjectId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [topics, selectedSubjectId]);

  // Toggle subtopic completion state
  const handleToggleSubtopic = async (subtopic: any, topic: any) => {
    const newCompleted = !subtopic.completed;
    setIsUpdating(subtopic.id);
    try {
      // Update subtopic status
      await CourseApi.updateSubtopic(subtopic.id, { completed: newCompleted });

      // Get updated subtopics list to calculate topic progress percentage
      const topicSubtopics = subtopics.map((st) => 
        st.id === subtopic.id ? { ...st, completed: newCompleted } : st
      ).filter((st) => st.topicId === topic.id);

      const completedCount = topicSubtopics.filter((st) => st.completed).length;
      const progressPercent = Math.round((completedCount / topicSubtopics.length) * 100);

      // Update topic progress
      await CourseApi.updateTopic(topic.id, { progress: progressPercent });

      // Refresh data to keep UI synced
      await fetchData();
    } catch (err) {
      console.error('Failed to toggle subtopic:', err);
      alert('Error updating subtopic completion');
    } finally {
      setIsUpdating(null);
    }
  };

  // Directly update topic progress (if no subtopics exist)
  const handleDirectTopicProgress = async (topicId: string, progress: number) => {
    setIsUpdating(topicId);
    try {
      await CourseApi.updateTopic(topicId, { progress });
      await fetchData();
    } catch (err) {
      console.error('Failed to update topic progress:', err);
      alert('Error updating topic progress');
    } finally {
      setIsUpdating(null);
    }
  };

  // Helper: toggle topic expand/collapse
  const toggleTopicExpand = (topicId: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topicId]: !prev[topicId],
    }));
  };

  // 2. Filter tests matching the allotted subject names
  const activeTests = useMemo(() => {
    if (allottedSubjects.length === 0) return [];
    const subjectNames = allottedSubjects.map((s) => s.name.toLowerCase());
    return tests.filter((test) => {
      const title = (test.testTitle || '').toLowerCase();
      const desc = (test.description || '').toLowerCase();
      return subjectNames.some((subjectName) => 
        title.includes(subjectName) || desc.includes(subjectName)
      );
    });
  }, [tests, allottedSubjects]);

  // Filter student results inside tests based on search query
  const filteredTestsWithResults = useMemo(() => {
    if (!searchQuery.trim()) return activeTests;
    const q = searchQuery.toLowerCase();
    
    return activeTests.map((test) => {
      const filteredEntries = (test.entries || []).filter(
        (entry: any) =>
          (entry.studentName || '').toLowerCase().includes(q) ||
          (entry.rollNumber || '').toLowerCase().includes(q)
      );
      return {
        ...test,
        entries: filteredEntries,
      };
    });
  }, [activeTests, searchQuery]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 dark:border-gray-800 border-t-[#8B0000]" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading Teacher Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full text-gray-900 dark:text-white px-1 sm:px-4">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 bg-[#8B0000]/10 text-[#8B0000] dark:bg-[#8B0000]/20 dark:text-[#ff4d4d] rounded-full text-xs font-bold uppercase tracking-wider">
            Faculty Dashboard
          </span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
            Welcome back, {user?.name || user?.username || 'Teacher'}! 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor syllabus coverage and track your students' mock test performance.
          </p>
        </div>
        <div className="flex items-center gap-6 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800/40">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#8B0000] dark:text-[#ff4d4d]">{allottedSubjects.length}</div>
            <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Allotted Subjects</div>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-800" />
          <div className="text-center">
            <div className="text-2xl font-bold text-[#8B0000] dark:text-[#ff4d4d]">{activeTests.length}</div>
            <div className="text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Conducted Tests</div>
          </div>
        </div>
      </div>

      {allottedSubjects.length === 0 ? (
        <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl p-6 text-center space-y-4">
          <Book className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">No Subjects Allotted</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto text-sm">
            You are currently not assigned to teach any subjects. Please contact the administrator to configure your teaching allotments.
          </p>
          
          {/* Debug Panel */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-black/40 rounded-xl text-left border border-gray-200 dark:border-gray-800 text-xs font-mono overflow-auto max-h-[350px] space-y-3">
            <div className="font-bold text-gray-800 dark:text-gray-200 border-b pb-1">Debug Info:</div>
            <div>
              <span className="text-[#8B0000] font-bold">User JWT state:</span>
              <pre className="mt-1 bg-white dark:bg-black/20 p-2 rounded border">{JSON.stringify(user, null, 2)}</pre>
            </div>
            <div>
              <span className="text-[#8B0000] font-bold">Resolved staffRecordId:</span> {staffRecordId || 'Not found'}
            </div>
            <div>
              <span className="text-[#8B0000] font-bold">Resolved teacherUserId:</span> {teacherUserId || 'Not found'}
            </div>
            <div>
              <span className="text-[#8B0000] font-bold">Subjects in DB:</span> {subjects.length}
              <pre className="mt-1 bg-white dark:bg-black/20 p-2 rounded border max-h-[120px] overflow-auto">
                {subjects.map(s => `${s.name} (id: ${s.id}, courseId: ${s.courseId}, defaultStaffId: ${s.defaultStaffId})`).join('\n')}
              </pre>
            </div>
            <div>
              <span className="text-[#8B0000] font-bold">Courses in DB:</span> {courses.length}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Subjects Selection & Syllabus Tracking */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-black/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#8B0000] dark:text-[#ff4d4d]" />
                  <h2 className="font-bold text-gray-900 dark:text-white">Syllabus Tracker</h2>
                </div>
                {/* Subject Selector */}
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-gray-800/80 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]"
                >
                  {allottedSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name} ({getCourseName(subject.courseId)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-5">
                {activeSubject && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-black/10 border border-gray-100 dark:border-gray-800/40 rounded-xl">
                    <div className="text-xs font-semibold text-[#8B0000] dark:text-[#ff4d4d] uppercase tracking-wider">
                      {getCourseName(activeSubject.courseId)}
                    </div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                      {activeSubject.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Allotted to you as course/subject supervisor. Update the topic/subtopic progress below.
                    </div>
                  </div>
                )}

                {activeTopics.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                    No topics found under this subject.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeTopics.map((topic) => {
                      const topicSubtopics = subtopics.filter((st) => st.topicId === topic.id);
                      const isExpanded = !!expandedTopics[topic.id];
                      const progress = topic.progress || 0;

                      return (
                        <div
                          key={topic.id}
                          className="border border-gray-200 dark:border-gray-800/60 rounded-xl overflow-hidden hover:shadow-sm transition-all"
                        >
                          {/* Topic Row */}
                          <div 
                            onClick={() => toggleTopicExpand(topic.id)}
                            className="p-4 flex items-center justify-between gap-4 cursor-pointer bg-white hover:bg-gray-50 dark:bg-[#1a1a2e] dark:hover:bg-black/10 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="text-gray-400">
                                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                  {topic.name}
                                </h4>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                  {topicSubtopics.length} subtopics
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              {/* Progress Badge */}
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                  progress === 100
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : progress > 0
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                  {progress}% Covered
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content (Subtopics or Direct Sliders) */}
                          {isExpanded && (
                            <div className="bg-gray-50/50 dark:bg-black/10 border-t border-gray-100 dark:border-gray-800/40 p-4 space-y-4">
                              {topicSubtopics.length > 0 ? (
                                <div className="space-y-3">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Subtopic Completions (Topic progress calculated automatically):
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {topicSubtopics.sort((a, b) => (a.order || 0) - (b.order || 0)).map((st) => (
                                      <div
                                        key={st.id}
                                        onClick={() => isUpdating !== st.id && handleToggleSubtopic(st, topic)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                          st.completed
                                            ? 'bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400'
                                            : 'bg-white dark:bg-[#1a1a2e] border-gray-200 dark:border-gray-850 hover:border-gray-300'
                                        } ${isUpdating === st.id ? 'opacity-50 pointer-events-none' : ''}`}
                                      >
                                        <div className="shrink-0">
                                          {st.completed ? (
                                            <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                                          ) : (
                                            <Square className="w-5 h-5 text-gray-400" />
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="text-xs font-semibold truncate">
                                            {st.name}
                                          </div>
                                          {st.description && (
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                              {st.description}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                // No subtopics: allow direct topic progress updates
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    Update progress directly (no subtopics found):
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    {[0, 25, 50, 75, 100].map((val) => (
                                      <button
                                        key={val}
                                        disabled={isUpdating === topic.id}
                                        onClick={() => handleDirectTopicProgress(topic.id, val)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                          progress === val
                                            ? 'bg-[#8B0000] text-white'
                                            : 'bg-white dark:bg-[#1a1a2e] text-gray-700 dark:text-gray-300 border border-gray-250 dark:border-gray-800 hover:bg-gray-50'
                                        } ${isUpdating === topic.id ? 'opacity-50' : ''}`}
                                      >
                                        {val}%
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Student Test Results */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[75vh]">
              {/* Header */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-800/60 bg-gray-50/50 dark:bg-black/10">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-[#8B0000] dark:text-[#ff4d4d]" />
                  <h2 className="font-bold text-gray-900 dark:text-white">Student Test Progress</h2>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Mock exam results matching your allotted subjects.
                </p>
                {/* Search Bar */}
                <div className="relative mt-4">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="w-4 h-4 text-gray-400" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl py-2 pl-9 pr-4 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000]"
                  />
                </div>
              </div>

              {/* Collapsible/Scrollable lists */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {filteredTestsWithResults.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No conducted tests matching your allotted subjects.
                  </div>
                ) : (
                  filteredTestsWithResults.map((test) => (
                    <div
                      key={test.testId}
                      className="border border-gray-200 dark:border-gray-800/60 rounded-xl overflow-hidden bg-gray-50/30 dark:bg-black/5"
                    >
                      {/* Test Title Block */}
                      <div className="p-4 bg-gray-50 dark:bg-black/20 border-b border-gray-100 dark:border-gray-800/40">
                        <div className="text-xs font-bold text-[#8B0000] dark:text-[#ff4d4d] uppercase tracking-wider truncate">
                          {test.testType || 'MOCK TEST'}
                        </div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white mt-0.5 truncate">
                          {test.testTitle}
                        </h4>
                        <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400 mt-2">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {test.totalParticipants} Participants
                          </span>
                          <span>•</span>
                          <span>{test.totalQuestions} Questions</span>
                        </div>
                      </div>

                      {/* Participant list */}
                      <div className="p-3 divide-y divide-gray-100 dark:divide-gray-800/40 max-h-[250px] overflow-y-auto">
                        {(test.entries || []).length === 0 ? (
                          <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                            No students match your query.
                          </div>
                        ) : (
                          (test.entries || []).map((student: any) => (
                            <div key={student.studentId} className="py-3 flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="font-bold text-gray-900 dark:text-white truncate">
                                  {student.studentName}
                                </div>
                                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                  Roll: {student.rollNumber}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-gray-900 dark:text-white">
                                  {student.obtainedMarks} / {student.totalMarks}
                                </div>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-1 uppercase ${
                                  student.status === 'pass'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                }`}>
                                  {student.status || 'fail'}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
