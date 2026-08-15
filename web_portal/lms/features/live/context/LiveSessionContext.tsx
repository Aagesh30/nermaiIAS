import React, { createContext, useContext } from 'react';
import { ILiveSession, UserRole, LiveCapabilities } from '@nermai/live-core';

export interface LiveSessionContextState {
  session: ILiveSession | null;
  participant: any | null; // Student info
  role: UserRole;
  capabilities: LiveCapabilities;
  provider: string;
  academicState: 'SCHEDULED' | 'STARTING' | 'WAITING_ROOM' | 'LIVE' | 'ENDING' | 'ENDED';
  zoomState: 'DISCONNECTED' | 'LAUNCHING' | 'JOINING' | 'CONNECTED' | 'RECONNECTING';
  windowState: 'CLOSED' | 'OPENING' | 'OPENED' | 'FOCUSED' | 'BLOCKED' | 'CRASHED' | 'RECOVERED';
  attendanceStatus: 'present' | 'absent' | 'pending';
  hostConnected?: boolean;
  joinState: any; // payload data from join endpoint
  refreshSession: () => void;
  startSession: () => void;
  setAcademicState: (state: LiveSessionContextState['academicState']) => void;
  setHostConnected: (connected: boolean) => void;
  onJoinError: (error: Error) => void;
}

export const LiveSessionContext = createContext<LiveSessionContextState | null>(null);

export const useLiveSessionContext = () => {
  const context = useContext(LiveSessionContext);
  if (!context) {
    throw new Error('useLiveSessionContext must be used within a LiveSessionProvider');
  }
  return context;
};

export const LiveSessionProvider: React.FC<{
  value: LiveSessionContextState;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <LiveSessionContext.Provider value={value}>
      {children}
    </LiveSessionContext.Provider>
  );
};
