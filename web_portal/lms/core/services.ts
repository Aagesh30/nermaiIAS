/**
 * LMS API Services
 * 
 * This replaces the @nermai/api package from Folder 2.
 * All services use our bridged API client that reads auth from Folder 1's localStorage.
 */

import api from './api';
export { getApiClient } from './api';

// ─── Courses & Curriculum ────────────────────────────────────────────────────

export const CourseApi = {
  // Courses
  listCourses: () => api.get('/courses'),
  getCourse: (id: string) => api.get(`/courses/${id}`),
  createCourse: (data: any) => api.post('/courses', data),
  updateCourse: (id: string, data: any) => api.put(`/courses/${id}`, data),
  deleteCourse: (id: string) => api.delete(`/courses/${id}`),
  syncSyllabus: (courseId: string) => api.post('/courses/syllabus/sync', { courseId }),

  // Subjects
  listAllSubjects: () => api.get('/subjects'),
  listSubjectsByCourse: (courseId: string) => api.get(`/courses/${courseId}/subjects`),
  createSubject: (courseId: string, data: any) => api.post(`/courses/${courseId}/subjects`, data),
  updateSubject: (id: string, data: any) => api.put(`/subjects/${id}`, data),
  deleteSubject: (id: string) => api.delete(`/subjects/${id}`),

  // Topics
  listAllTopics: () => api.get('/topics'),
  listTopicsBySubject: (subjectId: string) => api.get(`/subjects/${subjectId}/topics`),
  createTopic: (subjectId: string, data: any) => api.post(`/subjects/${subjectId}/topics`, data),
  updateTopic: (id: string, data: any) => api.put(`/topics/${id}`, data),
  deleteTopic: (id: string) => api.delete(`/topics/${id}`),

  // Subtopics
  listAllSubtopics: () => api.get('/subtopics'),
  listSubtopicsByTopic: (topicId: string) => api.get(`/topics/${topicId}/subtopics`),
  createSubtopic: (topicId: string, data: any) => api.post(`/topics/${topicId}/subtopics`, data),
  updateSubtopic: (id: string, data: any) => api.put(`/subtopics/${id}`, data),
  deleteSubtopic: (id: string) => api.delete(`/subtopics/${id}`),
  listClassesBySubtopic: (subtopicId: string) => api.get(`/subtopics/${subtopicId}/classes`),

  // Classes
  listAllClasses: () => api.get('/classes'),
  listClassesByTopic: (topicId: string) => api.get(`/topics/${topicId}/classes`),
  createClass: (topicId: string, data: any) => api.post(`/topics/${topicId}/classes`, data),
  updateClass: (id: string, data: any) => api.put(`/classes/${id}`, data),
  deleteClass: (id: string) => api.delete(`/classes/${id}`),
  getClassPlaybackAccess: (id: string) => api.get(`/classes/${id}/access`),
  validateJoinToken: (data: { token: string }) => api.get(`/live-sessions/token/${data.token}`),
  uploadClassRecording: (id: string, data: any) => api.put(`/classes/${id}/recording`, data),

  // Staff assignment
  assignStaff: (courseId: string, staffId: string) => api.post(`/courses/${courseId}/assign-staff`, { staffId }),
  unassignStaff: (courseId: string, staffId: string) => api.delete(`/courses/${courseId}/unassign-staff/${staffId}`),
  getAssignedStaff: (courseId: string) => api.get(`/courses/${courseId}/staff`),
};

// ─── Live Sessions ───────────────────────────────────────────────────────────

