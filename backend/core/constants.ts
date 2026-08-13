export const RedisConfig = {
  // Intervals
  WATCH_PROGRESS_INTERVAL_SEC: 60, // Used by basic progress
  WATCH_HEARTBEAT_INTERVAL_SEC: 90, // Recorded class attendance
  LIVE_HEARTBEAT_INTERVAL_SEC: 300, // Live class attendance (5 minutes)
  ATTENDANCE_FLUSH_INTERVAL_SEC: 600, // Background sync to Firestore
  
  // Logic
  RECORDED_COMPLETION_THRESHOLD_PERCENT: 95,

  // TTLs
  TTL_WATCH_PROGRESS_SEC: 86400, // 24 hours
  TTL_ATTENDANCE_SEC: 86400, // 24 hours
  TTL_ASSISTANT_CONTEXT_SEC: 900, // 15 minutes
  TTL_MEMBERSHIP_SEC: 43200, // 12 hours
};
