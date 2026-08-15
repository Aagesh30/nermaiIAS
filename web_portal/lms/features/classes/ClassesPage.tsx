import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { AdminTable, AdminModal, AdminInput, AdminSelect, AdminButton } from '../../components/ui';
import { CourseApi, LiveSessionApi } from '@nermai/api';
import { ScheduleSessionDialog } from './ScheduleSessionDialog';

export const ClassesPage = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [isExtending, setIsExtending] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (cls: any) => {
    setDeleteConfirm(cls.id);
  };

  const performDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await CourseApi.deleteClass(id);
      fetchData();
    } catch (error) {
      console.error('Failed to delete class', error);
      alert('Failed to delete class');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };
  
  // Track notified classes to avoid spamming
  const [notifiedClasses, setNotifiedClasses] = useState<Record<string, { tenMin: boolean, twoMin: boolean }>>({});
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topicId: '',
    classType: 'youtube_recorded',
    accessLevel: 'premium',
    youtubeUrl: '',
    meetingNumber: '',
    scheduledStartTime: '',
    expectedDurationMinutes: 60,
    minimumAttendancePercentage: 50,
    order: 0
  });

  const [extendData, setExtendData] = useState({ minutes: 30, reason: '' });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [classRes, topicRes] = await Promise.all([
        CourseApi.listAllClasses(),
        CourseApi.listAllTopics()
      ]);
      setClasses(classRes.data?.data || []);
      setTopics(topicRes.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 10-minute and 2-minute reminders
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      classes.forEach(cls => {
        if (!cls.scheduledStartTime) return;
        
        const expectedDurationMs = (cls.expectedDurationMinutes || 60) * 60 * 1000;
        const extensionMs = (cls.extensionMinutes || 0) * 60 * 1000;
        const gracePeriodMs = 2 * 60 * 1000;
        const baseStart = cls.actualStartTime ? new Date(cls.actualStartTime).getTime() : new Date(cls.scheduledStartTime).getTime();
        const effectiveEnd = baseStart + expectedDurationMs + extensionMs + gracePeriodMs;
        const start = baseStart;

        if (now >= start && now < effectiveEnd && !cls.actualEndTime) {
          const remainingSeconds = (effectiveEnd - now) / 1000;
          
          if (remainingSeconds <= 600 && remainingSeconds > 590) { // Around 10 mins
            if (!notifiedClasses[cls.id]?.tenMin) {
              setNotifiedClasses(prev => ({ ...prev, [cls.id]: { ...prev[cls.id], tenMin: true }}));
              alert(`Reminder: Class "${cls.title}" will end in 10 minutes. Extend if necessary.`);
            }
          }
          if (remainingSeconds <= 120 && remainingSeconds > 110) { // Around 2 mins
            if (!notifiedClasses[cls.id]?.twoMin) {
              setNotifiedClasses(prev => ({ ...prev, [cls.id]: { ...prev[cls.id], twoMin: true }}));
              alert(`Critical: Class "${cls.title}" will end in 2 minutes!`);
            }
          }
        }
      });
    }, 10000); // check every 10 seconds

    return () => clearInterval(timer);
  }, [classes, notifiedClasses]);

  const getDerivedLiveStatus = (cls: any) => {
    if (!cls.scheduledStartTime) return 'N/A';
    if (cls.actualEndTime) return 'ENDED';
    const now = Date.now();
    const expectedDurationMs = (cls.expectedDurationMinutes || 60) * 60 * 1000;
    const extensionMs = (cls.extensionMinutes || 0) * 60 * 1000;
    const gracePeriodMs = 2 * 60 * 1000;
    const baseStart = cls.actualStartTime ? new Date(cls.actualStartTime).getTime() : new Date(cls.scheduledStartTime).getTime();
    const effectiveEnd = baseStart + expectedDurationMs + extensionMs + gracePeriodMs;
    const start = baseStart;
    if (now < start) return 'SCHEDULED';
    if (now >= start && now < effectiveEnd) return 'LIVE';
    return 'ENDED';
  };

  const handleOpenModal = (cls: any = null) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        title: cls.title,
        description: cls.description || '',
        topicId: cls.topicId,
        classType: cls.classType,
        accessLevel: cls.accessLevel || 'premium',
        youtubeUrl: '', // Clear for security/re-entry
        meetingNumber: cls.meetingNumber || '',
        scheduledStartTime: cls.scheduledStartTime || cls.scheduledAt || '',
        expectedDurationMinutes: cls.expectedDurationMinutes || 60,
        minimumAttendancePercentage: cls.minimumAttendancePercentage ?? 50,
        order: cls.order || 0
      });
    } else {
      setEditingClass(null);
      setFormData({
        title: '',
        description: '',
        topicId: '',
        classType: 'youtube_recorded',
        accessLevel: 'premium',
        youtubeUrl: '',
        meetingNumber: '',
        scheduledStartTime: '',
        expectedDurationMinutes: 60,
        minimumAttendancePercentage: 50,
        order: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleStartSession = async (cls: any) => {
    if (!window.confirm(`Are you sure you want to manually start ${cls.title}?`)) return;
    try {
      await LiveSessionApi.startSession(cls.sessionId || cls.id);
      alert('Session started manually.');
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to start session');
    }
  };

  const handleEndSession = async (cls: any) => {
    if (!window.confirm(`Are you sure you want to end ${cls.title}?`)) return;
    try {
      await LiveSessionApi.endSession(cls.sessionId || cls.id);
      alert('Session ended and attendance reconciliation triggered.');
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to end session');
    }
  };

  const handleOpenExtendModal = (cls: any) => {
    setEditingClass(cls);
    setExtendData({ minutes: 15, reason: '' });
    setIsExtendModalOpen(true);
  };

  const handleExtendSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || isExtending) return;
    setIsExtending(true);
    try {
      await LiveSessionApi.extendSession(editingClass.sessionId || editingClass.id, {
        minutes: extendData.minutes,
        reason: extendData.reason || undefined
      });
      setIsExtendModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      alert('Failed to extend session');
    } finally {
      setIsExtending(false);
    }
  };

  const handleOpenUploadModal = (cls: any) => {
    setEditingClass(cls);
    setFormData((prev) => ({ ...prev, youtubeUrl: '' }));
    setIsUploadModalOpen(true);
  };

  const handleUploadRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass || !formData.youtubeUrl) return;
    try {
      await CourseApi.uploadClassRecording(editingClass.id, { youtubeUrl: formData.youtubeUrl });
      await fetchData();
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error('Failed to upload recording', error);
      alert('Failed to upload recording');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topicId) {
      alert('Please select a topic.');
      return;
    }

    try {
      const submitData: any = { ...formData };
      if (!submitData.youtubeUrl) {
        delete submitData.youtubeUrl;
      }
      if (!submitData.meetingNumber) {
        delete submitData.meetingNumber;
      }

      if (editingClass) {
        await CourseApi.updateClass(editingClass.id, submitData);
      } else {
        await CourseApi.createClass(submitData.topicId, submitData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Failed to save class', error.response?.data || error);
      alert('Error saving class. Check console.');
    }
  };

  const columns = [
    { key: 'title', label: 'Class Title' },
    { key: 'topicId', label: 'Topic', render: (val: string) => topics.find(t => t.id === val)?.name || topics.find(t => t.id === val)?.title || val },
    { key: 'status', label: 'Status', render: (val: string, row: any) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${(val || 'active') === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
        {(val || 'active').toUpperCase()}
      </span>
    )},
    { key: 'accessLevel', label: 'Access', render: (val: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${val === 'free' ? 'bg-gray-500/20 text-gray-400' : val === 'batch' ? 'bg-purple-500/20 text-purple-400' : 'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
        {(val || 'premium').toUpperCase()}
      </span>
    )},
    { key: 'liveStatus', label: 'Live Status', render: (_: any, row: any) => {
      const derived = getDerivedLiveStatus(row);
      return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          derived === 'LIVE' ? 'bg-green-500/20 text-green-400' : 
          derived === 'SCHEDULED' ? 'bg-yellow-500/20 text-yellow-400' : 
          derived === 'ENDED' ? 'bg-red-500/20 text-red-400' : 
          'text-gray-400'
        }`}>
          {derived || 'N/A'}
        </span>
        {derived === 'SCHEDULED' || (derived === 'LIVE' && !row.actualStartTime) ? (
          <button 
            onClick={() => handleStartSession(row)}
            className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 px-2 py-1 rounded"
          >
            Start Session
          </button>
        ) : null}
        {derived === 'LIVE' && (
          <>
            <button 
              onClick={() => handleOpenExtendModal(row)}
              className="text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40 px-2 py-1 rounded"
            >
              Extend
            </button>
            <button 
              onClick={() => handleEndSession(row)}
              className="text-xs bg-red-500/20 text-red-400 hover:bg-red-500/40 px-2 py-1 rounded"
            >
              End Now
            </button>
          </>
        )}
        {derived === 'ENDED' && (
          <button 
            onClick={() => handleOpenUploadModal(row)}
            className="text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 px-2 py-1 rounded"
          >
            Upload Rec
          </button>
        )}
      </div>
      );
    }},
    { key: 'order', label: 'Order' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Classes</h1>
          <p className="text-textSecondary text-sm mt-1">Manage individual classes and content.</p>
        </div>
        <AdminButton onClick={() => handleOpenModal()}>
          <Plus className="w-5 h-5" />
          Create Class
        </AdminButton>
      </div>

      <AdminTable 
        columns={columns} 
        data={classes} 
        isLoading={isLoading}
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      <ScheduleSessionDialog 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchData();
        }}
        editingClass={editingClass}
      />

      <AdminModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        title="Upload Recording URL"
      >
        <form onSubmit={handleUploadRecording} className="space-y-4">
          <p className="text-gray-400 text-sm">Upload the YouTube recording URL for the completed live class: <strong className="text-white">{editingClass?.title}</strong></p>
          <AdminInput 
            label="YouTube URL" 
            value={formData.youtubeUrl} 
            onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})} 
            required 
            placeholder="https://youtube.com/watch?v=..."
          />
          <div className="flex justify-end gap-2 mt-4">
            <AdminButton type="button" variant="secondary" onClick={() => setIsUploadModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit">Upload</AdminButton>
          </div>
        </form>
      </AdminModal>

      <AdminModal 
        isOpen={isExtendModalOpen} 
        onClose={() => setIsExtendModalOpen(false)} 
        title="Extend Live Session"
      >
        <form onSubmit={handleExtendSession} className="space-y-4">
          <p className="text-gray-400 text-sm">Add more time to the live class: <strong className="text-white">{editingClass?.title}</strong></p>
          
          <AdminSelect 
            label="Extension Minutes"
            value={extendData.minutes}
            onChange={(e) => setExtendData({...extendData, minutes: Number(e.target.value)})}
            required
            options={[
              { value: '5', label: '+5 Minutes' },
              { value: '10', label: '+10 Minutes' },
              { value: '15', label: '+15 Minutes' },
              { value: '30', label: '+30 Minutes' },
              { value: '45', label: '+45 Minutes' },
              { value: '60', label: '+60 Minutes' }
            ]}
          />

          <AdminInput 
            label="Reason (Optional)" 
            value={extendData.reason} 
            onChange={(e) => setExtendData({...extendData, reason: e.target.value})} 
            placeholder="e.g. Teacher started late"
          />

          <div className="flex justify-end gap-2 mt-4">
            <AdminButton type="button" variant="secondary" onClick={() => setIsExtendModalOpen(false)}>Cancel</AdminButton>
            <AdminButton type="submit" disabled={isExtending}>
              {isExtending ? 'Extending...' : 'Extend Session'}
            </AdminButton>
          </div>
        </form>
      </AdminModal>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-nermai-gray-900 border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Class</h3>
            <p className="text-gray-400 mb-6 text-sm">
              Are you sure you want to delete this class? This action cannot be undone.
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
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
