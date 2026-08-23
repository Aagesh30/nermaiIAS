import { Router } from "express";
import announcementRouter from "../modules/announcement";
import notificationRouter from "../modules/notification";
import authRouter from "../modules/auth";
import studentRouter from "../modules/erp/student";
import staffRouter from "../modules/erp/staff";
import feesRouter from "../modules/erp/fees";
import marksRouter from "../modules/erp/marks";
import idCardRouter from "../modules/erp/id-card";
import analyticsRouter from "../modules/erp/analytics";
import dailyQuizRouter from "../modules/lms/daily_quiz";
import dailyContentRouter from "../modules/lms/daily_content";
import batchRouter from "../modules/erp/batch";
import profileRequestRouter from "../modules/erp/profile-request";
import admissionRouter from "../modules/crm/admission";
import alumniFeedbackRouter from "../modules/crm/alumni-feedback";
import campaignsRouter from "../modules/crm/campaigns";
import feeRemindersRouter from "../modules/crm/fee-reminders";
import leadsRouter from "../modules/crm/leads";
import freebiesRouter from "../modules/crm/freebies";
import coursesRouter from "../modules/crm/courses";
import inquiryRouter from "../modules/crm/inquiry";
import guestPostersRouter from "../modules/crm/guest-posters";
import adminDashboardRouter from "../modules/dashboard/admin";
import erpDashboardRouter from "../modules/dashboard/erp";
import studentDashboardRouter from "../modules/dashboard/student";
import testCreationRouter from "../modules/test-portal/test-creation";
import examinationRouter from "../modules/test-portal/examination";
import reviewRouter from "../modules/test-portal/review";
import evaluationRouter from "../modules/test-portal/evaluation";
import questionBankRouter from "../modules/test-portal/question-bank";
import developerRouter from "../modules/developer";

// Integrated LMS Modules
import { StudentsRoutes, BatchRoutes } from "../modules/students";
import { CoursesRoutes, SubjectRoutes, TopicRoutes, SubtopicRoutes, ClassRoutes, renderPlayer, renderZoomPlayer } from "../modules/courses";
import { resourceRoutes } from "../modules/resources";
import { WatchHistoryRoutes } from "../modules/watch-history";
import { AttendanceRoutes } from "../modules/attendance";
import { liveAttendanceRoutes } from "../modules/live-attendance";
import { liveCommentsRoutes } from "../modules/live-comments";
import announcementLmsRoutes from "../modules/announcements/routes";
import accessRulesRouter from "../modules/access-rules";
import accessRequestsRouter from "../modules/access-requests/routes";
import lmsAttendanceRouter from '../modules/lms-attendance/routes';
import { kbRoutes } from "../modules/knowledge-base";
import { assistantRoutes } from "../modules/assistant";
import { interactionRoutes } from "../modules/interaction-engine";
import { liveSessionsRoutes } from "../modules/live-sessions";
import providerAccountRoutes from "../modules/provider-accounts/routes";

const router = Router();

// Auth Routes
router.use("/auth", authRouter);

// Announcement Routes
router.use("/announcement", announcementRouter);

// Notification Routes
router.use("/notification", notificationRouter);

// ERP Routes
router.use("/erp/student", studentRouter);
router.use("/erp/staff", staffRouter);
router.use("/staff", staffRouter);
router.use("/erp/fees", feesRouter);
router.use("/erp/marks", marksRouter);
router.use("/erp/id-card", idCardRouter);
router.use("/erp/analytics", analyticsRouter);
router.use("/erp/batch", batchRouter);
router.use("/erp/profile-request", profileRequestRouter);

// LMS Daily Quiz Routes
router.use("/lms/daily-quiz", dailyQuizRouter);
router.use("/lms/daily-content", dailyContentRouter);

// CRM Routes
router.use("/crm/admission", admissionRouter);
router.use("/crm/alumni-feedback", alumniFeedbackRouter);
router.use("/crm/campaigns", campaignsRouter);
router.use("/crm/fee-reminders", feeRemindersRouter);
router.use("/crm/leads", leadsRouter);
router.use("/crm/freebies", freebiesRouter);
router.use("/crm/courses", coursesRouter);
router.use("/crm/inquiry", inquiryRouter);
router.use("/crm/guest-posters", guestPostersRouter);

// Dashboard Routes
router.use("/dashboard/admin", adminDashboardRouter);
router.use("/dashboard/erp", erpDashboardRouter);
router.use("/dashboard/student", studentDashboardRouter);

// Test Portal Routes
router.use("/test-portal/test-creation", testCreationRouter);
router.use("/test-portal/examination", examinationRouter);
router.use("/test-portal/review", reviewRouter);
router.use("/test-portal/evaluation", evaluationRouter);
router.use("/test-portal/question-bank", questionBankRouter);

// Developer Portal Routes
router.use("/developer", developerRouter);

// Player Routes (Auth via token)
router.get("/player/:token", renderPlayer);
router.get("/player/zoom/:token", renderZoomPlayer);

// Integrated LMS 2nd Batch Routes (API v1)
router.use("/students", StudentsRoutes);
router.use("/v1/students", StudentsRoutes);
router.use("/batches", BatchRoutes);
router.use("/v1/batches", BatchRoutes);
router.use("/courses", CoursesRoutes);
router.use("/v1/courses", CoursesRoutes);
router.use("/subjects", SubjectRoutes);
router.use("/v1/subjects", SubjectRoutes);
router.use("/topics", TopicRoutes);
router.use("/v1/topics", TopicRoutes);
router.use("/subtopics", SubtopicRoutes);
router.use("/v1/subtopics", SubtopicRoutes);
router.use("/classes", ClassRoutes);
router.use("/v1/classes", ClassRoutes);
router.use("/resources", resourceRoutes);
router.use("/v1/resources", resourceRoutes);
router.use("/watch-history", WatchHistoryRoutes);
router.use("/v1/watch-history", WatchHistoryRoutes);
router.use("/attendance", AttendanceRoutes);
router.use("/v1/attendance", AttendanceRoutes);
router.use("/live-attendance", liveAttendanceRoutes);
router.use("/v1/live-attendance", liveAttendanceRoutes);
router.use("/live-comments", liveCommentsRoutes);
router.use("/v1/live-comments", liveCommentsRoutes);
router.use("/announcements", announcementLmsRoutes);
router.use("/v1/announcements", announcementLmsRoutes);
router.use("/access-rules", accessRulesRouter);
router.use("/v1/access-rules", accessRulesRouter);
router.use('/access-requests', accessRequestsRouter);
router.use('/v1/access-requests', accessRequestsRouter);
router.use('/lms-attendance', lmsAttendanceRouter);
router.use('/v1/lms-attendance', lmsAttendanceRouter);
router.use("/knowledge-base", kbRoutes);
router.use("/v1/knowledge-base", kbRoutes);
router.use("/assistant", assistantRoutes);
router.use("/v1/assistant", assistantRoutes);
router.use("/interaction", interactionRoutes);
router.use("/v1/interaction", interactionRoutes);
router.use("/live-sessions", liveSessionsRoutes);
router.use("/v1/live-sessions", liveSessionsRoutes);
router.use("/providers/accounts", providerAccountRoutes);
router.use("/v1/providers/accounts", providerAccountRoutes);

export default router;