export const LiveSessionApi = {
  getCapabilities: (config?: any) => api.get(`/live-sessions/providers/capabilities`, config),
  listSessions: (params?: { teacherId?: string }, config?: any) => api.get('/live-sessions', { params, ...config }),
  createSession: (data: any) => api.post(`/live-sessions/create`, data),
  editSession: (sessionId: string, data: any) => api.patch(`/live-sessions/${sessionId}/edit`, data),
  rescheduleSession: (sessionId: string, newStartTime: string) => api.post(`/live-sessions/${sessionId}/reschedule`, { newStartTime }),
  cancelSession: (sessionId: string) => api.post(`/live-sessions/${sessionId}/cancel`),
  deleteSession: (sessionId: string) => api.delete(`/live-sessions/${sessionId}`),
  duplicateSession: (sessionId: string) => api.post(`/live-sessions/${sessionId}/duplicate`),
  archiveSession: (sessionId: string) => api.post(`/live-sessions/${sessionId}/archive`),
  startSession: (sessionId: string, adminOverride?: boolean) => api.post(`/live-sessions/${sessionId}/start`, {}, { params: { adminOverride } }),
  extendSession: (sessionId: string, data: { minutes: number; reason?: string }) => api.post(`/live-sessions/${sessionId}/extend`, data),
  endSession: (sessionId: string) => api.post(`/live-sessions/${sessionId}/end`),
  getSession: (sessionId: string) => api.get(`/live-sessions/${sessionId}`),
  joinSession: (sessionId: string, adminOverride?: boolean) => api.get(`/live-sessions/${sessionId}/join?t=${Date.now()}`, { params: { adminOverride } }),
  getSessionState: (sessionId: string, config?: any) => api.get(`/live-sessions/${sessionId}/state`, config),
  generateJoinToken: (sessionId: string, adminOverride?: boolean) => api.post(`/live-sessions/${sessionId}/join-token`, {}, { params: { adminOverride } }),
  joinByClass: (classId: string) => api.get(`/live-sessions/class/${classId}/join`),
  startAttendance: (sessionId: string) => api.post(`/live-sessions/${sessionId}/attendance/start`),
  endAttendance: (sessionId: string) => api.post(`/live-sessions/${sessionId}/attendance/end`),
  heartbeat: (sessionId: string) => api.post(`/live-sessions/${sessionId}/heartbeat`),
  postEvent: (sessionId: string, data: any) => api.post(`/live-sessions/${sessionId}/events`, data),
  listParticipants: (sessionId: string, config?: any) => api.get(`/live-sessions/${sessionId}/participants`, config),
  patchParticipant: (sessionId: string, studentId: string, data: { action: string; kickReasonCode?: string; kickCustomMessage?: string }) =>
    api.patch(`/live-sessions/${sessionId}/participants/${studentId}`, data),
  studentHeartbeat: (sessionId: string) => api.post(`/live-sessions/${sessionId}/participants/heartbeat`),
  listGlobalBlocks: (config?: any) => api.get(`/live-sessions/blocks`, config),
  blockStudent: (studentId: string, data?: { reason?: string; displayName?: string }) => api.post(`/live-sessions/blocks/${studentId}`, data),
  unblockStudent: (studentId: string) => api.delete(`/live-sessions/blocks/${studentId}`),
  recordPromotion: (sessionId: string, data: any) => api.post(`/live-sessions/${sessionId}/promotions/cohost`, data),
};

export const LiveClassesApi = {
  leaveSession: (sessionId: string) => api.post(`/live-sessions/${sessionId}/participants/leave`),
};

// ─── Provider Accounts ───────────────────────────────────────────────────────

export const ProviderAccountsApi = {
  listAccounts: (config?: any) => api.get(`/providers/accounts`, config),
  getAccount: (id: string, config?: any) => api.get(`/providers/accounts/${id}`, config),
  createAccount: (data: any) => api.post(`/providers/accounts`, data),
  updateAccount: (id: string, data: any) => api.put(`/providers/accounts/${id}`, data),
  deleteAccount: (id: string) => api.delete(`/providers/accounts/${id}`),
};

// ─── Resources ───────────────────────────────────────────────────────────────

