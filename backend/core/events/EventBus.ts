type EventHandler = (payload: any) => void | Promise<void>;

export class EventBus {
  private static handlers: Record<string, EventHandler[]> = {};

  static subscribe(event: string, handler: EventHandler) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  static async emit(event: string, payload: any) {
    const eventHandlers = this.handlers[event];
    if (eventHandlers) {
      // Fire handlers asynchronously so we don't block the main thread
      Promise.all(eventHandlers.map(handler => handler(payload))).catch(err => {
        console.error(`Error in event handler for ${event}:`, err);
      });
    }
  }
}

// Common Event Types
export const Events = {
  PERMISSION_GRANTED: 'PermissionGranted',
  PERMISSION_REVOKED: 'PermissionRevoked',
  REQUEST_APPROVED: 'RequestApproved',
  REQUEST_REJECTED: 'RequestRejected',
  // LAMS Events
  LIVE_SESSION_STATUS_CHANGED: 'LiveSessionStatusChanged',
  ATTENDANCE_STARTED: 'AttendanceStarted',
  ATTENDANCE_ENDED: 'AttendanceEnded'
};
