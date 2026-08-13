import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, BookOpen, Video, FileText, Settings, HelpCircle, User, Loader2 } from 'lucide-react';
import { AssistantApi } from '../core/services';

// Interface matching the backend response
export type ResponseCardType = 'text' | 'faq' | 'resource_list' | 'live_classes' | 'attendance' | 'clarification';

export interface IAssistantAction {
  label: string;
  intent: string;
}

export interface IAssistantResponse {
  type: ResponseCardType;
  title?: string;
  subtitle?: string;
  text?: string;
  items?: any[];
  actions?: IAssistantAction[];
  references?: { title: string, url: string }[];
  attachments?: { name: string, type: string, url: string }[];
}

export const NERMAIAssistantWidget: React.FC<{
  courseContext?: { courseId: string, topicId?: string, videoId?: string }
}> = ({ courseContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant', payload: IAssistantResponse | string }>>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync context when opened or when context changes
  useEffect(() => {
    if (isOpen && courseContext) {
      AssistantApi.setContext({
        activeCourseId: courseContext.courseId,
        activeTopicId: courseContext.topicId,
        activeVideoId: courseContext.videoId
      }).catch(err => console.error("Failed to sync context", err));
    }
  }, [isOpen, courseContext]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    setMessages(prev => [...prev, { sender: 'user', payload: text }]);
    setQuery('');
    setLoading(true);

    try {
      const res = await AssistantApi.chat(text);
      if (res.data?.data) {
        setMessages(prev => [...prev, { sender: 'assistant', payload: res.data.data }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'assistant', payload: { type: 'text', text: "Sorry, I couldn't reach the academy servers right now." } }]);
    } finally {
      setLoading(false);
    }
  };

  const renderCard = (payload: IAssistantResponse | string) => {
    if (typeof payload === 'string') {
      return <div className="text-white text-sm">{payload}</div>;
    }

    switch (payload.type) {
      case 'text':
        return (
          <div className="text-white text-sm whitespace-pre-wrap">
            {payload.text}
            {payload.actions && payload.actions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {payload.actions.map((act, i) => (
                  <button 
                    key={i} 
                    onClick={() => handleSend(act.intent)}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 text-xs transition-colors"
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            )}
            {payload.references && payload.references.length > 0 && (
              <div className="mt-4 border-t border-slate-700/50 pt-3">
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">References</p>
                <div className="flex flex-col gap-1.5">
                  {payload.references.map((ref, i) => (
                    <a key={i} href={ref.url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1.5">
                      <BookOpen size={12} /> {ref.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {payload.attachments && payload.attachments.length > 0 && (
              <div className="mt-4 border-t border-slate-700/50 pt-3">
                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Attachments</p>
                <div className="flex gap-2 flex-wrap">
                  {payload.attachments.map((att, i) => (
                    <a key={i} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded border border-slate-700 hover:bg-slate-700 transition-colors text-xs text-slate-200">
                      <FileText size={14} className="text-purple-400" />
                      {att.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      case 'faq':
        return (
          <div className="space-y-2">
            <h4 className="font-medium text-white">{payload.title}</h4>
            <div className="text-slate-300 text-sm">{payload.text}</div>
            {payload.items && payload.items.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                 {payload.items.map((item, i) => (
                   <div key={i} className="space-y-1">
                     <p className="font-medium text-blue-300 text-sm">{item.title}</p>
                     <p className="text-slate-400 text-xs">{item.answer}</p>
                   </div>
                 ))}
              </div>
            )}
          </div>
        );

      case 'resource_list':
        return (
          <div className="space-y-3">
            {payload.title && <h4 className="font-medium text-white">{payload.title}</h4>}
            {payload.subtitle && <p className="text-xs text-slate-400">{payload.subtitle}</p>}
            <div className="space-y-2">
              {payload.items?.map((item: any, i: number) => (
                <div key={i} className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-sm text-white truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 capitalize">{item.type || 'Document'}</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-md text-xs transition-colors shrink-0">
                    Open
                  </button>
                </div>
              ))}
            </div>
          </div>
        );

      case 'clarification':
        return (
          <div className="space-y-3">
            <p className="text-white text-sm">{payload.title}</p>
            <div className="flex flex-col gap-2">
              {payload.actions?.map((act, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(act.intent)}
                  className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 hover:border-blue-500/50 text-left transition-colors"
                >
                  <p className="text-sm text-white">{act.label}</p>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return <div className="text-white text-sm">Unsupported response format</div>;
    }
  };

  const initialQuickActions = courseContext 
    ? [
        { label: 'Summarize Notes', intent: '/notes' },
        { label: 'View Live Classes', intent: '/live' },
        { label: 'Ask a Doubt', intent: '/help' }
      ]
    : [
        { label: '📚 My Courses', intent: '/courses' },
        { label: '📝 Today\'s Notes', intent: '/notes' },
        { label: '🔴 Live Classes', intent: '/live' },
        { label: '📊 Attendance', intent: '/attendance' },
        { label: '📄 Download Hall Ticket', intent: '/hallticket' },
        { label: '📢 Announcements', intent: '/announcements' },
        { label: '📈 Test Results', intent: '/tests' },
        { label: '💳 Payments', intent: '/payments' },
        { label: '👤 My Profile', intent: '/profile' }
      ];

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/20 flex items-center justify-center z-40 group"
      >
        <Bot className="w-6 h-6 text-white group-hover:animate-pulse" />
      </motion.button>

      {/* Slide-over Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[400px] md:w-[550px] lg:w-[700px] bg-slate-900 border-l border-slate-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">NERMAI Assistant</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-slate-400">Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-600/20 flex items-center justify-center border border-purple-500/30">
                    <Bot className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">👋 Hello!</h3>
                    <p className="text-slate-400 mt-2 text-sm">How can I help you {courseContext ? 'with this class' : 'today'}?</p>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="w-full space-y-2 mt-4">
                    {initialQuickActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(action.intent)}
                        className="w-full p-3 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-purple-500/30 transition-all text-left group flex items-center gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-purple-500/20 group-hover:text-purple-400 text-slate-400 transition-colors">
                          <Settings className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-slate-300 group-hover:text-white font-medium">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 ${
                        msg.sender === 'user' 
                          ? 'bg-blue-600 text-white rounded-br-sm' 
                          : 'bg-slate-800 border border-slate-700 rounded-bl-sm'
                      }`}>
                        {renderCard(msg.payload)}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-sm p-4 text-slate-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(query);
                    }
                  }}
                  placeholder="Ask a question or type /help..."
                  className="w-full bg-slate-800/80 border border-slate-700 text-white placeholder-slate-400 rounded-xl px-4 py-3.5 pr-12 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all text-sm"
                />
                <button 
                  onClick={() => handleSend(query)}
                  disabled={!query.trim() || loading}
                  className="absolute right-2 p-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-3">
                Powered by NERMAI Deterministic Engine
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