export const ResourceApi = {
  list: (params: { visibility?: string; courseId?: string; subjectId?: string; topicId?: string; classId?: string; batchId?: string; categoryId?: string; search?: string }) =>
    api.get('/resources', { params }),
  getCourseHierarchy: (courseId: string) => api.get(`/resources/course/${courseId}/hierarchy`),
  getResource: (id: string) => api.get(`/resources/${id}`),
  getAccess: (id: string) => api.get(`/resources/${id}/access`),
  createResource: (data: FormData | any) => api.post('/resources', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  }),
  updateResource: (id: string, data: any) => api.put(`/resources/${id}`, data),
  uploadNewVersion: (id: string, data: FormData) => api.post(`/resources/${id}/version`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteResource: (id: string) => api.delete(`/resources/${id}`),
  syncProgress: (payloads: any[]) => api.post('/resources/sync/progress', { payloads }),
  syncFavorites: (resourceIds: string[]) => api.post('/resources/sync/favorites', { resourceIds }),
  getFavorites: () => api.get('/resources/favorites'),
};

// ─── Students ────────────────────────────────────────────────────────────────

export const StudentApi = {
  listStudents: () => api.get('/students'),
  getStudent: (id: string) => api.get(`/students/${id}`),
  updateStudent: (id: string, data: any) => api.put(`/students/${id}`, data),
  deleteStudent: (id: string) => api.delete(`/students/${id}`),
  assignRole: (id: string, role: string) => api.patch(`/students/${id}/role`, { role }),
  assignBatch: (id: string, batchId: string) => api.post(`/students/${id}/batches`, { batchId }),
  removeBatch: (id: string, batchId: string) => api.delete(`/students/${id}/batches/${batchId}`),
  getEnrolledCourses: (id: string) => api.get(`/students/${id}/courses`),

  // QR Code Permissions API
  getQrSettings: () => api.get('/students/qr-settings'),
  updateQrSettings: (data: any) => api.put('/students/qr-settings', data),
  updateStudentQrPermission: (id: string, enabled: boolean) => api.patch(`/students/${id}/qr-permission`, { enabled }),
  enableQrBulk: (data: { type: 'batch' | 'paid' | 'free' | 'requested'; batchId?: string }) => api.post('/students/qr-enable-bulk', data),
  getStudentQrStatus: () => api.get('/students/me/qr-status'),
  requestStudentQr: () => api.post('/students/me/request-qr'),

  // Payment Acknowledgements API
  submitPaymentAcknowledgement: (data: { transactionId?: string; screenshotUrl?: string }) => api.post('/students/me/payment-acknowledgements', data),
  getStudentPaymentAcknowledgements: () => api.get('/students/me/payment-acknowledgements'),
  listPaymentAcknowledgements: (status?: string) => api.get('/students/payment-acknowledgements', { params: { status } }),
  updatePaymentAcknowledgementStatus: (id: string, status: 'approved' | 'rejected') => api.patch(`/students/payment-acknowledgements/${id}/status`, { status }),
};

export const BatchApi = {
  listBatches: () => api.get('/erp/batch'),
  getBatch: (id: string) => api.get(`/batches/${id}`),
  createBatch: (data: any) => api.post('/batches', data),
  updateBatch: (id: string, data: any) => api.put(`/batches/${id}`, data),
  deleteBatch: (id: string) => api.delete(`/batches/${id}`),
};

