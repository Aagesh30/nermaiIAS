/**
 * LMS Module Entry Point
 * 
 * This file is the single entry point for all LMS functionality.
 * Import this into App.tsx to get the full LMS integration.
 * 
 * Usage in App.tsx:
 *   import { LMSProvider, AdminLMSRouter, StudentLMSRouter, StaffLMSRouter, NERMAIAssistantOverlay } from './lms';
 */

// Provider (wraps everything with QueryClient)
export { LMSProvider } from './LMSProvider';

// Admin LMS pages
export { CoursesPage } from './admin/CoursesPage';
export { SubjectsPage } from './admin/SubjectsPage';
export { TopicsPage } from './admin/TopicsPage';
export { ClassesPage } from './admin/ClassesPage';
export { ResourcesPage } from './admin/ResourcesPage';
export { VideosPage } from './admin/VideosPage';
export { default as ProviderAccountsPage } from './admin/ProviderAccountsPage';
export { AccessControlPage } from './admin/AccessControlPage';
export { KnowledgeStudio } from './admin/KnowledgeStudio';
export { LiveSessionsPage } from './admin/LiveSessionsPage';

// Student LMS pages
export { StudentCoursesPage } from './student/StudentCoursesPage';
export { CoursePlayer } from './student/CoursePlayer';
export { StudentLiveClassesPage } from './student/StudentLiveClassesPage';

// Staff LMS pages
export { StaffCoursesPage } from './staff/StaffCoursesPage';
export { StaffClassesPage } from './staff/StaffClassesPage';
export { TeacherDashboard } from './staff/TeacherDashboard';

// Chatbot Widget (floating overlay)
export { NERMAIAssistantWidget } from './student/NERMAIAssistantWidget';

// Shared UI
export * from './components/admin-ui';

// Core API (for use in App.tsx or other components)
export { default as lmsApi } from './core/api';
export * from './core/services';

// Security Managers
export { StudentSecurityManager } from './core/security/StudentSecurityManager';
export { ClipboardGuard } from './core/security/ClipboardGuard';
export { ScreenProtectionManager } from './core/security/ScreenProtectionManager';
export { ShareGuard } from './core/security/ShareGuard';
export { LiveRecoveryManager } from './core/security/LiveRecoveryManager';
