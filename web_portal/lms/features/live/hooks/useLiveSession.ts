import { useContext } from 'react';
import { LiveSessionContext } from '../context/LiveSessionContext';

export function useLiveSession() {
  const context = useContext(LiveSessionContext);
  if (!context) {
    throw new Error('useLiveSession must be used within a LiveSessionProvider');
  }
  return context;
}
