import React from 'react';

// Lazy load providers to keep the initial bundle small
const ZoomMeetingPage = React.lazy(() => 
  import('../providers/zoom/ZoomMeetingPage').then(m => ({ default: m.ZoomMeetingPage }))
);
const YoutubeLivePage = React.lazy(() => 
  import('../providers/youtube/YoutubeLivePage').then(m => ({ default: m.YoutubeLivePage }))
);

// Placeholders for future providers
const GoogleMeetPage = React.lazy(() => 
  import('../providers/google_meet/GoogleMeetPage').then(m => ({ default: m.GoogleMeetPage }))
);

export interface ProviderDefinition {
  id: string;
  component: React.FC<any>;
  capabilities: {
    supportsNativeChat: boolean;
    supportsParticipants: boolean;
    supportsMicrophone: boolean;
    supportsCamera: boolean;
    supportsReactions: boolean;
    supportsRaiseHand: boolean;
  };
}

class MeetingProviderRegistry {
  private providers: Map<string, ProviderDefinition> = new Map();

  register(provider: ProviderDefinition) {
    this.providers.set(provider.id, provider);
  }

  getComponent(providerId: string): React.FC<any> | null {
    // Handle legacy aliases like 'zoom_live' or 'youtube_live'
    const normalizedId = providerId.replace('_live', '').replace('_recorded', '');
    return this.providers.get(normalizedId)?.component || null;
  }

  getCapabilities(providerId: string) {
    const normalizedId = providerId.replace('_live', '').replace('_recorded', '');
    return this.providers.get(normalizedId)?.capabilities || {
      supportsNativeChat: false,
      supportsParticipants: false,
      supportsMicrophone: false,
      supportsCamera: false,
      supportsReactions: false,
      supportsRaiseHand: false,
    };
  }
}

export const providerRegistry = new MeetingProviderRegistry();

// --- Register defaults ---

providerRegistry.register({
  id: 'zoom',
  component: ZoomMeetingPage,
  capabilities: {
    supportsNativeChat: true,
    supportsParticipants: true,
    supportsMicrophone: true,
    supportsCamera: true,
    supportsReactions: true,
    supportsRaiseHand: true,
  }
});

providerRegistry.register({
  id: 'youtube',
  component: YoutubeLivePage,
  capabilities: {
    supportsNativeChat: false,
    supportsParticipants: false,
    supportsMicrophone: false,
    supportsCamera: false,
    supportsReactions: false,
    supportsRaiseHand: false,
  }
});

providerRegistry.register({
  id: 'google-meet',
  component: GoogleMeetPage,
  capabilities: {
    supportsNativeChat: true,
    supportsParticipants: true,
    supportsMicrophone: true,
    supportsCamera: true,
    supportsReactions: true,
    supportsRaiseHand: true,
  }
});
