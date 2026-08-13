import React, { useState, useEffect } from 'react';
import { liveWorkspaceRegistry, WorkspaceId, LiveWorkspacePlugin } from '../registry/LiveWorkspaceRegistry';
import { useLiveSessionContext } from '../../context/LiveSessionContext';

export const TeacherLayout: React.FC = () => {
  const { academicState, zoomState, capabilities } = useLiveSessionContext();
  const [activeTab, setActiveTab] = useState<WorkspaceId>('attendance');
  const [plugins, setPlugins] = useState<LiveWorkspacePlugin[]>([]);

  useEffect(() => {
    setPlugins(liveWorkspaceRegistry.getAllForContext({ academicState, zoomState, capabilities }));
  }, [academicState, zoomState, capabilities]);

  const ActiveComponent = plugins.find(p => p.id === activeTab)?.component || (() => <div className="p-6 text-gray-500">Workspace not found</div>);

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-black overflow-hidden">
      
      {/* Horizontal Tabs */}
      <div className="w-full bg-[#050505] border-b border-gray-800 flex overflow-x-auto select-none px-2">
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
  );
};
