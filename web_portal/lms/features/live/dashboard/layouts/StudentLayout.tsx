import React, { useState, useEffect } from 'react';
import { liveWorkspaceRegistry, WorkspaceId, LiveWorkspacePlugin } from '../registry/LiveWorkspaceRegistry';
import { useLiveSessionContext } from '../../context/LiveSessionContext';
import { Power } from 'lucide-react';
import { usePresenceLifecycle } from '../../hooks/usePresenceLifecycle';
import { useParams, useNavigate } from 'react-router-dom';

export const StudentLayout: React.FC = () => {
  const { academicState, zoomState, capabilities } = useLiveSessionContext();
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkspaceId>('resources');
  const [plugins, setPlugins] = useState<LiveWorkspacePlugin[]>([]);

  useEffect(() => {
    const available = liveWorkspaceRegistry.getAllForContext({ academicState, zoomState, capabilities });
    setPlugins(available);
    // Default to resources for student if available
    const hasResources = available.some(p => p.id === 'resources');
    if (hasResources && !available.some(p => p.id === activeTab)) setActiveTab('resources');
  }, [academicState, zoomState, capabilities, activeTab]);

  // ── Heartbeat & Presence Lifecycle ─────────────────────────────────────────
  const { leaveSession } = usePresenceLifecycle(sessionId);

  // ── Leave Class ────────────────────────────────────────────────────────────
  const handleLeaveClass = async () => {
    await leaveSession();
    
    // Attempt graceful navigation back
    navigate(-1);
  };

  const ActiveComponent = plugins.find(p => p.id === activeTab)?.component || (() => <div className="p-6 text-gray-500">Workspace not found</div>);

  return (
    <div className="flex-1 flex w-full h-full bg-black overflow-hidden">
      
      {/* Left Side - Workspaces */}
      <div className="flex-1 flex flex-col border-r border-gray-800">
        {/* Horizontal Tabs */}
        <div className="w-full bg-[#050505] border-b border-gray-800 flex overflow-x-auto select-none px-2 shrink-0">
          {plugins.map(plugin => (
            <button
              key={plugin.id}
              onClick={() => setActiveTab(plugin.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === plugin.id
                  ? 'border-blue-500 text-blue-400 bg-blue-900/10'
                  : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
              }`}
            >
              <plugin.icon size={16} />
              {plugin.title}
            </button>
          ))}
        </div>

        {/* Active Workspace */}
        <div className="flex-1 overflow-hidden flex bg-[#0a0a0a] relative">
          <ActiveComponent />
        </div>
      </div>

      {/* Right Side - Meeting Controls */}
      <div className="w-80 bg-gray-950 p-6 flex flex-col shrink-0">
        <h2 className="text-white font-bold mb-6">Connection Details</h2>
        <div className="text-gray-500 text-sm">Please check the Class Health Bar at the top.</div>
        
        <div className="mt-auto pt-6 border-t border-gray-800">
          <button
            onClick={handleLeaveClass}
            className="flex items-center justify-center gap-2 w-full py-3 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/50 rounded-xl font-medium transition-colors"
          >
            <Power size={18} />
            Leave Class
          </button>
        </div>
      </div>

    </div>
  );
};
