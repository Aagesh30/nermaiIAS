import { Router } from 'express';
import { getStudentDashboardOverview, getAdminDashboardMetrics, getTeacherDashboardMetrics } from './controller';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';

const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);

// Student Overview
dashboardRoutes.get('/student/overview', requireRole(['student']), getStudentDashboardOverview);

// Admin Metrics
dashboardRoutes.get('/admin/metrics', requireRole(['super_admin', 'staff']), getAdminDashboardMetrics);

// Teacher Metrics
dashboardRoutes.get('/teacher/metrics', requireRole(['super_admin', 'admin', 'staff', 'teacher']), getTeacherDashboardMetrics);

export { dashboardRoutes };
