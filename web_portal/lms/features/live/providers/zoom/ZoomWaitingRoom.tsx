import React from 'react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';

export const ZoomWaitingRoom: React.FC = () => {
  const { session, joinState } = useLiveSessionContext();

  // If the zoom state emits waiting room status, display this.
  // We'll mock the condition for now based on joinState.
  if (!joinState?.inWaitingRoom) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center text-white backdrop-blur-md">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
      <h2 className="text-2xl font-bold mb-2">Waiting for Host</h2>
      <p className="text-gray-400">The host will let you in soon.</p>
    </div>
  );
};
