import { getApiClient } from '../client';

export const CourseApi = {
  // Courses
  listCourses: () => getApiClient().get('/courses'),
  getCourse: (id: string) => getApiClient().get(`/courses/${id}`),
  createCourse: (data: any) => getApiClient().post('/courses', data),
  updateCourse: (id: string, data: any) => getApiClient().put(`/courses/${id}`, data),
  deleteCourse: (id: string) => getApiClient().delete(`/courses/${id}`),

  // Subjects
  listAllSubjects: () => getApiClient().get('/subjects'),
  listSubjectsByCourse: (courseId: string) => getApiClient().get(`/courses/${courseId}/subjects`),
  createSubject: (courseId: string, data: any) => getApiClient().post(`/courses/${courseId}/subjects`, data),
  updateSubject: (id: string, data: any) => getApiClient().put(`/subjects/${id}`, data),
  deleteSubject: (id: string) => getApiClient().delete(`/subjects/${id}`),

  // Topics
  listAllTopics: () => getApiClient().get('/topics'),
  listTopicsBySubject: (subjectId: string) => getApiClient().get(`/subjects/${subjectId}/topics`),
  createTopic: (subjectId: string, data: any) => getApiClient().post(`/subjects/${subjectId}/topics`, data),
  updateTopic: (id: string, data: any) => getApiClient().put(`/topics/${id}`, data),
  deleteTopic: (id: string) => getApiClient().delete(`/topics/${id}`),

  // Classes
  listAllClasses: () => getApiClient().get('/classes'),
  listClassesByTopic: (topicId: string) => getApiClient().get(`/topics/${topicId}/classes`),
  createClass: (topicId: string, data: any) => getApiClient().post(`/topics/${topicId}/classes`, data),
  updateClass: (id: string, data: any) => getApiClient().put(`/classes/${id}`, data),
  deleteClass: (id: string) => getApiClient().delete(`/classes/${id}`),
  getClassPlaybackAccess: (id: string) => getApiClient().get(`/classes/${id}/access`),
  validateJoinToken: (data: { token: string }) => getApiClient().get(`/live-sessions/token/${data.token}`),
  uploadClassRecording: (id: string, data: any) => getApiClient().put(`/classes/${id}/recording`, data),
};

export const ProviderAccountsApi = {
  listAccounts: (config?: any) => getApiClient().get(`/providers/accounts`, config),
  getAccount: (id: string, config?: any) => getApiClient().get(`/providers/accounts/${id}`, config),
  createAccount: (data: any) => getApiClient().post(`/providers/accounts`, data),
  updateAccount: (id: string, data: any) => getApiClient().put(`/providers/accounts/${id}`, data),
  deleteAccount: (id: string) => getApiClient().delete(`/providers/accounts/${id}`),
};

export const LiveSessionApi = {
  getCapabilities: (config?: any) => getApiClient().get(`/live-sessions/providers/capabilities`, config),
  listSessions: (params?: { teacherId?: string }, config?: any) => getApiClient().get(`/live-sessions`, { params, ...config }),
  createSession: (data: { classId: string, provider: string, customProviderId?: string, providerPasscode?: string, scheduledStartTime?: string, expectedDurationMinutes?: number, providerAccountId?: string, meetingMode?: string, hostUrl?: string, participantUrl?: string, hostKey?: string, meetingCode?: string }) => getApiClient().post(`/live-sessions/create`, data),
  editSession: (sessionId: string, data: any) => getApiClient().patch(`/live-sessions/${sessionId}/edit`, data),
  rescheduleSession: (sessionId: string, newStartTime: string) => getApiClient().post(`/live-sessions/${sessionId}/reschedule`, { newStartTime }),
  cancelSession: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/cancel`),
  deleteSession: (sessionId: string) => getApiClient().delete(`/live-sessions/${sessionId}`),
  duplicateSession: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/duplicate`),
  archiveSession: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/archive`),
  
  startSession: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/start`),
  extendSession: (sessionId: string, data: { minutes: number, reason?: string }) => getApiClient().post(`/live-sessions/${sessionId}/extend`, data),
  endSession: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/end`),
  joinSession: (sessionId: string) => getApiClient().get(`/live-sessions/${sessionId}/join`),
  getSessionState: (sessionId: string, config?: any) => getApiClient().get(`/live-sessions/${sessionId}/state`, config),
  generateJoinToken: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/join-token`),
  joinByClass: (classId: string) => getApiClient().get(`/live-sessions/class/${classId}/join`),
  startAttendance: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/attendance/start`),
  endAttendance: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/attendance/end`),
  heartbeat: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/heartbeat`),
  
  // Participant Moderation & Realtime APIs
  listParticipants: (sessionId: string, config?: any) => getApiClient().get(`/live-sessions/${sessionId}/participants`, config),
  patchParticipant: (sessionId: string, studentId: string, data: { action: string; kickReasonCode?: string; kickCustomMessage?: string }) =>
    getApiClient().patch(`/live-sessions/${sessionId}/participants/${studentId}`, data),
  studentHeartbeat: (sessionId: string) => getApiClient().post(`/live-sessions/${sessionId}/participants/heartbeat`),
  listGlobalBlocks: (config?: any) => getApiClient().get(`/live-sessions/blocks`, config),
  blockStudent: (studentId: string, data?: { reason?: string; displayName?: string }) => getApiClient().post(`/live-sessions/blocks/${studentId}`, data),
  unblockStudent: (studentId: string) => getApiClient().delete(`/live-sessions/blocks/${studentId}`),
};
