import React from 'react';
import { providerRegistry } from './ProviderRegistry';
import { useLiveSessionContext } from '../context/LiveSessionContext';
import { LiveErrorBoundary } from './LiveErrorBoundary';

export const MeetingPlayerFactory: React.FC = () => {
  const { provider, joinState } = useLiveSessionContext();

  const PlayerComponent = providerRegistry.getComponent(provider);

  if (!PlayerComponent) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-gray-400 p-8">
        <h2 className="text-xl font-bold text-gray-200">Unsupported Provider</h2>
        <p>The provider "{provider}" is not recognized by the registry.</p>
      </div>
    );
  }

  return (
    <LiveErrorBoundary>
      <React.Suspense fallback={
        <div className="flex flex-col items-center justify-center w-full h-full bg-black">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-blue-400 font-medium tracking-wide">Initializing {provider}...</p>
        </div>
      }>
        <PlayerComponent payload={joinState} />
      </React.Suspense>
    </LiveErrorBoundary>
  );
};
