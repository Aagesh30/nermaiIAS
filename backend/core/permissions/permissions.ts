// Central Registry for all actionable permissions in the system.
// This replaces string-based role matching ("teacher", "admin") with granular abilities.

export const Permissions = {
  // Course Management
  COURSE_READ: 'course:read',
  COURSE_CREATE: 'course:create',
  COURSE_UPDATE: 'course:update',
  COURSE_DELETE: 'course:delete',

  // Video Management (Deprecated for Resource Management, but kept for compatibility during transition)
  VIDEO_READ: 'video:read',
  VIDEO_UPLOAD: 'video:upload',
  VIDEO_UPDATE: 'video:update',
  VIDEO_DELETE: 'video:delete',

  // Resource Management
  RESOURCE_READ: 'resource:read',
  RESOURCE_CREATE: 'resource:create',
  RESOURCE_UPDATE: 'resource:update',
  RESOURCE_DELETE: 'resource:delete',

  // Student Management
  STUDENT_READ: 'student:read',
  STUDENT_CREATE: 'student:create',
  STUDENT_UPDATE: 'student:update',
  STUDENT_DELETE: 'student:delete',
  STUDENT_ENROLL: 'student:enroll',
  STUDENT_ASSIGN_ROLE: 'student:assign_role',

  // Staff Management
  STAFF_READ: 'staff:read',
  STAFF_CREATE: 'staff:create',
  STAFF_UPDATE: 'staff:update',
  STAFF_DELETE: 'staff:delete',

  // Attendance
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_MARK: 'attendance:mark',
  ATTENDANCE_START: 'attendance:start',
  ATTENDANCE_END: 'attendance:end',

  // Live Classes
  LIVE_CLASS_READ: 'live-class:read',
  LIVE_CLASS_CREATE: 'live-class:create',
  LIVE_CLASS_UPDATE: 'live-class:update',
  LIVE_CLASS_DELETE: 'live-class:delete',
  LIVE_CLASS_START: 'live-class:start',
  LIVE_CLASS_END: 'live-class:end',
  LIVE_CLASS_MODERATE: 'live-class:moderate',

  // Exams / Test Portal
  EXAM_READ: 'exam:read',
  EXAM_CREATE: 'exam:create',
  EXAM_UPDATE: 'exam:update',
  EXAM_DELETE: 'exam:delete',
  EXAM_PUBLISH: 'exam:publish',
  EXAM_TAKE: 'exam:take',
  EXAM_REVIEW: 'exam:review',
  EXAM_EVALUATE: 'exam:evaluate',
  QUESTION_BANK_READ: 'question-bank:read',
  QUESTION_BANK_MANAGE: 'question-bank:manage',

  // Fees / ERP Financial
  FEES_READ: 'fees:read',
  FEES_CREATE: 'fees:create',
  FEES_UPDATE: 'fees:update',
  FEES_DELETE: 'fees:delete',

  // Marks / Academic Results
  MARKS_READ: 'marks:read',
  MARKS_CREATE: 'marks:create',
  MARKS_UPDATE: 'marks:update',

  // AI Assistant
  CHATBOT_ASK: 'chatbot:ask',
  CHATBOT_HISTORY_READ: 'chatbot-history:read',
  AI_QUOTA_EXEMPT: 'ai:quota-exempt',   // Super admin only — bypass AI quota

  // Dashboard & Analytics
  METRICS_READ: 'metrics:read',
  ANALYTICS_READ: 'analytics:read',

  // File Uploads
  FILE_UPLOAD: 'file:upload',
  FILE_DELETE: 'file:delete',

  // CRM
  CRM_READ: 'crm:read',
  CRM_MANAGE: 'crm:manage',
  LEAD_READ: 'lead:read',
  LEAD_MANAGE: 'lead:manage',
  ADMISSION_READ: 'admission:read',
  ADMISSION_MANAGE: 'admission:manage',

  // Notifications / Announcements
  ANNOUNCEMENT_READ: 'announcement:read',
  ANNOUNCEMENT_CREATE: 'announcement:create',

  // Developer Portal (highest privilege)
  DEVELOPER_ACCESS: 'developer:access',

  // Session Management
  SESSION_REVOKE_SELF: 'session:revoke-self',
  SESSION_REVOKE_ALL: 'session:revoke-all',

  // Security Audit
  AUDIT_READ: 'audit:read',
  SECURITY_ALERT_READ: 'security-alert:read',
} as const;

export type Permission = typeof Permissions[keyof typeof Permissions];
