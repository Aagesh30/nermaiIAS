import { liveEventBus, LiveEventMap, LiveEvent } from '../dashboard/orchestration/LiveEventBus';

class WebMessageBridgeService {
  private isListening = false;

  start() {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener('message', this.handleMessage);
  }

  stop() {
    if (!this.isListening) return;
    this.isListening = false;
    window.removeEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (!data || !data.type) return;

      // Ensure this matches a known event type to avoid spamming the bus with unrelated postMessages
      let mappedType: keyof LiveEventMap | undefined;
      
      switch (data.type) {
        case 'HOST_CONNECTED': mappedType = 'HOST_CONNECTED'; break;
        case 'MEETING_STARTED': mappedType = 'HOST_CONNECTED'; break; // Fixed mapping
        case 'HOST_DISCONNECTED': mappedType = 'HOST_DISCONNECTED'; break;
        case 'PARTICIPANT_JOINED': mappedType = 'PARTICIPANT_JOINED'; break;
        case 'PARTICIPANT_LEFT': mappedType = 'PARTICIPANT_LEFT'; break;
        case 'PARTICIPANT_PROMOTED': mappedType = 'PARTICIPANT_PROMOTED'; break;
        case 'MEETING_ENDED': mappedType = 'SESSION_ENDED'; break;
        case 'CONNECTION_LOST': mappedType = 'SESSION_RECONNECTING'; break;
        case 'JOIN_FAILED': mappedType = 'SESSION_ENDED'; break;
      }

      if (mappedType) {
        if (mappedType === 'HOST_CONNECTED') {
          console.log('STEP 3: WebMessageBridge received event, emitting HOST_CONNECTED to EventBus');
        }
        const fullEvent: LiveEvent<typeof mappedType> = {
          version: 1,
          provider: data.provider || 'zoom',
          sessionId: data.sessionId || '',
          timestamp: Date.now(),
          type: mappedType,
          payload: data
        };
        liveEventBus.emit(mappedType, fullEvent);
      }
    } catch (e) {
      // Ignore non-JSON postMessages
    }
  };
}

export const webMessageBridge = new WebMessageBridgeService();
