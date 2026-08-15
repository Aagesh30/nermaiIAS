import { liveEventBus, LiveEventMap, LiveEvent } from '../dashboard/orchestration/LiveEventBus';
import { MeetingStateManager } from './MeetingStateManager';
import { MeetingWindowState } from './MeetingTypes';

class MeetingStateBusAdapterService {
  private unsubscribe: (() => void) | null = null;
  private currentSessionId: string | null = null;

  start(sessionId: string) {
    if (this.unsubscribe) return;
    this.currentSessionId = sessionId;

    this.unsubscribe = MeetingStateManager.subscribe((state: MeetingWindowState) => {
      let mappedType: keyof LiveEventMap | undefined;

      switch (state) {
        case 'open':
        case 'opening':
          mappedType = 'POPUP_OPENED';
          break;
        case 'closed':
          mappedType = 'POPUP_CLOSED';
          break;
        case 'blocked':
          mappedType = 'POPUP_BLOCKED';
          break;
      }

      if (mappedType && this.currentSessionId) {
        const fullEvent: LiveEvent<typeof mappedType> = {
          version: 1,
          provider: 'system',
          sessionId: this.currentSessionId,
          timestamp: Date.now(),
          type: mappedType,
          payload: {} as any // these events have no payload
        };
        liveEventBus.emit(mappedType, fullEvent);
      }
    });
  }

  stop() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.currentSessionId = null;
  }
}

export const meetingStateBusAdapter = new MeetingStateBusAdapterService();
