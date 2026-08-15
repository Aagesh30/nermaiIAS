import React from 'react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';
import { NERMAIAssistantWidget } from '../../../../student/LMS/Assistant/NERMAIAssistantWidget';
import { Bot } from 'lucide-react';

export const AIWorkspace: React.FC = () => {
  const { session } = useLiveSessionContext();

  const courseContext = session ? {
    courseId: session.courseId || '',
    topicId: session.classId || '',
    videoId: session.id || '' // In live sessions, videoId is mapped to sessionId for context
  } : undefined;

  return (
    <div className="flex-1 flex flex-col bg-[#050505] p-6 h-full items-center justify-center">
      <Bot size={48} className="text-purple-500 mb-4 animate-pulse" />
      <h2 className="text-xl font-bold text-white mb-2">AI Assistant Active</h2>
      <p className="text-gray-400 text-center max-w-sm mb-6">
        The NERMAI Assistant is monitoring this session. Use the chat button to ask questions or get summaries.
      </p>
      {/* We mount the existing widget which will provide the floating button and slide-over */}
      <NERMAIAssistantWidget courseContext={courseContext} />
    </div>
  );
};
