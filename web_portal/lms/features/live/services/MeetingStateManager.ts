import { MeetingWindowState, MeetingBridgeEvent } from './MeetingTypes';

type StateListener = (state: MeetingWindowState) => void;

/**
 * MeetingStateManager — single source of truth for the meeting window lifecycle.
 *
 * Every UI component that needs to show meeting status subscribes here
 * instead of polling the window object directly.
 *
 * States:
 *   idle → opening → open → joined → active → ended → closed
 *                                   ↘ reconnecting ↗
 *                                   ↘ blocked (popup blocked)
 */
class MeetingStateManagerClass {
  private state: MeetingWindowState = 'idle';
  private listeners: Set<StateListener> = new Set();

  getState(): MeetingWindowState {
    return this.state;
  }

  setState(next: MeetingWindowState): void {
    if (this.state === next) return;
    this.state = next;
    this.listeners.forEach(fn => fn(next));
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Immediately emit current state to new subscriber
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Handle an incoming postMessage bridge event from the popup.
   * Only the four top-level lifecycle events are recognized.
   */
  handleBridgeEvent(event: MeetingBridgeEvent): void {
    switch (event) {
      case 'MEETING_STARTED':
        this.setState('active');
        break;
      case 'MEETING_ENDED':
        this.setState('ended');
        break;
      case 'WINDOW_CLOSED':
        this.setState('closed');
        break;
      case 'RECONNECT_REQUESTED':
        this.setState('reconnecting');
        break;
      case 'LAUNCHER_OPENED':
        this.setState('open');
        break;
      case 'MEET_LAUNCH_REQUESTED':
        this.setState('active');
        break;
    }
  }

  reset(): void {
    this.setState('idle');
  }
}

export const MeetingStateManager = new MeetingStateManagerClass();
