import React, { useEffect, useState } from 'react';
import { CourseApi } from '../core/services';
import { Plus, Search, Folder, FolderOpen, ChevronRight, ChevronDown, Video, Grid, List, PlayCircle, Clock, CheckCircle, Edit, Trash2, UploadCloud, MonitorPlay } from 'lucide-react';
import { LiveSessionApi } from '../core/services';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../core/auth/AuthProvider';
import { AdminButton } from '../components/admin-ui';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast/ToastContext';
import { ScheduleSessionDialog } from './ScheduleSessionDialog';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const VideosPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const isAdminOrStaff = role === 'super_admin' || role === 'staff' || role === 'admin' || role === 'teacher';
  const { success, error } = useToast();
  
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Folder State
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  
  const [selectedFolder, setSelectedFolder] = useState<{ type: 'global' | 'course' | 'subject' | 'topic', id: string, name: string }>({ type: 'global', id: '', name: 'Global Content' });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [contentCreationType, setContentCreationType] = useState<'none' | 'open'>('none');
  const [defaultProvider, setDefaultProvider] = useState<'upload' | 'youtube' | 'zoom' | 'google_meet'>('upload');
  const [editingClass, setEditingClass] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const handleDelete = (rec: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirm(rec);
  };

  const performDelete = async (rec: any) => {
    setIsDeleting(true);
    try {
      setAllClasses(prev => prev.filter(c => c.id !== rec.id));
      
      if (rec.liveSession?.id) {
        try {
          await LiveSessionApi.deleteSession(rec.liveSession.id);
        } catch (sessionErr) {
          console.warn('Live session could not be deleted (might not exist)', sessionErr);
        }
      }
      
      await CourseApi.deleteClass(rec.id);
      success('Content deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
    } catch (err) {
      console.error(err);
      error('Failed to delete content.');
      fetchData(); // revert optimistic
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (rec: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClass(rec);
    setIsScheduleModalOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdminOrStaff) {
        const [cRes, sRes, tRes, classRes] = await Promise.all([
          CourseApi.listCourses(),
          CourseApi.listAllSubjects(),
          CourseApi.listAllTopics(),
          CourseApi.listAllClasses()
        ]);
        setCourses(cRes.data?.data || cRes.data || []);
        setSubjects(sRes.data?.data || sRes.data || []);
        setTopics(tRes.data?.data || tRes.data || []);
        setAllClasses(classRes.data?.data || classRes.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedFolders(newExpanded);
  };

  const handleSelectFolder = (type: 'global' | 'course' | 'subject' | 'topic', id: string, name: string) => {
    setSelectedFolder({ type, id, name });
  };

  // Filter classes by selected folder and search query
  const filteredClasses = allClasses.filter(cls => {
    // 1. Search Filter
    if (search && !cls.title?.toLowerCase().includes(search.toLowerCase())) return false;
    
    // 2. Folder Filter
    if (selectedFolder.type === 'global') return true;
    
    const recTopic = topics.find(t => t.id === cls.topicId);
    if (!recTopic) return false;

    if (selectedFolder.type === 'topic') return cls.topicId === selectedFolder.id;
    if (selectedFolder.type === 'subject') return recTopic.subjectId === selectedFolder.id;
    if (selectedFolder.type === 'course') {
      const recSubj = subjects.find(s => s.id === recTopic.subjectId);
      return recSubj && recSubj.courseId === selectedFolder.id;
    }
    return true;
  });

  const filteredUploads = filteredClasses.filter(c => c.classType === 'recorded' && !c.encryptedVideoId?.includes('youtube') && !c.recordingUrl?.includes('youtube'));
  const filteredYouTube = filteredClasses.filter(c => 
    c.classType === 'youtube_recorded' || 
    c.classType === 'youtube_live' || 
    c.liveSession?.provider === 'youtube' || 
    (c.classType === 'recorded' && (c.encryptedVideoId?.includes('youtube') || c.recordingUrl?.includes('youtube')))
  );
  const filteredZoom = filteredClasses.filter(c => c.classType === 'live' && c.liveSession?.provider !== 'google_meet');
  const filteredMeet = filteredClasses.filter(c => c.classType === 'live' && c.liveSession?.provider === 'google_meet');

  return (
    <div className="flex h-[calc(100vh-80px)] bg-transparent text-gray-900 dark:text-white overflow-hidden font-sans w-full">
      
      {/* LEFT SIDEBAR: FOLDER BROWSER */}
      <div className="w-72 bg-white dark:bg-[#1a1a2e] border-r border-gray-200 dark:border-[#8B0000]/30 flex flex-col shadow-sm shrink-0">
        <div className="p-5 border-b border-gray-200 dark:border-[#8B0000]/30 bg-gray-50 dark:bg-[#0f0f1a]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Video Library</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1">
          <div 
            onClick={() => handleSelectFolder('global', '', 'Global Videos')}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${selectedFolder.type === 'global' ? 'bg-[#8B0000]/10 text-[#8B0000] dark:text-[#ff8a80] font-bold' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            <Folder size={18} className={selectedFolder.type === 'global' ? 'fill-[#8B0000]/20 text-[#8B0000]' : 'text-gray-400'} />
            <span className="truncate">Global Videos</span>
          </div>

          <div className="my-2 px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Course Folders
          </div>

          {courses.map(course => {
            const isCourseExpanded = expandedFolders.has(course.id);
            const isCourseSelected = selectedFolder.type === 'course' && selectedFolder.id === course.id;
            const courseSubjects = subjects.filter(s => s.courseId === course.id);
            
            return (
              <div key={course.id} className="space-y-0.5">
                <div 
                  onClick={() => handleSelectFolder('course', course.id, course.title || course.name)}
                  className={`flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-colors ${isCourseSelected ? 'bg-[#8B0000]/10 text-[#8B0000] dark:text-[#ff8a80] font-bold' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <button onClick={(e) => toggleFolder(course.id, e)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors text-gray-500 dark:text-gray-400">
                    {isCourseExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  {isCourseExpanded ? <FolderOpen size={16} className="text-amber-500 fill-amber-500/20" /> : <Folder size={16} className="text-amber-500" />}
                  <span className="truncate text-sm">{course.title || course.name}</span>
                </div>

                <AnimatePresence>
                  {isCourseExpanded && (
                    <motion.div 
                       initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="ml-6 space-y-0.5 overflow-hidden border-l border-gray-200 dark:border-white/5 pl-2"
                    >
                      {courseSubjects.map(subject => {
                        const isSubjectExpanded = expandedFolders.has(subject.id);
                        const isSubjectSelected = selectedFolder.type === 'subject' && selectedFolder.id === subject.id;
                        const subjectTopics = topics.filter(t => t.subjectId === subject.id);
                        
                        return (
                          <div key={subject.id} className="space-y-0.5">
                            <div 
                              onClick={() => handleSelectFolder('subject', subject.id, subject.name)}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer transition-colors ${isSubjectSelected ? 'bg-[#8B0000]/10 text-[#8B0000] dark:text-[#ff8a80] font-bold' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                            >
                              <button onClick={(e) => toggleFolder(subject.id, e)} className="p-1 hover:bg-gray-205 dark:hover:bg-white/10 rounded-md transition-colors text-gray-500 dark:text-gray-400">
                                {isSubjectExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                              </button>
                              {isSubjectExpanded ? <FolderOpen size={14} className="text-blue-500 fill-blue-500/20" /> : <Folder size={14} className="text-blue-500" />}
                              <span className="truncate text-xs">{subject.name}</span>
                            </div>

                            <AnimatePresence>
                              {isSubjectExpanded && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="ml-6 space-y-0.5 overflow-hidden border-l border-gray-200 dark:border-white/5 pl-2"
                                >
                                  {subjectTopics.map(topic => {
                                    const isTopicSelected = selectedFolder.type === 'topic' && selectedFolder.id === topic.id;
                                    return (
                                      <div 
                                        key={topic.id}
                                        onClick={() => handleSelectFolder('topic', topic.id, topic.name || topic.title)}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer transition-colors ${isTopicSelected ? 'bg-[#8B0000]/10 text-[#8B0000] dark:text-[#ff8a80] font-bold' : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
                                      >
                                        <Folder size={12} className="text-emerald-500 ml-4" />
                                        <span className="truncate text-xs">{topic.name || topic.title}</span>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>
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

      {/* MAIN CONTENT: FILE BROWSER */}
      <div className="flex-1 flex flex-col bg-transparent relative">
        <div className="h-20 border-b border-gray-200 dark:border-[#8B0000]/30 flex items-center justify-between px-8 bg-white/80 dark:bg-[#1a1a2e]/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <FolderOpen className="text-[#8B0000] dark:text-[#ff8a80]" size={28} />
              {selectedFolder.name}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="hover:text-[#8B0000] dark:hover:text-[#ff8a80] cursor-pointer transition-colors">Library</span>
              <ChevronRight size={12} />
              <span className="capitalize">{selectedFolder.type}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search content..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-64 bg-gray-50 dark:bg-[#0f0f1a] border border-gray-200 dark:border-[#8B0000]/30 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-[#8B0000] transition-colors"
              />
            </div>
            
            <div className="flex bg-gray-100 dark:bg-[#0f0f1a] p-1 rounded-xl border border-gray-200 dark:border-[#8B0000]/30 shadow-inner">
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#8B0000]/20 text-[#8B0000] dark:text-[#ff8a80]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                <Grid size={16} />
              </button>
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-[#8B0000]/20 text-[#8B0000] dark:text-[#ff8a80]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                <List size={16} />
              </button>
            </div>

            {isAdminOrStaff && (
              <div className="relative">
                <AdminButton onClick={() => setContentCreationType(contentCreationType === 'none' ? 'open' : 'none')}>
                  <div className="flex items-center gap-2">
                    <Plus size={16} />
                    Create Academic Content
                  </div>
                </AdminButton>
                {contentCreationType !== 'none' && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl shadow-lg z-50 overflow-hidden">
                    <button onClick={() => { setDefaultProvider('upload'); setIsScheduleModalOpen(true); setContentCreationType('none'); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-sm transition-colors border-b border-gray-100 dark:border-white/10 flex items-center gap-3">
                      <div className="p-2 bg-[#8B0000]/10 rounded-lg"><UploadCloud size={16} className="text-[#8B0000] dark:text-[#ff8a80]" /></div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">Uploaded Video</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">MP4, MOV, Drive</div>
                      </div>
                    </button>
                    <button onClick={() => { setDefaultProvider('youtube'); setIsScheduleModalOpen(true); setContentCreationType('none'); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-sm transition-colors border-b border-gray-100 dark:border-white/10 flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-lg"><MonitorPlay size={16} className="text-red-500" /></div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">YouTube Lecture</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Public, Private, Unlisted</div>
                      </div>
                    </button>
                    <button onClick={() => { setDefaultProvider('zoom'); setIsScheduleModalOpen(true); setContentCreationType('none'); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-sm transition-colors border-b border-gray-100 dark:border-white/10 flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg"><Video size={16} className="text-blue-500" /></div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">Zoom Live Class</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Meeting SDK integration</div>
                      </div>
                    </button>
                    <button onClick={() => { setDefaultProvider('google_meet'); setIsScheduleModalOpen(true); setContentCreationType('none'); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 text-sm transition-colors flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg"><Video size={16} className="text-green-500" /></div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white">Google Meet Class</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Meet Link & Attendance</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative" onClick={() => setContentCreationType('none')}>
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-48 bg-surface border border-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <FolderOpen size={40} className="text-primary/50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Folder is empty</h3>
              <p className="text-gray-400 max-w-sm mb-8">No academic content available in this directory yet.</p>
              {isAdminOrStaff && (
                <div className="flex gap-4">
                  <button onClick={() => { setDefaultProvider('upload'); setIsScheduleModalOpen(true); }} className="text-primary font-medium hover:text-primary/80">+ Upload Video</button>
                  <button onClick={() => { setDefaultProvider('zoom'); setIsScheduleModalOpen(true); }} className="text-primary font-medium hover:text-primary/80">+ Schedule Live Session</button>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="space-y-8">
              {filteredUploads.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">Uploaded Videos</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                      {filteredUploads.map((rec, idx) => (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-[#1E1E1E] border border-white/5 rounded-2xl p-5 hover:border-primary/30 hover:shadow-[0_8px_30px_rgba(168,85,247,0.1)] transition-all group flex flex-col"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-transparent rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                              <UploadCloud className="w-8 h-8 text-primary" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="success">AVAILABLE</Badge>
                              {isAdminOrStaff && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => handleEdit(rec, e)} className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-blue-400"><Edit size={14} /></button>
                                  <button onClick={(e) => handleDelete(rec, e)} className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-white text-lg mb-1 truncate" title={rec.title}>{rec.title || rec.name}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1">{rec.description || 'Uploaded Lecture'}</p>
                          
                          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={14} />
                              {rec.expectedDurationMinutes || 60} min
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(rec.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {filteredYouTube.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4">YouTube Lectures</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                      {filteredYouTube.map((rec, idx) => (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-[#1E1E1E] border border-white/5 rounded-2xl p-5 hover:border-red-500/30 hover:shadow-[0_8px_30px_rgba(239,68,68,0.1)] transition-all group flex flex-col"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-transparent rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                              <MonitorPlay className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant="success">AVAILABLE</Badge>
                              {isAdminOrStaff && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => handleEdit(rec, e)} className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-blue-400"><Edit size={14} /></button>
                                  <button onClick={(e) => handleDelete(rec, e)} className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-white text-lg mb-1 truncate" title={rec.title}>{rec.title || rec.name}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1">{rec.description || 'YouTube Lecture'}</p>
                          
                          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={14} />
                              {rec.expectedDurationMinutes || 60} min
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(rec.createdAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {filteredZoom.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4 mt-8">Zoom Meetings</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                      {filteredZoom.map((rec, idx) => (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => navigate('/admin/classes')}
                          className="bg-[#1E1E1E] border border-white/5 rounded-2xl p-5 hover:border-blue-500/30 hover:shadow-[0_8px_30px_rgba(59,130,246,0.1)] transition-all group flex flex-col cursor-pointer"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-transparent rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                              <Video className="w-8 h-8 text-blue-500" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={rec.liveSession?.status === 'LIVE' ? 'success' : 'info'}>{rec.liveSession?.status || 'SCHEDULED'}</Badge>
                              {isAdminOrStaff && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); handleEdit(rec, e); }} className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-blue-400"><Edit size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(rec, e); }} className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-white text-lg mb-1 truncate" title={rec.title}>{rec.title || rec.name}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1">{rec.description || 'Zoom Class'}</p>
                          
                          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={14} />
                              {rec.liveSession?.scheduledStartTime ? new Date(rec.liveSession.scheduledStartTime).toLocaleString() : 'TBD'}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {filteredMeet.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-white mb-4 mt-8">Google Meet Classes</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                      {filteredMeet.map((rec, idx) => (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => navigate('/admin/classes')}
                          className="bg-[#1E1E1E] border border-white/5 rounded-2xl p-5 hover:border-green-500/30 hover:shadow-[0_8px_30px_rgba(34,197,94,0.1)] transition-all group flex flex-col cursor-pointer"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-transparent rounded-xl shadow-inner group-hover:scale-110 transition-transform">
                              <Video className="w-8 h-8 text-green-500" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={rec.liveSession?.status === 'LIVE' ? 'success' : 'info'}>{rec.liveSession?.status || 'SCHEDULED'}</Badge>
                              {isAdminOrStaff && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); handleEdit(rec, e); }} className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-blue-400"><Edit size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDelete(rec, e); }} className="p-1 hover:bg-white/10 rounded-md text-gray-400 hover:text-red-400"><Trash2 size={14} /></button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-white text-lg mb-1 truncate" title={rec.title}>{rec.title || rec.name}</h3>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-4 flex-1">{rec.description || 'Google Meet Class'}</p>
                          
                          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock size={14} />
                              {rec.liveSession?.scheduledStartTime ? new Date(rec.liveSession.scheduledStartTime).toLocaleString() : 'TBD'}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1a1a2e] border border-gray-200 dark:border-[#8B0000]/30 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#8B0000]/30 bg-gray-50 dark:bg-[#0f0f1a]">
                    <th className="p-5 font-bold text-gray-900 dark:text-gray-300 text-xs uppercase tracking-wider">Content Title</th>
                    <th className="p-5 font-bold text-gray-900 dark:text-gray-300 text-xs uppercase tracking-wider">Provider</th>
                    <th className="p-5 font-bold text-gray-900 dark:text-gray-300 text-xs uppercase tracking-wider">Academic Context</th>
                    <th className="p-5 font-bold text-gray-900 dark:text-gray-300 text-xs uppercase tracking-wider">Duration / Date</th>
                    <th className="p-5 font-bold text-gray-900 dark:text-gray-300 text-xs uppercase tracking-wider">Status</th>
                    {isAdminOrStaff && <th className="p-5 font-bold text-gray-900 dark:text-gray-300 text-xs uppercase tracking-wider text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map(rec => {
                    const topic = topics.find(t => t.id === rec.topicId);
                    const subject = subjects.find(s => s.id === topic?.subjectId);
                    const course = courses.find(c => c.id === subject?.courseId);
                    
                    let isYoutube = rec.classType === 'youtube_recorded' || rec.classType === 'youtube_live' || rec.liveSession?.provider === 'youtube' || (rec.classType === 'recorded' && (rec.encryptedVideoId?.includes('youtube') || rec.recordingUrl?.includes('youtube')));
                    let isMeet = rec.classType === 'live' && rec.liveSession?.provider === 'google_meet';
                    let isZoom = rec.classType === 'live' && rec.liveSession?.provider !== 'google_meet' && rec.liveSession?.provider !== 'youtube';
                    let isUpload = rec.classType === 'recorded' && !isYoutube;
 
                    return (
                      <tr 
                        key={rec.id} 
                        className="border-b border-gray-200 dark:border-[#8B0000]/20 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group text-gray-900 dark:text-white"
                      >
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-50 dark:bg-[#0f0f1a] rounded-lg shadow-inner">
                              {isUpload && <UploadCloud className="w-6 h-6 text-[#8B0000] dark:text-[#ff8a80]" />}
                              {isYoutube && <MonitorPlay className="w-6 h-6 text-red-500" />}
                              {isZoom && <Video className="w-6 h-6 text-blue-500" />}
                              {isMeet && <Video className="w-6 h-6 text-green-500" />}
                            </div>
                            <div>
                              {rec.classType === 'live' ? (
                                <button onClick={() => navigate('/admin/classes')} className="font-bold text-[#8B0000] dark:text-[#ff8a80] text-[15px] hover:underline text-left">
                                  {rec.title || rec.name}
                                </button>
                              ) : (
                                <p className="font-bold text-gray-900 dark:text-white text-[15px]">{rec.title || rec.name}</p>
                              )}
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[250px]">{rec.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          {isUpload && <Badge variant="success">UPLOADED VIDEO</Badge>}
                          {isYoutube && <Badge variant="destructive">YOUTUBE LECTURE</Badge>}
                          {isZoom && <Badge variant="info">ZOOM CLASS</Badge>}
                          {isMeet && <Badge variant="warning">GOOGLE MEET CLASS</Badge>}
                        </td>
                        <td className="p-5">
                          <div className="flex flex-col gap-1">
                            {course ? (
                              <>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{course.title || course.name}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{subject?.name} &gt; {topic?.title || topic?.name}</span>
                              </>
                            ) : (
                              <span className="text-sm text-gray-400 italic">Uncategorized</span>
                            )}
                          </div>
                        </td>
                        <td className="p-5 text-sm text-gray-500 dark:text-gray-400 font-medium">
                          {rec.classType === 'live' 
                            ? (rec.liveSession?.scheduledStartTime ? new Date(rec.liveSession.scheduledStartTime).toLocaleString() : 'TBD')
                            : `${rec.expectedDurationMinutes || 60} mins`}
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={14} className={rec.classType === 'live' && rec.liveSession?.status !== 'LIVE' ? 'text-gray-400' : 'text-emerald-500'} />
                            <span className={`text-sm font-semibold ${rec.classType === 'live' && rec.liveSession?.status !== 'LIVE' ? 'text-gray-400' : 'text-emerald-500'}`}>
                              {rec.classType === 'live' ? (rec.liveSession?.status || 'SCHEDULED') : 'Published'}
                            </span>
                          </div>
                        </td>
                        {isAdminOrStaff && (
                          <td className="p-5 text-right">
                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => handleEdit(rec, e)} className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400" title="Edit">
                                <Edit size={16} />
                              </button>
                              <button onClick={(e) => handleDelete(rec, e)} className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400" title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ScheduleSessionDialog 
        isOpen={isScheduleModalOpen} 
        onClose={() => { setIsScheduleModalOpen(false); setEditingClass(null); }} 
        onSuccess={() => { setIsScheduleModalOpen(false); setEditingClass(null); fetchData(); }}
        editingClass={editingClass}
        prefilledTopicId={selectedFolder.type === 'topic' ? selectedFolder.id : undefined}
        defaultProvider={defaultProvider}
      />

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-nermai-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/50 to-orange-500/50"></div>
            <h3 className="text-xl font-bold text-white mb-2">Confirm Delete</h3>
            <p className="text-gray-400 mb-6 text-sm">
              Are you sure you want to delete <span className="text-white font-medium">{deleteConfirm.title || deleteConfirm.name}</span>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={() => performDelete(deleteConfirm)} 
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20 shadow-lg shadow-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting && <div className="w-4 h-4 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


