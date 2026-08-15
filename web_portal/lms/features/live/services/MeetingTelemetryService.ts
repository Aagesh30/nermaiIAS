export type TelemetryEventName =
  | 'LAUNCH_INITIATED'
  | 'POPUP_OPENED'
  | 'POPUP_BLOCKED'
  | 'POPUP_CLOSED_BY_USER'
  | 'POPUP_CLOSED_BY_LMS'
  | 'RECONNECT_INITIATED'
  | 'BRIDGE_EVENT_RECEIVED'
  | 'JOIN_SUCCESSFUL'
  | 'HEARTBEAT_TIMEOUT'
  | 'UNEXPECTED_EXIT';

export interface TelemetryEntry {
  event: TelemetryEventName;
  timestamp: number;
  meta: Record<string, unknown>;
}

/**
 * MeetingTelemetryService
 *
 * Lightweight in-memory telemetry for production debugging.
 * Records meeting lifecycle events without cluttering UI code.
 *
 * In production this can be extended to flush entries to your
 * analytics/audit backend without changing any call sites.
 */
class MeetingTelemetryServiceClass {
  private log: TelemetryEntry[] = [];
  private maxEntries = 200;

  record(event: TelemetryEventName, meta: Record<string, unknown> = {}): void {
    const entry: TelemetryEntry = { event, timestamp: Date.now(), meta };

    if (this.log.length >= this.maxEntries) {
      this.log.shift(); // Drop oldest entry to keep memory bounded
    }

    this.log.push(entry);
  }

  /** Returns a snapshot of all recorded entries */
  getLog(): ReadonlyArray<TelemetryEntry> {
    return [...this.log];
  }

  /** Returns entries for a specific event type */
  getEntriesByEvent(event: TelemetryEventName): TelemetryEntry[] {
    return this.log.filter(e => e.event === event);
  }

  /** Prints a human-readable summary to the console (for debugging) */
  printSummary(): void {
    console.group('[MeetingTelemetry] Session Log');
    this.log.forEach(e => {
      const time = new Date(e.timestamp).toISOString().substring(11, 23);
      console.log(`[${time}] ${e.event}`, e.meta);
    });
    console.groupEnd();
  }

  clear(): void {
    this.log = [];
  }
}

export const MeetingTelemetryService = new MeetingTelemetryServiceClass();