export const StaffApi = {
  getLiveSessionCandidates: () => api.get('/staff/live-session-candidates'),
  listStaff: () => api.get('/staff'),
  createStaff: (data: any) => api.post('/staff', data),
  promoteStudent: (userId: string, staffRole: string) => api.post('/staff/promote', { userId, staffRole }),
  getStaffClasses: (id: string) => api.get(`/staff/${id}/classes`),
  getStaffLiveSessions: (id: string) => api.get(`/staff/${id}/live-sessions`),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const DashboardApi = {
  getStudentOverview: () => api.get('/dashboard/student/overview'),
  getAdminMetrics: () => api.get('/dashboard/admin/metrics'),
  getTeacherMetrics: () => api.get('/dashboard/teacher/metrics'),
};

// ─── Attendance ──────────────────────────────────────────────────────────────

export const AttendanceApi = {
  list: (params?: any) => api.get('/attendance', { params }),
  markAttendance: (data: any) => api.post('/attendance', data),
  getLiveAttendance: (sessionId: string) => api.get(`/live-attendance/${sessionId}`),
  startLiveAttendance: (sessionId: string) => api.post(`/live-attendance/${sessionId}/start`),
  endLiveAttendance: (sessionId: string) => api.post(`/live-attendance/${sessionId}/end`),
  heartbeat: (sessionId: string) => api.post(`/live-attendance/${sessionId}/heartbeat`),
  sendAttendanceEvent: (payload: any, playerJwt: string) =>
    api.post('/attendance/event', payload, {
      headers: {
        Authorization: `Bearer ${playerJwt}`
      }
    }),
};

// ─── Live Comments ───────────────────────────────────────────────────────────

export const LiveCommentsApi = {
  getComments: (liveSessionId: string) => api.get(`/live-comments/${liveSessionId}`),
  createComment: (payload: any) => api.post('/live-comments', payload),
  addReply: (commentId: string, payload: any) => api.post(`/live-comments/${commentId}/reply`, payload),
  toggleReaction: (commentId: string, reaction: 'LIKE' | 'LOVE' | 'HELPFUL') => api.post(`/live-comments/${commentId}/react`, { reaction }),
  updateStatus: (commentId: string, status: 'OPEN' | 'ANSWERED' | 'CLOSED') => api.put(`/live-comments/admin/${commentId}/status`, { status }),
  togglePin: (commentId: string, isPinned: boolean) => api.put(`/live-comments/admin/${commentId}/pin`, { isPinned }),
  setHidden: (commentId: string, isHidden: boolean) => api.put(`/live-comments/admin/${commentId}/hide`, { isHidden }),
  deleteComment: (commentId: string) => api.delete(`/live-comments/admin/${commentId}`),
  deleteReply: (replyId: string) => api.delete(`/live-comments/admin/reply/${replyId}`),
};

// ─── Watch History ───────────────────────────────────────────────────────────

export const WatchHistoryApi = {
  get: () => api.get('/watch-history'),
  record: (data: any) => api.post('/watch-history', data),
};

// ─── Access Rules & Requests ─────────────────────────────────────────────────

export const AccessRulesApi = {
  getAccessStatus: (entityType: string, entityId: string, studentId: string) =>
    api.get(`/access-rules/evaluate/${entityType}/${entityId}?studentId=${studentId}`),
  getPermissionMatrix: (courseId: string) => api.get(`/access-rules/matrix/${courseId}`),
  setEntityPermission: (entityType: string, entityId: string, data: any) =>
    api.put(`/access-rules/entity/${entityType}/${entityId}`, data),
  submitAccessRequest: (data: any) => api.post('/access-requests', data),
  listAccessRequests: (filters?: Record<string, any>) => api.get('/access-requests/admin/pending', { params: filters }),
  approveRequest: (requestId: string, grantExpiresAt?: string) => api.post(`/access-requests/admin/${requestId}/approve`, { grantExpiresAt }),
  rejectRequest: (requestId: string, reason?: string) => api.post(`/access-requests/admin/${requestId}/reject`, { reason }),
  bulkApprove: (data: any) => api.post('/access-requests/admin/bulk-approve', data),
  listTemporaryGrants: () => api.get('/access-requests/admin/temporary-grants'),
  extendGrant: (grantId: string, additionalHours: number) => api.post(`/access-requests/admin/grants/${grantId}/extend`, { additionalHours }),
  revokeGrant: (grantId: string, reason: string) => api.post(`/access-requests/admin/grants/${grantId}/revoke`, { reason }),
  getAnalytics: () => api.get('/access-requests/admin/analytics'),
  exportAnalytics: () => api.post('/access-requests/admin/export'),
  listTemplates: () => api.get('/access-rules/templates'),
  createTemplate: (data: any) => api.post('/access-rules/templates', data),
  getBatchCapabilities: (batchId: string) => api.get(`/access-rules/batches/${batchId}/capabilities`),
  updateBatchCapabilities: (batchId: string, capabilities: any) => api.put(`/access-rules/batches/${batchId}/capabilities`, { capabilities }),
  listAccessHistory: (status?: 'APPROVED' | 'REJECTED') => api.get('/access-requests/admin/history', { params: status ? { status } : {} }),
  listPermanentGrants: () => api.get('/access-requests/admin/permanent-grants'),
  convertGrant: (grantId: string, data: any) => api.post(`/access-requests/admin/grants/${grantId}/convert`, data),
};

// ─── Assistant / Chatbot ─────────────────────────────────────────────────────

export const AssistantApi = {
  setContext: (data: { activeCourseId?: string; activeTopicId?: string; activeVideoId?: string }) =>
    api.post('/assistant/context', data),
  chat: (query: string, language: string = 'en') =>
    api.post('/assistant/chat', { query, language }),
  health: () => api.get('/assistant/health'),
  preview: (query: string, language: string = 'en') =>
    api.post('/assistant/preview', { query, language }),
  sync: (since?: string) => api.get('/assistant/sync', { params: since ? { since } : {} }),
};

// ─── Knowledge Base ──────────────────────────────────────────────────────────

export const KnowledgeBaseApi = {
  listArticles: (params?: any) => api.get('/knowledge-base/articles', { params }),
  getArticle: (id: string) => api.get(`/knowledge-base/articles/${id}`),
  createArticle: (data: any) => api.post('/knowledge-base/articles', data),
  updateArticle: (id: string, data: any) => api.put(`/knowledge-base/articles/${id}`, data),
  deleteArticle: (id: string) => api.delete(`/knowledge-base/articles/${id}`),
  listCollections: () => api.get('/knowledge-base/collections'),
  getSettings: () => api.get('/knowledge-base/settings'),
  updateSettings: (data: any) => api.put('/knowledge-base/settings', data),
  updateApiKey: (data: { provider: string; apiKey: string }) => api.post('/knowledge-base/settings/api-key', data),
};

export const LiveAttendanceApi = {
  startAttendance: (payload: any) => api.post('/live-attendance/staff/start', payload),
  endAttendance: (sessionId: string) => api.post(`/live-attendance/staff/${sessionId}/end`),
  getActiveSession: (liveSessionId: string) => api.get(`/live-attendance/staff/${liveSessionId}/active`),
  getSessionSummary: (sessionId: string) => api.get(`/live-attendance/staff/${sessionId}/summary`),
  getSessionLogs: (sessionId: string) => api.get(`/live-attendance/staff/${sessionId}/logs`),
  studentJoin: (sessionId: string) => api.post(`/live-attendance/student/${sessionId}/join`),
  studentLeave: (sessionId: string) => api.post(`/live-attendance/student/${sessionId}/leave`),
  checkActiveSession: (liveSessionId: string) => api.get(`/live-attendance/active/${liveSessionId}`),
};

export const AccessRequestApi = {
  createRequest: (data: any) => api.post('/access-requests', data),
  getMyRequests: () => api.get('/access-requests/my-requests'),
  listPendingRequests: (filters?: any) => api.get('/access-requests/admin/pending', { params: filters }),
  approveRequest: (requestId: string, data: any) => api.post(`/access-requests/admin/${requestId}/approve`, data),
  rejectRequest: (requestId: string, data: any) => api.post(`/access-requests/admin/${requestId}/reject`, data),
  bulkApprove: (data: any) => api.post('/access-requests/admin/bulk-approve', data),
  listTemporaryGrants: () => api.get('/access-requests/admin/temporary-grants'),
  extendGrant: (grantId: string, data: any) => api.post(`/access-requests/admin/grants/${grantId}/extend`, data),
  revokeGrant: (grantId: string, data: any) => api.post(`/access-requests/admin/grants/${grantId}/revoke`, data),
};
