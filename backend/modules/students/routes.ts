import { Router } from 'express';
import { requireAuth, requireRole, requirePermission } from '../../core/middleware/auth.middleware';
import * as StudentController from './controller';

const adminAuth = [requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher'])];

export const studentRoutes = Router();

// Student Self-Service Routes (Accessible to 'student' role)
studentRoutes.patch('/me', requireAuth, StudentController.updateMe);
studentRoutes.get('/me/qr-status', requireAuth, StudentController.getStudentQrStatus);
studentRoutes.post('/me/request-qr', requireAuth, StudentController.requestStudentQr);
studentRoutes.post('/me/payment-acknowledgements', requireAuth, StudentController.submitPaymentAcknowledgement);
studentRoutes.get('/me/payment-acknowledgements', requireAuth, StudentController.getStudentPaymentAcknowledgements);

// Student LMS Discovery — batch-filtered content with SACS access decisions
// requireRole(['student']) is intentional: these endpoints must not be accessible to admin/teacher/staff
studentRoutes.get('/me/lms-classes', requireAuth, requireRole(['student']), StudentController.getMyLmsClassesHandler);
studentRoutes.get('/me/lms-resources', requireAuth, requireRole(['student']), StudentController.getMyLmsResourcesHandler);


// QR Code Permissions settings (Admin only)
studentRoutes.get('/qr-settings', [requireAuth, requirePermission("qr_permissions", "R")], StudentController.getQrSettings);
studentRoutes.put('/qr-settings', [requireAuth, requirePermission("qr_permissions", "U")], StudentController.updateQrSettings);
studentRoutes.patch('/:id/qr-permission', [requireAuth, requirePermission("qr_permissions", "U")], StudentController.updateStudentQrPermission);
studentRoutes.post('/qr-enable-bulk', [requireAuth, requirePermission("qr_permissions", "C")], StudentController.enableQrBulk);
studentRoutes.get('/payment-acknowledgements', adminAuth, StudentController.listPaymentAcknowledgements);
studentRoutes.patch('/payment-acknowledgements/:id/status', adminAuth, StudentController.updatePaymentAcknowledgementStatus);

// Student Profiles
studentRoutes.get('/', [requireAuth, requirePermission("student_management", "R")], StudentController.listStudents);
studentRoutes.get('/:id', [requireAuth, requirePermission("student_management", "R")], StudentController.getStudent);
studentRoutes.put('/:id', [requireAuth, requirePermission("student_management", "U")], StudentController.updateStudent);
studentRoutes.delete('/:id', [requireAuth, requirePermission("student_management", "D")], StudentController.deleteStudent);

// Student Role Management
studentRoutes.patch('/:id/role', adminAuth, StudentController.assignRole);

// Student Batches Management
studentRoutes.post('/:id/batches', adminAuth, StudentController.mapStudentToBatch); // Replaces /enroll or /batch/map-student
studentRoutes.delete('/:id/batches/:batchId', adminAuth, StudentController.removeStudentFromBatch);

// ---

export const batchRoutes = Router();

batchRoutes.get('/', [requireAuth, requirePermission("batch_management", "R")], StudentController.listBatches);
batchRoutes.post('/', [requireAuth, requirePermission("batch_management", "C")], StudentController.createBatch);
batchRoutes.get('/:id', [requireAuth, requirePermission("batch_management", "R")], StudentController.getBatch);
batchRoutes.put('/:id', [requireAuth, requirePermission("batch_management", "U")], StudentController.updateBatch);
batchRoutes.delete('/:id', [requireAuth, requirePermission("batch_management", "D")], StudentController.deleteBatch);
