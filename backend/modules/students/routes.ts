import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';
import * as StudentController from './controller';

const adminAuth = [requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher'])];

export const studentRoutes = Router();

// Student Self-Service Routes (Accessible to 'student' role)
studentRoutes.patch('/me', requireAuth, StudentController.updateMe);
studentRoutes.get('/me/qr-status', requireAuth, StudentController.getStudentQrStatus);
studentRoutes.post('/me/request-qr', requireAuth, StudentController.requestStudentQr);
studentRoutes.post('/me/payment-acknowledgements', requireAuth, StudentController.submitPaymentAcknowledgement);
studentRoutes.get('/me/payment-acknowledgements', requireAuth, StudentController.getStudentPaymentAcknowledgements);

// QR Code Permissions settings (Admin only)
studentRoutes.get('/qr-settings', adminAuth, StudentController.getQrSettings);
studentRoutes.put('/qr-settings', adminAuth, StudentController.updateQrSettings);
studentRoutes.patch('/:id/qr-permission', adminAuth, StudentController.updateStudentQrPermission);
studentRoutes.post('/qr-enable-bulk', adminAuth, StudentController.enableQrBulk);
studentRoutes.get('/payment-acknowledgements', adminAuth, StudentController.listPaymentAcknowledgements);
studentRoutes.patch('/payment-acknowledgements/:id/status', adminAuth, StudentController.updatePaymentAcknowledgementStatus);

// Student Profiles
studentRoutes.get('/', adminAuth, StudentController.listStudents);
studentRoutes.get('/:id', adminAuth, StudentController.getStudent);
studentRoutes.put('/:id', adminAuth, StudentController.updateStudent);
studentRoutes.delete('/:id', adminAuth, StudentController.deleteStudent);

// Student Role Management
studentRoutes.patch('/:id/role', adminAuth, StudentController.assignRole);

// Student Batches Management
studentRoutes.post('/:id/batches', adminAuth, StudentController.mapStudentToBatch); // Replaces /enroll or /batch/map-student
studentRoutes.delete('/:id/batches/:batchId', adminAuth, StudentController.removeStudentFromBatch);

// ---

export const batchRoutes = Router();

batchRoutes.get('/', adminAuth, StudentController.listBatches);
batchRoutes.post('/', adminAuth, StudentController.createBatch);
batchRoutes.get('/:id', adminAuth, StudentController.getBatch);
batchRoutes.put('/:id', adminAuth, StudentController.updateBatch);
batchRoutes.delete('/:id', adminAuth, StudentController.deleteBatch);
