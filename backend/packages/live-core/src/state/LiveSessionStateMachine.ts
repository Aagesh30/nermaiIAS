export type SessionState = 'IDLE' | 'STARTING' | 'LIVE' | 'ENDED' | 'ERROR';

type StateSubscriber = (state: SessionState) => void;

export class LiveSessionStateMachine {
  private currentState: SessionState = 'IDLE';
  private subscribers: Set<StateSubscriber> = new Set();

  transitionTo(newState: SessionState) {
    if (this.currentState === newState) return;
    
    this.currentState = newState;
    this.notifySubscribers();
  }

  getState(): SessionState {
    return this.currentState;
  }

  subscribe(callback: StateSubscriber) {
    this.subscribers.add(callback);
    callback(this.currentState);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(sub => sub(this.currentState));
  }
}
