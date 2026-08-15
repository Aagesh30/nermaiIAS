import React, { useState, useEffect } from 'react';
import { AdminModal, AdminInput, AdminSelect, AdminButton } from '../components/admin-ui';
import { CourseApi, LiveSessionApi, ProviderAccountsApi, StaffApi } from '../core/services';
import { UploadCloud, Link as LinkIcon, Settings2, Video, Clock, CheckCircle, Calendar } from 'lucide-react';

export interface ScheduleSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingClass?: any;
  prefilledTopicId?: string;
  defaultProvider?: 'upload' | 'youtube' | 'zoom' | 'google_meet';
}

export const ScheduleSessionDialog: React.FC<ScheduleSessionDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingClass,
  prefilledTopicId,
  defaultProvider = 'zoom'
}) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [subtopics, setSubtopics] = useState<any[]>([]);
  
  const [providerAccounts, setProviderAccounts] = useState<any[]>([]);
  const [capabilities, setCapabilities] = useState<Record<string, any>>({});
  const [candidates, setCandidates] = useState<any>({ teachers: [], management: [], admins: [] });

  const [courseId, setCourseId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const formatDateLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const formatTimeLocal = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topicId: '',
    subtopicId: '',
    provider: defaultProvider,
    accessLevel: 'premium',
    startDate: '',
    startTime: '',
    expectedDurationMinutes: 60,
    minimumAttendancePercentage: 50,
    
    // New Fields
    meetingMode: 'create_new', // 'create_new' | 'use_existing'
    providerAccountId: 'auto',
    hostUrl: '',
    participantUrl: '',
    customProviderId: '',
    providerPasscode: '',
    hostKey: '',
    meetingCode: '',

    // Roles
    host: '',
    coHost: ''
  });

  const [ownershipPreset, setOwnershipPreset] = useState<'teacher' | 'admin' | 'management' | 'all'>('all');

  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLookups = async () => {
      try {
        const [cRes, sRes, tRes, subRes, pRes, capRes, candRes] = await Promise.all([
          CourseApi.listCourses(),
          CourseApi.listAllSubjects(),
          CourseApi.listAllTopics(),
          CourseApi.listAllSubtopics().catch(() => ({ data: { data: [] } })),
          ProviderAccountsApi.listAccounts().catch(() => ({ data: { data: [] } })),
          LiveSessionApi.getCapabilities().catch(() => ({ data: { data: {} } })),
          StaffApi.getLiveSessionCandidates().catch((err: any) => {
            // Do NOT silently swallow this. If the API fails, we need to know why.
            // A 404 here means the backend route is not registered (server not restarted after build).
            console.error('[ScheduleSessionDialog] /staff/live-session-candidates failed:', err?.response?.status, err?.message);
            // Return empty candidates so the dialog still opens, but log clearly
            return { data: { data: { teachers: [], management: [], admins: [] } } };
          })
        ]);
        
        setCourses(cRes.data?.data || cRes.data || []);
        const fetchedSubjects = sRes.data?.data || sRes.data || [];
        const fetchedTopics = tRes.data?.data || tRes.data || [];
        const fetchedSubtopics = subRes.data?.data || subRes.data || [];
        setSubjects(fetchedSubjects);
        setTopics(fetchedTopics);
        setSubtopics(fetchedSubtopics);
        setProviderAccounts(pRes.data?.data || []);
        setCapabilities(capRes.data?.data || {});
        const fetchedCandidates = candRes.data?.data || { teachers: [], management: [], admins: [] };
        console.log("===== FRONTEND CANDIDATES DEBUG =====");
        console.log("Raw Response:", candRes.data);
        console.log("Candidates object:", fetchedCandidates);
        console.log("=====================================");
        setCandidates(fetchedCandidates);

        if (editingClass) {
          const tId = editingClass.topicId;
          const topic = fetchedTopics.find((t: any) => t.id === tId);
          const subject = fetchedSubjects.find((s: any) => s.id === topic?.subjectId);
          
          if (subject) {
            setCourseId(subject.courseId);
            setSubjectId(subject.id);
          }

          let derivedProvider = defaultProvider;
          if (editingClass.classType === 'recorded') derivedProvider = 'upload';
          if (editingClass.classType === 'youtube_recorded') derivedProvider = 'youtube';
          if (editingClass.classType === 'live') {
            derivedProvider = editingClass.liveSession?.provider || 'zoom';
          }

          const d = editingClass.liveSession?.scheduledStartTime || editingClass.scheduledStartTime ? new Date(editingClass.liveSession?.scheduledStartTime || editingClass.scheduledStartTime) : new Date();

          setFormData({
            title: editingClass.title || editingClass.name || '',
            description: editingClass.description || '',
            topicId: tId,
            subtopicId: editingClass.subtopicId || '',
            provider: derivedProvider,
            accessLevel: editingClass.accessLevel || 'premium',
            startDate: formatDateLocal(d),
            startTime: formatTimeLocal(d),
            expectedDurationMinutes: editingClass.liveSession?.expectedDurationMinutes || editingClass.expectedDurationMinutes || 60,
            minimumAttendancePercentage: editingClass.minimumAttendancePercentage ?? 50,
            
            meetingMode: editingClass.liveSession?.hostId === 'manual' ? 'use_existing' : 'create_new',
            providerAccountId: editingClass.liveSession?.providerAccountId || 'auto',
            hostUrl: editingClass.liveSession?.launchPayload?.hostUrl || '',
            participantUrl: editingClass.liveSession?.launchPayload?.participantUrl || '',
            customProviderId: editingClass.liveSession?.providerSessionId || '',
            providerPasscode: editingClass.liveSession?.launchPayload?.passcode || '',
            hostKey: editingClass.liveSession?.launchPayload?.hostKey || '',
            meetingCode: editingClass.liveSession?.launchPayload?.meetingCode || '',
            
            host: editingClass.liveSession?.host ? JSON.stringify(editingClass.liveSession.host) : '',
            coHost: (editingClass.liveSession?.coHosts && editingClass.liveSession.coHosts.length > 0) 
              ? JSON.stringify({ userId: editingClass.liveSession.coHosts[0].userId, role: editingClass.liveSession.coHosts[0].role }) 
              : ''
          });
          
          if (derivedProvider === 'youtube' && editingClass.encryptedVideoId) {
            setYoutubeUrl(editingClass.encryptedVideoId);
          }

        } else if (prefilledTopicId) {
          const topic = fetchedTopics.find((t: any) => t.id === prefilledTopicId);
          const subject = fetchedSubjects.find((s: any) => s.id === topic?.subjectId);
          
          if (subject) {
            setCourseId(subject.courseId);
            setSubjectId(subject.id);
          }
          
          // Smart Defaults for date/time (round to next 30 min)
          const now = new Date();
          now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30);
          now.setSeconds(0);
          now.setMilliseconds(0);

          setFormData(prev => ({ 
            ...prev, 
            topicId: prefilledTopicId, 
            title: '', 
            description: '', 
            startDate: formatDateLocal(now),
            startTime: formatTimeLocal(now),
            expectedDurationMinutes: 60,
            provider: defaultProvider 
          }));
          setYoutubeUrl('');
          setFile(null);
        }
      } catch (err) {
        console.error('Failed to load lookups', err);
      }
    };

    fetchLookups();
  }, [isOpen, editingClass, prefilledTopicId, defaultProvider]);

  const filteredSubjects = subjects.filter(s => s.courseId === courseId);
  const filteredTopics = topics.filter(t => t.subjectId === subjectId);
  const filteredSubtopics = subtopics.filter(sub => sub.topicId === formData.topicId);
  const activeCapabilities = capabilities[formData.provider] || capabilities['youtube'] || {};
  const providerAccountsFiltered = providerAccounts.filter(p => p.provider === formData.provider && p.isActive);

  const isReadOnlySession = Boolean(
    editingClass?.classType === 'live' && 
    editingClass?.liveSession && 
    !['DRAFT', 'SCHEDULED'].includes(editingClass.liveSession.status)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topicId) return setErrorMsg('Please select a topic.');
    if (formData.provider === 'youtube' && !youtubeUrl && !editingClass) return setErrorMsg('Please provide a YouTube URL.');
    if (formData.provider === 'upload' && !file && !editingClass) return setErrorMsg('Please select a video file to upload.');
    if (formData.minimumAttendancePercentage < 1 || formData.minimumAttendancePercentage > 100) {
      return setErrorMsg('Minimum Attendance % must be between 1 and 100.');
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      if (editingClass) {
        // Update Class details (always allowed)
        await CourseApi.updateClass(editingClass.id, {
          title: formData.title,
          description: formData.description,
          topicId: formData.topicId,
          subtopicId: formData.subtopicId || undefined,
          accessLevel: formData.accessLevel,
          minimumAttendancePercentage: formData.minimumAttendancePercentage
        });
        
        // Update Session details ONLY if it's a live session
        if (editingClass.classType === 'live' && editingClass.liveSession?.id) {
          const timePart = formData.startTime.length <= 5 ? `${formData.startTime}:00` : formData.startTime;
          const localDate = new Date(`${formData.startDate}T${timePart.replace(/-/g, ':')}`);
          
          const updates: any = {
             scheduledStartTime: localDate.toISOString(),
             expectedDurationMinutes: formData.expectedDurationMinutes
          };

          if (formData.host) updates.host = JSON.parse(formData.host);
          if (formData.coHost) updates.coHosts = [JSON.parse(formData.coHost)];
          else updates.coHosts = [];
          
          if (formData.meetingMode === 'use_existing') {
            updates.providerSessionId = formData.customProviderId;
            updates.launchPayload = {
              ...(editingClass.liveSession.launchPayload || {}),
              passcode: formData.providerPasscode,
              hostKey: formData.hostKey
            };
            if (formData.hostUrl) updates.launchPayload.start_url = formData.hostUrl;
            if (formData.participantUrl) updates.launchPayload.join_url = formData.participantUrl;
          }

          await LiveSessionApi.editSession(editingClass.liveSession.id, updates);
        }
        
        if (formData.provider === 'youtube' && youtubeUrl) {
          const uploadData = new FormData();
          uploadData.append('youtubeUrl', youtubeUrl);
          uploadData.append('provider', 'youtube');
          await CourseApi.uploadClassRecording(editingClass.id, uploadData);
        }

      } else {
        // Create Class + Content
        let classType = 'live';
        if (formData.provider === 'upload') classType = 'recorded';
        if (formData.provider === 'youtube') classType = 'youtube_recorded';

        const res = await CourseApi.createClass(formData.topicId, {
          title: formData.title,
          description: formData.description,
          topicId: formData.topicId,
          subtopicId: formData.subtopicId || undefined,
          classType,
          accessLevel: formData.accessLevel,
          minimumAttendancePercentage: formData.minimumAttendancePercentage
        });
        
        const newClassId = res.data?.data?.id || res.data?.id;

        if (classType === 'live') {
          const timePart = formData.startTime.length <= 5 ? `${formData.startTime}:00` : formData.startTime;
          const localDate = new Date(`${formData.startDate}T${timePart.replace(/-/g, ':')}`);
          
          await LiveSessionApi.createSession({ 
            classId: newClassId, 
            provider: formData.provider,
            scheduledStartTime: localDate.toISOString(),
            expectedDurationMinutes: formData.expectedDurationMinutes,
            meetingMode: formData.meetingMode,
            providerAccountId: formData.providerAccountId,
            customProviderId: formData.customProviderId,
            providerPasscode: formData.providerPasscode,
            hostUrl: formData.hostUrl,
            participantUrl: formData.participantUrl,
            hostKey: formData.hostKey,
            meetingCode: formData.meetingCode,
            host: formData.host ? JSON.parse(formData.host) : undefined,
            coHosts: formData.coHost ? [JSON.parse(formData.coHost)] : []
          });
        } else if (classType === 'youtube_recorded') {
          const uploadData = new FormData();
          uploadData.append('youtubeUrl', youtubeUrl);
          uploadData.append('provider', 'youtube');
          await CourseApi.uploadClassRecording(newClassId, uploadData);
        } else if (classType === 'recorded' && file) {
          const uploadData = new FormData();
          uploadData.append('video', file);
          uploadData.append('provider', 'upload');
          await CourseApi.uploadClassRecording(newClassId, uploadData);
        }
      }
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AdminModal isOpen={isOpen} onClose={onClose} title={editingClass ? "Edit Session" : "Create Academic Content"}>
      <form onSubmit={handleSave} className="space-y-6">
        
        {isReadOnlySession && (
          <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] p-4 rounded-xl text-sm font-medium flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <span>This live session is currently <span className="font-bold">{editingClass.liveSession.status}</span>.</span>
            <span className="text-xs mt-1">Live meeting details cannot be modified, but class details (Title, Description, Attendance %) can still be updated.</span>
          </div>
        )}
        
        {/* Curriculum Hierarchy */}
        <div className="bg-surface-hover p-4 rounded-xl space-y-4 border border-border">
          <h3 className="text-sm font-semibold text-textPrimary flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-primary" />
            Curriculum Placement
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AdminSelect
              label="Course"
              value={courseId} 
              onChange={(e: any) => {
                const newCourseId = e.target.value;
                setCourseId(newCourseId);
                const subjs = subjects.filter(s => s.courseId === newCourseId);
                if (subjs.length === 1) {
                  setSubjectId(subjs[0].id);
                  const tops = topics.filter(t => t.subjectId === subjs[0].id);
                  const topVal = tops.length === 1 ? tops[0].id : '';
                  const subtops = subtopics.filter(sub => sub.topicId === topVal);
                  setFormData(p => ({ 
                    ...p, 
                    topicId: topVal,
                    subtopicId: subtops.length === 1 ? subtops[0].id : ''
                  }));
                } else {
                  setSubjectId('');
                  setFormData(p => ({ ...p, topicId: '', subtopicId: '' }));
                }
              }} 
              disabled={!!editingClass || !!prefilledTopicId}
              options={[
                { value: '', label: 'Select Course...' },
                ...courses.map(c => ({ value: c.id || '', label: c.title || c.name || '' }))
              ]}
            />
            <AdminSelect
              label="Subject"
              value={subjectId} 
              onChange={(e: any) => {
                const newSubjectId = e.target.value;
                setSubjectId(newSubjectId);
                const tops = topics.filter(t => t.subjectId === newSubjectId);
                if (tops.length === 1) {
                  const topVal = tops[0].id;
                  const subtops = subtopics.filter(sub => sub.topicId === topVal);
                  setFormData(p => ({ 
                    ...p, 
                    topicId: topVal,
                    subtopicId: subtops.length === 1 ? subtops[0].id : ''
                  }));
                } else {
                  setFormData(p => ({ ...p, topicId: '', subtopicId: '' }));
                }
              }} 
              disabled={!courseId || !!editingClass || !!prefilledTopicId}
              options={[
                { value: '', label: 'Select Subject...' },
                ...filteredSubjects.map(s => ({ value: s.id || '', label: s.title || s.name || '' }))
              ]}
            />
            <AdminSelect
              label="Topic"
              value={formData.topicId} 
              onChange={(e: any) => {
                const newTopicId = e.target.value;
                const subtops = subtopics.filter(sub => sub.topicId === newTopicId);
                setFormData({ 
                  ...formData, 
                  topicId: newTopicId,
                  subtopicId: subtops.length === 1 ? subtops[0].id : ''
                });
              }} 
              disabled={!subjectId || !!editingClass || !!prefilledTopicId}
              options={[
                { value: '', label: 'Select Topic...' },
                ...filteredTopics.map(t => ({ value: t.id || '', label: t.name || t.title || '' }))
              ]}
            />
            <AdminSelect
              label="Subtopic"
              value={formData.subtopicId} 
              onChange={(e: any) => setFormData({ ...formData, subtopicId: e.target.value })} 
              disabled={!formData.topicId || !!editingClass}
              options={[
                { value: '', label: 'Select Subtopic...' },
                ...filteredSubtopics.map(sub => ({ value: sub.id || '', label: sub.name || '' }))
              ]}
            />
          </div>
        </div>

        {/* Content Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminInput
              label="Title"
              value={formData.title} 
              onChange={(e: any) => setFormData({ ...formData, title: e.target.value })} 
              required 
            />
            
            <AdminSelect
              label="Content Type"
              value={formData.provider} 
              onChange={(e: any) => setFormData({ ...formData, provider: e.target.value as any })} 
              disabled={!!editingClass}
              options={[
                { value: 'upload', label: 'Video Upload (MP4)' },
                { value: 'youtube', label: 'YouTube Video' },
                { value: 'zoom', label: 'Zoom Live Class' }
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5 mb-4">
            <label className="text-sm font-medium text-[#E5E5E5]">Description (Optional)</label>
            <textarea
              className="bg-surface border border-accent/30 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-accent min-h-[100px]"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        {/* Provider Specific Workflows */}
        {formData.provider === 'upload' && (
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-surface-hover transition-colors">
            <UploadCloud className="w-8 h-8 text-textSecondary mx-auto mb-2" />
            <p className="text-sm text-textSecondary mb-4">Upload MP4 video file</p>
            <input type="file" accept="video/mp4" onChange={(e: any) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          </div>
        )}

        {formData.provider === 'youtube' && (
          <AdminInput 
            label="YouTube URL"
            placeholder="https://youtube.com/watch?v=..." 
            value={youtubeUrl} 
            onChange={(e: any) => setYoutubeUrl(e.target.value)} 
          />
        )}

        {(formData.provider === 'zoom' || formData.provider === 'google_meet') && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-background p-4 rounded-xl border border-border">
              <AdminInput 
                label="Date"
                type="date" 
                value={formData.startDate} 
                onChange={(e: any) => setFormData({ ...formData, startDate: e.target.value })} 
                required 
              />
              <AdminInput 
                label="Time"
                type="time" 
                value={formData.startTime} 
                onChange={(e: any) => setFormData({ ...formData, startTime: e.target.value })} 
                required 
              />
              <AdminInput 
                label="Expected Duration (Mins)"
                type="number" 
                min={15} 
                value={formData.expectedDurationMinutes} 
                onChange={(e: any) => setFormData({ ...formData, expectedDurationMinutes: Number(e.target.value) })} 
                required 
              />
            </div>

            <div className="bg-surface p-4 rounded-xl border border-border flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-textSecondary">Expected End Time</p>
                <p className="text-lg font-bold text-primary">
                  {(() => {
                    if (formData.startDate && formData.startTime && formData.expectedDurationMinutes) {
                      const timePart = formData.startTime.length <= 5 ? `${formData.startTime}:00` : formData.startTime;
                      const startObj = new Date(`${formData.startDate}T${timePart.replace(/-/g, ':')}`);
                      if (!isNaN(startObj.getTime())) {
                        const endObj = new Date(startObj.getTime() + formData.expectedDurationMinutes * 60000);
                        return endObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      }
                    }
                    return 'Invalid Time';
                  })()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-textSecondary mb-1">Duration</p>
                <span className="px-2 py-1 bg-surface-hover rounded text-xs text-textPrimary font-semibold">{formData.expectedDurationMinutes} mins</span>
              </div>
            </div>

            <div className="bg-background p-4 rounded-xl border border-border">
              <AdminInput 
                label="Minimum Attendance % (Mandatory)"
                type="number" 
                min={1} 
                max={100} 
                value={formData.minimumAttendancePercentage} 
                onChange={(e: any) => setFormData({ ...formData, minimumAttendancePercentage: Number(e.target.value) })} 
                required 
              />
              <p className="text-xs text-textSecondary mt-1">Determines the percentage of time a student must be present to be marked as attended.</p>
            </div>

            <div className="bg-background p-4 rounded-xl border border-border space-y-4">
              <div className="border-b border-border pb-3">
                <p className="text-sm font-medium text-textPrimary mb-2">Meeting Ownership</p>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="ownershipPreset" 
                      className="text-primary focus:ring-primary"
                      checked={ownershipPreset === 'teacher'}
                      onChange={() => {
                        setOwnershipPreset('teacher');
                        setFormData({ 
                          ...formData, 
                          host: '',
                          coHost: '' 
                        });
                      }} 
                    />
                    <span className="text-sm font-medium text-textPrimary">Teacher hosts</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="ownershipPreset" 
                      className="text-primary focus:ring-primary"
                      checked={ownershipPreset === 'admin'}
                      onChange={() => {
                        setOwnershipPreset('admin');
                        setFormData({ 
                          ...formData, 
                          host: '',
                          coHost: ''
                        });
                      }} 
                    />
                    <span className="text-sm font-medium text-textPrimary">Admin hosts</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="ownershipPreset" 
                      className="text-primary focus:ring-primary"
                      checked={ownershipPreset === 'management'}
                      onChange={() => {
                        setOwnershipPreset('management');
                        setFormData({ 
                          ...formData, 
                          host: '',
                          coHost: ''
                        });
                      }} 
                    />
                    <span className="text-sm font-medium text-textPrimary">Management hosts</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {(() => {
                  let hostOptions: { value: string; label: string; disabled?: boolean }[] = [{ value: '', label: '[ Select User ]' }];
                  
                  if (ownershipPreset === 'teacher' || ownershipPreset === 'all') {
                    if (candidates.teachers.length === 0 && ownershipPreset === 'teacher') {
                      hostOptions.push({ value: 'disabled_teachers', label: 'No teachers available', disabled: true });
                    } else {
                      hostOptions.push(...candidates.teachers.map((c: any) => ({ value: JSON.stringify({ userId: c.id, role: 'TEACHER' }), label: `${c.name} (TEACHER)` })));
                    }
                  }

                  if (ownershipPreset === 'management' || ownershipPreset === 'all') {
                    if (candidates.management.length === 0 && ownershipPreset === 'management') {
                      hostOptions.push({ value: 'disabled_management', label: 'No management staff available', disabled: true });
                    } else {
                      hostOptions.push(...candidates.management.map((c: any) => ({ value: JSON.stringify({ userId: c.id, role: 'MANAGEMENT' }), label: `${c.name} (MANAGEMENT)` })));
                    }
                  }

                  if (ownershipPreset === 'admin' || ownershipPreset === 'all') {
                    if (candidates.admins.length === 0 && ownershipPreset === 'admin') {
                      hostOptions.push({ value: 'disabled_admins', label: 'No admins available', disabled: true });
                    } else {
                      hostOptions.push(...candidates.admins.map((c: any) => ({ value: JSON.stringify({ userId: c.id, role: 'ADMIN' }), label: `${c.name} (ADMIN)` })));
                    }
                  }

                  return (
                    <AdminSelect
                      label="Host *"
                      value={formData.host}
                      onChange={(e: any) => {
                        if (!e.target.value.startsWith('disabled_')) setFormData({ ...formData, host: e.target.value });
                      }}
                      required
                      options={hostOptions}
                    />
                  );
                })()}

                <AdminSelect
                  label="Co-Host (Optional)"
                  value={formData.coHost}
                  onChange={(e: any) => setFormData({ ...formData, coHost: e.target.value })}
                  options={[
                    { value: '', label: '[ None ]' },
                    ...candidates.teachers
                        .filter((c: any) => !formData.host || formData.host.startsWith('disabled_') || JSON.parse(formData.host).userId !== c.id)
                        .map((c: any) => ({ value: JSON.stringify({ userId: c.id, role: 'TEACHER' }), label: `${c.name} (TEACHER)` })),
                    ...candidates.management
                        .filter((c: any) => !formData.host || formData.host.startsWith('disabled_') || JSON.parse(formData.host).userId !== c.id)
                        .map((c: any) => ({ value: JSON.stringify({ userId: c.id, role: 'MANAGEMENT' }), label: `${c.name} (MANAGEMENT)` })),
                    ...candidates.admins
                        .filter((c: any) => !formData.host || formData.host.startsWith('disabled_') || JSON.parse(formData.host).userId !== c.id)
                        .map((c: any) => ({ value: JSON.stringify({ userId: c.id, role: 'ADMIN' }), label: `${c.name} (ADMIN)` }))
                  ]}
                />
              </div>
            </div>

            {!editingClass ? (
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="meetingMode" value="create_new" checked={formData.meetingMode === 'create_new'} onChange={() => setFormData({ ...formData, meetingMode: 'create_new' })} className="text-primary focus:ring-primary" disabled={isReadOnlySession} />
                  <span className="text-sm font-medium text-textPrimary">Create New Meeting Automatically</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" name="meetingMode" value="use_existing" checked={formData.meetingMode === 'use_existing'} onChange={() => setFormData({ ...formData, meetingMode: 'use_existing' })} className="text-primary focus:ring-primary" disabled={isReadOnlySession} />
                  <span className="text-sm font-medium text-textPrimary">Use Existing Meeting</span>
                </label>
              </div>
            ) : (
              <div className="bg-surface-hover px-4 py-2 rounded-lg border border-border">
                <p className="text-xs text-textSecondary mb-1">Meeting Mode</p>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-textPrimary">
                    {formData.meetingMode === 'create_new' ? 'Auto-Created Meeting' : 'Manual/Existing Meeting'}
                  </p>
                  {formData.meetingMode === 'create_new' && (
                    <button 
                      type="button" 
                      onClick={() => setFormData({ ...formData, meetingMode: 'use_existing' })}
                      className="text-xs text-primary hover:underline"
                    >
                      Change to Manual
                    </button>
                  )}
                </div>
              </div>
            )}

            {formData.meetingMode === 'create_new' && !editingClass && (
              <AdminSelect
                label="Provider Account Assignment"
                value={formData.providerAccountId} 
                onChange={(e: any) => setFormData({ ...formData, providerAccountId: e.target.value })}
                disabled={isReadOnlySession}
                options={[
                  { value: 'auto', label: '🌟 Auto Assign (Lowest Load)' },
                  ...providerAccountsFiltered.map(acc => ({
                    value: acc.id,
                    label: `${acc.displayName} (${acc.currentRunningMeetings}/${acc.maxConcurrentMeetings} loads)`
                  }))
                ]}
              />
            )}
            
            {formData.meetingMode === 'create_new' && editingClass && formData.providerAccountId !== 'auto' && (
              <div className="bg-surface-hover px-4 py-2 rounded-lg border border-border">
                <p className="text-xs text-textSecondary mb-1">Provider Account</p>
                <p className="text-sm font-medium text-textPrimary">
                  {providerAccounts.find(a => a.id === formData.providerAccountId)?.displayName || 'Auto Assigned'}
                </p>
              </div>
            )}

            {formData.meetingMode === 'use_existing' && (
              <div className="grid grid-cols-2 gap-4 bg-surface-hover p-4 rounded-xl border border-border">
                {formData.provider === 'zoom' && (
                  <>
                    <AdminInput 
                      label="Meeting ID"
                      value={formData.customProviderId} 
                      onChange={(e: any) => setFormData({ ...formData, customProviderId: e.target.value })} 
                      required 
                    />
                    <AdminInput 
                      label="Passcode"
                      value={formData.providerPasscode} 
                      onChange={(e: any) => setFormData({ ...formData, providerPasscode: e.target.value })} 
                    />
                    <AdminInput 
                      label="Host Key (Optional)"
                      value={formData.hostKey} 
                      onChange={(e: any) => setFormData({ ...formData, hostKey: e.target.value })} 
                      placeholder="e.g. 123456"
                    />
                    <AdminInput 
                      label="Host Start URL (Optional)"
                      value={formData.hostUrl} 
                      onChange={(e: any) => setFormData({ ...formData, hostUrl: e.target.value })} 
                      placeholder="e.g. https://zoom.us/s/..."
                    />
                    <div className="col-span-2">
                      <AdminInput 
                        label="Participant Join URL (Optional)"
                        value={formData.participantUrl} 
                        onChange={(e: any) => setFormData({ ...formData, participantUrl: e.target.value })} 
                        placeholder="e.g. https://zoom.us/j/..."
                      />
                    </div>
                  </>
                )}

                {formData.provider === 'google_meet' && (
                  <>
                    <AdminInput 
                      label="Meeting URL"
                      value={formData.participantUrl} 
                      onChange={(e: any) => setFormData({ ...formData, participantUrl: e.target.value })} 
                      required 
                      disabled={isReadOnlySession}
                    />
                    <AdminInput 
                      label="Meeting Code"
                      value={formData.meetingCode} 
                      onChange={(e: any) => setFormData({ ...formData, meetingCode: e.target.value })} 
                      required 
                      disabled={isReadOnlySession}
                    />
                  </>
                )}
              </div>
            )}
            
            {/* Advanced Settings */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full bg-surface-hover px-4 py-3 flex justify-between items-center text-sm font-medium text-textPrimary">
                <span className="flex items-center"><Settings2 className="w-4 h-4 mr-2 text-textSecondary" /> Advanced Settings</span>
                <span className="text-textSecondary text-xs">{showAdvanced ? 'Hide' : 'Show'}</span>
              </button>
              
              {showAdvanced && (
                <div className="p-4 bg-background grid grid-cols-2 gap-4 text-sm">
                  <AdminSelect
                    label="Target Audience / Access"
                    value={formData.accessLevel}
                    onChange={(e: any) => setFormData({ ...formData, accessLevel: e.target.value })}
                    options={[
                      { value: 'premium', label: 'All Paid Students' },
                      { value: 'free', label: 'All Students (Free & Paid)' },
                      { value: 'batch', label: 'Specific Batch' }
                    ]}
                  />      
                  {activeCapabilities.hasWaitingRoom && (
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded border-border" />
                      <span className="text-textSecondary">Enable Waiting Room</span>
                    </label>
                  )}
                  {activeCapabilities.hasRecording && (
                    <label className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked className="rounded border-border" />
                      <span className="text-textSecondary">Auto-Record Session</span>
                    </label>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

        {!isReadOnlySession && (formData.provider === 'zoom' || formData.provider === 'google_meet') && (
          <div className="bg-surface-hover border border-border p-4 rounded-xl mt-4">
            <h4 className="text-xs font-bold text-textSecondary uppercase tracking-wider mb-3">Live Preview</h4>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-textSecondary">Provider</div>
              <div className="text-textPrimary font-medium capitalize">{formData.provider === 'google_meet' ? 'Google Meet' : formData.provider}</div>
              
              <div className="text-textSecondary">Host</div>
              <div className="text-primary font-medium">
                {formData.host ? (() => {
                  try {
                    const h = JSON.parse(formData.host);
                    const user = [...candidates.teachers, ...candidates.management, ...candidates.admins].find(c => c.id === h.userId);
                    return user ? user.name : 'Unknown';
                  } catch (e) { return 'None'; }
                })() : 'None Assigned'}
              </div>

              <div className="text-textSecondary">Co-Host</div>
              <div className="text-textPrimary font-medium">
                {formData.coHost ? (() => {
                  try {
                    const c = JSON.parse(formData.coHost);
                    const user = [...candidates.teachers, ...candidates.management, ...candidates.admins].find(u => u.id === c.userId);
                    return user ? user.name : 'Unknown';
                  } catch (e) { return 'None'; }
                })() : 'None'}
              </div>

              <div className="text-textSecondary">Attendance</div>
              <div className="text-textPrimary font-medium">{formData.minimumAttendancePercentage}%</div>

              <div className="text-textSecondary">Duration</div>
              <div className="text-textPrimary font-medium">{formData.expectedDurationMinutes} min</div>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-sm flex flex-col shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <span className="font-bold mb-1">Unable to save session.</span>
            <span>Reason: {errorMsg}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <AdminButton type="button" variant="secondary" onClick={onClose} disabled={isSaving}>{isReadOnlySession ? 'Close' : 'Cancel'}</AdminButton>
          {!isReadOnlySession && (
            <AdminButton 
              type="submit" 
              isLoading={isSaving}
              disabled={(formData.provider === 'zoom' || formData.provider === 'google_meet') && !formData.host}
            >
              {editingClass ? 'Save Changes' : (formData.provider === 'upload' ? 'Upload & Create' : 'Schedule Session')}
            </AdminButton>
          )}
        </div>
      </form>
    </AdminModal>
  );
};



