type TelemetryEvent = 
  | 'LIVE_SESSION_CREATED'
  | 'LIVE_SESSION_JOIN_REQUESTED'
  | 'LIVE_SESSION_JOINED'
  | 'LIVE_SESSION_LEFT'
  | 'LIVE_SESSION_RECONNECTED'
  | 'LIVE_SESSION_ENDED'
  | 'LIVE_PROVIDER_INITIALIZED'
  | 'LIVE_PROVIDER_ERROR';

export function emitTelemetry(event: TelemetryEvent, payload?: Record<string, any>) {
  // In a real implementation, this would send to an observability platform
  // like Datadog, New Relic, or a custom backend logging endpoint.
  console.log(`[Telemetry] ${event}`, payload || {});
}

