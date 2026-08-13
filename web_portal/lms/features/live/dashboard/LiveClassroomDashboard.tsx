import React from 'react';
import { RoleLayoutFactory } from './RoleLayoutFactory';
import { HeaderRibbon } from './controls/HeaderRibbon';
import { ClassHealthWidget } from './controls/ClassHealthWidget';
import { useLiveSessionContext } from '../context/LiveSessionContext';
import { LiveSessionController } from './orchestration/LiveSessionController';
import { MeetingPlayerFactory } from '../core/MeetingPlayerFactory';

export const LiveClassroomDashboard: React.FC = () => {
  return (
    <LiveSessionController>
      <div className="flex flex-col w-screen h-screen bg-black overflow-hidden font-sans">
        <HeaderRibbon />
        <ClassHealthWidget />
        
        <main className="flex-1 w-full h-full relative overflow-hidden flex flex-col">
          <RoleLayoutFactory />
        </main>
        
        {/* Hidden Provider Infrastructure */}
        <div className="hidden">
          <MeetingPlayerFactory />
        </div>
      </div>
    </LiveSessionController>
  );
};




