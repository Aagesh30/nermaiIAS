import { liveEventBus } from './LiveEventBus';
import { MeetingStateManager } from '../../services/MeetingStateManager';
import { LiveSessionContextState } from '../../context/LiveSessionContext';

class RecoveryManager {
  private isInitialized = false;
  private setAcademicState: ((state: LiveSessionContextState['academicState']) => void) | null = null;
  private getAcademicState: (() => LiveSessionContextState['academicState']) | null = null;
  private getSessionId: (() => string | undefined) | null = null;

  init(
    updateContext: (updates: Partial<LiveSessionContextState>) => void,
    getAcademicState: () => LiveSessionContextState['academicState'],
    getSessionId: () => string | undefined
  ) {
    if (this.isInitialized) return;
    
    this.setAcademicState = updateContext ? (state) => updateContext({ academicState: state }) : null;
    this.getAcademicState = getAcademicState;
    this.getSessionId = getSessionId;
    
    // Listen for window-level issues
    liveEventBus.on('POPUP_CLOSED', this.handlePopupClosed);
    liveEventBus.on('POPUP_BLOCKED', this.handlePopupBlocked);
    
    // Listen for meeting-level issues
    liveEventBus.on('HOST_DISCONNECTED', this.handleHostLeft);
    liveEventBus.on('SESSION_RECONNECTING', this.handleNetworkDisconnect);
    liveEventBus.on('SESSION_RECONNECTED', this.handleNetworkReconnect);
    liveEventBus.on('SESSION_ENDED', this.handleMeetingCrash);
    
    this.isInitialized = true;
  }

  private handlePopupClosed = () => {
    // Zoom window was manually closed unexpectedly
    const currentStatus = this.getAcademicState ? this.getAcademicState() : undefined;
    const sessionId = this.getSessionId ? this.getSessionId() : undefined;
    console.warn(`[RecoveryController] Popup closed unexpectedly. SessionId: ${sessionId}, Status: ${currentStatus}. Waiting for user to rejoin.`);
    console.info(JSON.stringify({
      event: "ZOOM_POPUP_CLOSED",
      sessionId,
      sessionStatus: currentStatus,
      zoomState: MeetingStateManager.getState(),
    }));
    if (currentStatus === 'LIVE') {
      console.info(JSON.stringify({
        event: "REJOIN_AVAILABLE",
        sessionId,
      }));
    }
  };

  private handlePopupBlocked = () => {
    // Browser blocked the popup
    console.error('[RecoveryController] Popup blocked by browser.');
    MeetingStateManager.setState('blocked');
  };

  private handleHostLeft = () => {
    console.warn('[RecoveryController] Host dropped. Attempting to keep session alive for students.');
    // Show toast or notification that host has disconnected
    // LiveSessionContext handles setHostConnected(false) directly, so UI will update
  };

  private handleNetworkDisconnect = () => {
    console.warn('[RecoveryController] Network disconnected. Meeting is attempting to reconnect...');
    const currentStatus = this.getAcademicState ? this.getAcademicState() : 'SCHEDULED';
    if (currentStatus !== 'ENDED' && currentStatus !== 'CANCELLED') {
      console.warn(JSON.stringify({
        event: "INVALID_STATE_TRANSITION",
        from: currentStatus,
        to: "SCHEDULED",
        reason: "Blocked explicit reset to SCHEDULED during reconnect"
      }));
      return;
    }
    if (this.setAcademicState) {
      this.setAcademicState('SCHEDULED');
    }
  };

  private handleNetworkReconnect = () => {
    console.info('[RecoveryController] Network reconnected successfully.');
    if (this.setAcademicState) {
      this.setAcademicState('LIVE');
    }
  };

  private handleMeetingCrash = (event: any) => {
    console.error('[RecoveryController] Meeting crashed or ended unexpectedly.', event.payload?.reason);
    if (this.setAcademicState) {
      this.setAcademicState('ENDED');
    }
    MeetingStateManager.setState('closed');
  };
}

export const recoveryController = new RecoveryManager();
