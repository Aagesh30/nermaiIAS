import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, Circle, Bot, FileText } from 'lucide-react';
import { CourseApi, getApiClient } from '../core/services';
import { useLiveSessionsState } from '../core/shared/src';
import { AttendanceStatusBadge } from './components/AttendanceStatusBadge';
import { MeetingPlayerFactory } from './MeetingPlayerFactory';
import { PlayerHeader } from './components/PlayerHeader';
import { DescriptionPanel } from './components/DescriptionPanel';
import { SecurityNotice } from './components/SecurityNotice';
import { ClassResources } from './ClassResources';
import { CourseSyllabus } from './CourseSyllabus';
import { CourseOverview } from './CourseOverview';
import { CourseLiveClasses } from './CourseLiveClasses';
import { CourseTests } from './CourseTests';
import { CourseResources } from './CourseResources';
import { NERMAIAssistantWidget } from './NERMAIAssistantWidget';
import { ChatSidebar } from './LCES/ChatSidebar';
import { CoursePlayerSkeleton } from '../components/ui/Skeleton';

import { Video } from 'lucide-react';

interface CoursePlayerProps {
  courseId: string;
  initialClassId?: string;
  onBack: () => void;
}

export const CoursePlayer: React.FC<CoursePlayerProps> = ({ courseId, initialClassId, onBack }) => {
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Syllabus' | 'Resources' | 'Live Classes' | 'Tests'>('Syllabus');
  const [sidebarTab, setSidebarTab] = useState<string>('Chat');
  const [currentAccessData, setCurrentAccessData] = useState<any>(null);
  const [activeVideoProgress, setActiveVideoProgress] = useState<number>(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeVideo?.id && activeVideo.classType?.includes('recorded')) {
      const fetchProgress = async () => {
         try {
           const response = await fetch(`/api/v1/attendance/status/${activeVideo.id}`, { 
             headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } 
           });
           const res = await response.json();
           if (res.data && typeof res.data.percentage === 'number') {
             setActiveVideoProgress(Math.min(100, Math.max(0, res.data.percentage)));
           }
         } catch (e) {}
      };
      fetchProgress();
      interval = setInterval(fetchProgress, 30000); // sync every 30s
    } else {
      setActiveVideoProgress(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [activeVideo?.id]);

  const { sessions: realtimeLiveSessions } = useLiveSessionsState(getApiClient());

  const handleSelectVideo = (cls: any) => {
    const liveSession = realtimeLiveSessions.find(s => s.classId === cls.id);
    if (liveSession && ['LIVE', 'JOINING', 'HOST_CONNECTED'].includes(liveSession.status)) {
      navigate(`/student/live-session/${liveSession.id}`);
    } else {
      setActiveVideo(cls);
    }
  };

  const capabilities = {
    supportsNativeChat: currentAccessData?.provider === 'zoom',
    supportsWhiteboard: false
  };

  useEffect(() => {
    // Re-evaluate default tab when capabilities change
    if (activeVideo?.classType?.includes('live')) {
      if (capabilities.supportsNativeChat && sidebarTab === 'Chat') {
        setSidebarTab('Meeting');
      } else if (!capabilities.supportsNativeChat && sidebarTab === 'Meeting') {
        setSidebarTab('Chat');
      }
    }
  }, [capabilities.supportsNativeChat, activeVideo, sidebarTab]);

  const TABS = ['Overview', 'Syllabus', 'Resources', 'Live Classes', 'Tests', 'Assignments', 'Discussion'];

  useEffect(() => {
    const fetchCourseDetails = async () => {
      try {
        const response = await CourseApi.getCourse(courseId);
        const courseData = response.data?.data || response.data;
        setCourse(courseData);
        
        // Fetch subjects
        const subjRes = await CourseApi.listSubjectsByCourse(courseId);
        const subjects = subjRes.data?.data || subjRes.data || [];
        
        // Fetch topics and classes
        const fullSyllabus = await Promise.all(
          subjects.map(async (subject: any) => {
            const topicsRes = await CourseApi.listTopicsBySubject(subject.id);
            const topics = topicsRes.data?.data || topicsRes.data || [];
            
            const topicsWithClasses = await Promise.all(
              topics.map(async (topic: any) => {
                const classesRes = await CourseApi.listClassesByTopic(topic.id);
                const classes = classesRes.data?.data || classesRes.data || [];
                // Attach subject/topic info to classes for easy rendering
                return { 
                  ...topic, 
                  classes: classes.map((c: any) => ({
                    ...c,
                    subjectName: subject.name,
                    chapterName: topic.name
                  }))
                };
              })
            );
            
            return { ...subject, topics: topicsWithClasses };
          })
        );
        
        setSyllabus(fullSyllabus);

        // Auto-select initialClassId if provided
        if (initialClassId) {
          let foundClass = null;
          for (const sub of fullSyllabus) {
            for (const top of sub.topics || []) {
              const match = (top.classes || []).find((c: any) => c.id === initialClassId);
              if (match) {
                foundClass = match;
                break;
              }
            }
            if (foundClass) break;
          }
          if (foundClass) {
            setActiveVideo(foundClass);
          }
        }
      } catch (error) {
        console.error('Failed to load course details', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourseDetails();
  }, [courseId]);

  if (loading) {
    return <CoursePlayerSkeleton />;
  }

  if (!course) {
    return (
      <div className="text-center p-12 bg-surface/50 rounded-3xl max-w-md mx-auto mt-20 border border-accent/20">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">Course not found</h2>
        <p className="text-slate-400 mb-6">The course you are looking for does not exist or you don't have access.</p>
        <button onClick={onBack} className="px-6 py-2.5 bg-accent hover:bg-accent/80 text-white font-medium rounded-xl transition-colors">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-500 select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' as any }}
    >
      {/* Navigation Header */}
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <button 
          onClick={() => activeVideo ? setActiveVideo(null) : onBack()}
          className="p-2 rounded-full hover:bg-white/5 transition-colors text-slate-400 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold tracking-wide">{activeVideo ? 'Back to Syllabus' : 'Back to Dashboard'}</span>
        </button>
      </div>

      {!activeVideo ? (
        <div className="flex-1 overflow-y-auto max-w-6xl mx-auto w-full custom-scrollbar pb-12 pr-4">
          
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-white mb-4">{course.title || course.name}</h1>
            <p className="text-slate-400 text-lg max-w-4xl leading-relaxed">{course.description || 'Welcome to your course workspace.'}</p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-white/10 pb-px overflow-x-auto custom-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                  activeTab === tab 
                    ? 'border-accent text-white bg-white/5 rounded-t-xl' 
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-t-xl'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div className="min-h-[500px]">
            {activeTab === 'Overview' && <CourseOverview course={course} />}
            {activeTab === 'Syllabus' && <CourseSyllabus syllabus={syllabus} onSelectVideo={handleSelectVideo} realtimeLiveSessions={realtimeLiveSessions} />}
            {activeTab === 'Resources' && <CourseResources courseId={course.id} />}
            {activeTab === 'Live Classes' && <CourseLiveClasses />}
            {activeTab === 'Tests' && <CourseTests />}
            {['Assignments', 'Discussion'].includes(activeTab) && (
              <div className="mt-8 p-12 bg-surface/40 border border-white/5 rounded-3xl text-center">
                <h2 className="text-2xl font-bold text-white mb-2">{activeTab}</h2>
                <p className="text-slate-400">This section is currently under development.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          
          {/* Left Column: Video Player & Details */}
          <div className="lg:col-span-2 flex flex-col min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-8">
            
            <PlayerHeader 
              classId={activeVideo.id}
              title={activeVideo.title}
              subjectName={activeVideo.subjectName}
              chapterName={activeVideo.chapterName}
              isLive={['LIVE', 'JOINING', 'HOST_CONNECTED'].includes(realtimeLiveSessions.find(s => s.classId === activeVideo.id)?.status || '')}
              duration="60 mins" 
            />

            {/* Banner for LIVE session */}
            {(() => {
              const activeSession = realtimeLiveSessions.find(s => s.classId === activeVideo?.id);
              if (activeSession && ['LIVE', 'JOINING', 'HOST_CONNECTED'].includes(activeSession.status)) {
                return (
                  <div className="w-full bg-[#1A0A0A] border border-red-500/30 rounded-xl p-12 mb-4 flex flex-col items-center justify-center text-center shadow-lg shadow-red-500/10 min-h-[400px]">
                    <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)] mb-6" />
                    <h3 className="text-3xl font-bold text-red-400 mb-4">A live class has started.</h3>
                    <p className="text-slate-300 text-lg mb-8 max-w-lg">Join the active live session instead of watching this recording.</p>
                    <button 
                      onClick={() => navigate(`/student/live-session/${activeSession.id}`)}
                      className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-500/20 text-lg"
                    >
                      Join Live Session
                    </button>
                  </div>
                );
              }
              return (
                <div className="w-full">
                  <MeetingPlayerFactory classId={activeVideo.id} onAccessLoaded={setCurrentAccessData} />
                </div>
              );
            })()}

            {/* AI Assistant Quick Actions */}
            <div className="mt-6 flex flex-wrap gap-3 px-4">
              <button 
                onClick={() => document.dispatchEvent(new CustomEvent('open-assistant-with-intent', { detail: '/help' }))}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-blue-600/20 border border-purple-500/30 rounded-xl text-purple-300 hover:bg-purple-500/30 hover:text-white transition-colors shadow-lg shadow-purple-500/10"
              >
                <Bot className="w-4 h-4" />
                <span className="text-sm font-medium">Ask about this class</span>
              </button>
              <button 
                onClick={() => document.dispatchEvent(new CustomEvent('open-assistant-with-intent', { detail: '/resources' }))}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Find related resources</span>
              </button>
            </div>
            
            <SecurityNotice />
            
            <DescriptionPanel 
              description={activeVideo.description || course.description || 'No description available for this class.'} 
            />
            
            <ClassResources classId={activeVideo.id} courseId={course.id} />
          </div>

          {/* Right Column: Sidebar (Chat or Syllabus) */}
        <div className="bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl p-0 flex flex-col overflow-hidden shadow-2xl h-full">
          {activeVideo?.classType?.includes('live') ? (
            <div className="flex border-b border-white/10 shrink-0 overflow-x-auto no-scrollbar">
              {capabilities.supportsNativeChat ? (
                <button 
                  onClick={() => setSidebarTab('Meeting')}
                  className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${sidebarTab === 'Meeting' ? 'bg-accent/10 text-accent border-b-2 border-accent' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  Meeting
                </button>
              ) : (
                <button 
                  onClick={() => setSidebarTab('Chat')}
                  className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${sidebarTab === 'Chat' ? 'bg-accent/10 text-accent border-b-2 border-accent' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  Live Chat
                </button>
              )}
              <button 
                onClick={() => setSidebarTab('Syllabus')}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${sidebarTab === 'Syllabus' ? 'bg-accent/10 text-accent border-b-2 border-accent' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                Syllabus
              </button>
              <button 
                onClick={() => setSidebarTab('Resources')}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${sidebarTab === 'Resources' ? 'bg-accent/10 text-accent border-b-2 border-accent' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                Resources
              </button>
              <button 
                onClick={() => setSidebarTab('Notes')}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${sidebarTab === 'Notes' ? 'bg-accent/10 text-accent border-b-2 border-accent' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                Notes
              </button>
            </div>
          ) : realtimeLiveSessions.some(s => s.classId === activeVideo?.id) ? (
            <div className="p-5 border-b border-white/5 bg-surface/80 relative shrink-0">
              <h3 className="font-bold text-lg text-slate-100">Live Session</h3>
              <div className="mt-4">
                <AttendanceStatusBadge classId={activeVideo?.id} />
              </div>
            </div>
          ) : (
            <div className="p-5 border-b border-white/5 bg-surface/80 relative shrink-0">
              <h3 className="font-bold text-lg text-slate-100">Course Content</h3>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden relative">
                <div className="bg-accent h-full absolute top-0 left-0 transition-all duration-1000 ease-in-out" style={{ width: `${Math.round(activeVideoProgress)}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-2 font-medium">{Math.round(activeVideoProgress)}% Completed</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
            {activeVideo?.classType?.includes('live') && sidebarTab === 'Chat' && !capabilities.supportsNativeChat ? (
              <ChatSidebar liveSessionId={activeVideo.id} />
            ) : activeVideo?.classType?.includes('live') && sidebarTab === 'Meeting' ? (
              <div className="p-8 text-center space-y-4 mt-8 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-2">
                      <Video className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Native Meeting Interface</h3>
                  <p className="text-slate-400 max-w-[250px]">
                      This session is powered by a native meeting provider. 
                      Please use the video player controls for chat, participants, and reactions.
                  </p>
              </div>
            ) : activeVideo?.classType?.includes('live') && sidebarTab === 'Resources' ? (
              <div className="p-4">
                <ClassResources classId={activeVideo.id} courseId={course.id} />
              </div>
            ) : activeVideo?.classType?.includes('live') && sidebarTab === 'Notes' ? (
              <div className="p-8 text-center space-y-4">
                  <h3 className="text-lg font-bold text-white">Personal Notes</h3>
                  <p className="text-slate-400">Notes module is under development.</p>
              </div>
            ) : (
              <div className="p-3 space-y-4">
                {syllabus.length === 0 ? (
                   <p className="text-slate-500 text-sm p-4 text-center">No syllabus content available yet.</p>
                ) : (
                  syllabus.map((subject: any, sIdx: number) => (
                    <div key={subject.id || sIdx} className="space-y-2">
                      <h4 className="text-xs font-bold text-amber-500/90 uppercase tracking-wider px-3 pt-2 pb-1 border-b border-white/5">
                        {subject.name}
                      </h4>
                      
                      {subject.topics?.map((topic: any, tIdx: number) => (
                        <div key={topic.id || tIdx} className="pl-3 pr-1 space-y-1 mt-2">
                          <h5 className="text-xs font-semibold text-slate-400 mb-1 px-2">{topic.name || topic.title}</h5>
                          
                          {topic.classes?.length === 0 ? (
                             <p className="text-xs text-slate-600 italic px-2">No classes yet</p>
                          ) : (
                            topic.classes?.map((cls: any, cIdx: number) => {
                              const isSelected = activeVideo?.id === cls.id;
                              return (
                                <button 
                                  key={cls.id || cIdx}
                                  onClick={() => handleSelectVideo(cls)}
                                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl transition-all duration-200 text-left ${
                                    isSelected 
                                      ? 'bg-accent/10 border border-accent/20 shadow-inner shadow-accent/20' 
                                      : 'hover:bg-white/5 border border-transparent'
                                  }`}
                                >
                                  <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-accent/20 text-accent' : 'bg-slate-800 text-slate-500'
                                  }`}>
                                    <Circle className={`w-2.5 h-2.5 ${isSelected ? 'fill-accent' : ''}`} />
                                  </div>
                                  <div>
                                    <p className={`font-medium text-sm leading-snug ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>
                                      {cls.title}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-slate-500">
                                      {['LIVE', 'JOINING', 'HOST_CONNECTED'].includes(realtimeLiveSessions.find(s => s.classId === cls.id)?.status || '') ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-red-500 animate-pulse">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> LIVE NOW
                                        </span>
                                      ) : (
                                        <>
                                          <PlayCircle className="w-3.5 h-3.5" />
                                          <span>{cls.classType === 'youtube_live' || cls.classType === 'zoom_live' ? 'Live Class' : 'Recorded'}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
      <NERMAIAssistantWidget 
        courseContext={
          activeVideo ? {
            courseId: course?.id,
            topicId: activeVideo.topicId,
            videoId: activeVideo.id
          } : undefined
        } 
      />
    </div>
  );
};

