import { liveEventBusMobile, LiveEventTypeMobile } from './LiveEventBusMobile';

export class ProviderMobileEventAdapter {
  static handleMessage(rawMessage: string) {
    try {
      const message = JSON.parse(rawMessage);
      
      // zoom.html emits: { type: '...', role: '...', sessionId: '...', provider: '...', ...payload }
      
      let eventType: LiveEventTypeMobile | undefined;

      switch (message.type) {
        case 'HOST_CONNECTED':
          eventType = LiveEventTypeMobile.HOST_CONNECTED;
          break;
        case 'PARTICIPANT_JOINED':
          // Also handle the generic "connected" case for the local user
          eventType = LiveEventTypeMobile.SESSION_CONNECTED; 
          break;
        case 'PARTICIPANT_LEFT':
          eventType = LiveEventTypeMobile.PARTICIPANT_LEFT;
          break;
        case 'MEETING_ENDED':
          eventType = LiveEventTypeMobile.SESSION_ENDED;
          break;
        case 'CONNECTION_LOST':
          if (message.connectionState === 'RECONNECTING') {
            eventType = LiveEventTypeMobile.CONNECTION_LOST;
          }
          break;
        case 'HOST_DISCONNECTED':
          eventType = LiveEventTypeMobile.HOST_LEFT;
          break;
      }

      if (eventType) {
         liveEventBusMobile.emit(eventType, message);
      } else {
         // Some other event, e.g. SDK_EVENT or JoinFailed
         console.log(`[ProviderMobileEventAdapter] Ignored or unmapped event type: ${message.type}`, message);
      }
    } catch (e) {
      console.error('Failed to parse bridge message:', e);
    }
  }
}

