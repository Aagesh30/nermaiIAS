import React, { useState, useEffect } from 'react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';
import { MeetingStateManager } from '../../services/MeetingStateManager';
import { MeetingWindowState } from '../../services/MeetingTypes';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

const getSteps = (role: string) => [
  { id: 'STARTING', label: 'Preparing Class' },
  { id: 'TOKEN_GENERATED', label: 'Session Ready' },
  { id: 'POPUP_OPENING', label: 'Zoom Created' },
  { id: 'ZOOM_INITIALIZING', label: 'Initializing SDK' },
  { id: 'HOST_JOINING', label: role === 'student' ? 'Joining Meeting' : 'Joining as Host' },
  { id: 'ZOOM_CONNECTED', label: 'Connected' }
];

export const InitializationTimeline: React.FC = () => {
  const { academicState, role } = useLiveSessionContext();
  const [windowState, setWindowState] = useState<MeetingWindowState>('idle');
  
  const steps = getSteps(role);

  useEffect(() => {
    return MeetingStateManager.subscribe(setWindowState);
  }, []);

  // Compute actual index based on combining academic and window state
  let currentIndex = 0;
  
  if (academicState === 'STARTING') {
    currentIndex = 0; // Preparing Class
    
    if (windowState === 'opening') {
       currentIndex = 2; // Zoom Created
    } else if (windowState === 'open') {
       currentIndex = 3; // Initializing SDK
    } else if (windowState === 'joined') {
       currentIndex = 4; // Joining as Host
    } else if (windowState === 'active') {
       currentIndex = 5; // Connected
    } else if (windowState === 'blocked') {
       // Stop at Preparing Class but we should probably show an error somewhere else
       currentIndex = 1; // Session Ready (but blocked)
    }
  } else if (academicState === 'LIVE') {
    currentIndex = 6; // Complete
  }
  
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-black font-sans text-center px-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 p-8 rounded-2xl">
        <h2 className="text-xl font-bold text-white mb-8">Launching Live Classroom</h2>
        
        <div className="flex flex-col gap-4 text-left">
          {steps.map((step, index) => {
            const isCompleted = currentIndex > index || academicState === 'LIVE';
            const isActive = currentIndex === index && academicState !== 'LIVE';
            const isPending = currentIndex < index && academicState !== 'LIVE';
            
            return (
              <div key={step.id} className={`flex items-center gap-4 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                <div className="shrink-0 w-6 h-6 flex items-center justify-center">
                  {isCompleted ? (
                    <CheckCircle2 size={20} className="text-green-500" />
                  ) : isActive ? (
                    <Loader2 size={20} className="text-blue-500 animate-spin" />
                  ) : (
                    <Circle size={20} className="text-gray-600" />
                  )}
                </div>
                <span className={`text-sm font-medium ${isCompleted ? 'text-gray-300' : isActive ? 'text-blue-400' : 'text-gray-500'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
