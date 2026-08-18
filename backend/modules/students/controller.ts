import { Request, Response, NextFunction } from 'express';
import { StudentService } from './service';
import * as Validators from './validator';
import { getMyLmsClasses, getMyLmsResources } from './lms-service';

const studentService = new StudentService();

export const listStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.user!;
    const students = await studentService.listStudents(tenantId);
    res.status(200).json({ status: 'success', data: students });
  } catch (error) { next(error); }
};

export const getStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { tenantId } = req.user!;
    const student = await studentService.getStudent(id, tenantId);
    res.status(200).json({ status: 'success', data: student });
  } catch (error) { next(error); }
};

export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId, tenantId } = req.user!;
    const parsedData = Validators.updateStudentSchema.parse(req.body);
    const updated = await studentService.updateStudent(id, parsedData, userId, tenantId);
    res.status(200).json({ status: 'success', data: updated });
  } catch (error) { next(error); }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const parsedData = Validators.updateStudentSchema.parse(req.body);
    const updated = await studentService.updateMe(userId, parsedData, tenantId);
    res.status(200).json({ status: 'success', data: updated });
  } catch (error) { next(error); }
};

export const enrollStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const parsedData = Validators.enrollStudentSchema.parse(req.body);
    const enrollment = await studentService.enrollStudent(
      parsedData.studentId, 
      parsedData.courseId, 
      parsedData.validUntil, 
      userId, 
      tenantId
    );
    res.status(201).json({ status: 'success', data: enrollment });
  } catch (error) { next(error); }
};

export const getStudentEnrollments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { tenantId } = req.user!;
    const enrollments = await studentService.getStudentEnrollments(id, tenantId);
    res.status(200).json({ status: 'success', data: enrollments });
  } catch (error) { next(error); }
};

export const createBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const parsedData = Validators.createBatchSchema.parse(req.body);
    const batch = await studentService.createBatch(parsedData, userId, tenantId);
    res.status(201).json({ status: 'success', data: batch });
  } catch (error) { next(error); }
};

export const listBatches = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.user!;
    const batches = await studentService.listBatches(tenantId);
    res.status(200).json({ status: 'success', data: batches });
  } catch (error) { next(error); }
};

export const mapStudentToBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.id as string;
    const { batchId } = req.body;
    const { userId, tenantId } = req.user!;
    if (!studentId || !batchId) throw new Error('studentId and batchId required');
    const result = await studentService.mapStudentToBatch(studentId, batchId, userId, tenantId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const removeStudentFromBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.id as string;
    const batchId = req.params.batchId as string;
    const { userId, tenantId } = req.user!;
    const result = await studentService.removeStudentFromBatch(studentId, batchId, userId, tenantId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const promoteStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId, tenantId } = req.user!;
    const result = await studentService.promoteStudent(id, userId, tenantId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const assignRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;
    const { userId, tenantId } = req.user!;
    if (!role) throw new Error('role is required');
    const result = await studentService.assignRole(id, role, userId, tenantId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const getBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { tenantId } = req.user!;
    const batch = await studentService.getBatch(id, tenantId);
    res.status(200).json({ status: 'success', data: batch });
  } catch (error) { next(error); }
};

export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId, tenantId } = req.user!;
    await studentService.deleteStudent(id, userId, tenantId);
    res.status(200).json({ status: 'success', message: 'Student deleted successfully' });
  } catch (error) { next(error); }
};

export const updateBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const data = req.body;
    const { userId, tenantId } = req.user!;
    const batch = await studentService.updateBatch(id, data, userId, tenantId);
    res.status(200).json({ status: 'success', data: batch });
  } catch (error) { next(error); }
};

export const deleteBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId, tenantId } = req.user!;
    await studentService.deleteBatch(id, userId, tenantId);
    res.status(200).json({ status: 'success', message: 'Batch deleted' });
  } catch (error) { next(error); }
};

// ----- QR CODE PERMISSIONS -----

export const getQrSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.user!;
    const settings = await studentService.getQrSettings(tenantId);
    res.status(200).json({ status: 'success', data: settings });
  } catch (error) { next(error); }
};

export const updateQrSettings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const settings = await studentService.updateQrSettings(req.body, userId, tenantId);
    res.status(200).json({ status: 'success', data: settings });
  } catch (error) { next(error); }
};

export const getStudentQrStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const status = await studentService.getStudentQrStatus(userId, tenantId, req.user);
    res.status(200).json({ status: 'success', data: status });
  } catch (error) { next(error); }
};

export const requestStudentQr = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const result = await studentService.requestStudentQr(userId, tenantId, req.user);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const updateStudentQrPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studentId = req.params.id as string;
    const { enabled } = req.body;
    const { userId, tenantId } = req.user!;
    const result = await studentService.updateStudentQrPermission(studentId, !!enabled, userId, tenantId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const enableQrBulk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, batchId } = req.body;
    const { userId, tenantId } = req.user!;
    const result = await studentService.enableQrBulk(type, batchId, userId, tenantId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

// ----- PAYMENT ACKNOWLEDGEMENTS -----

export const submitPaymentAcknowledgement = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const result = await studentService.submitPaymentAcknowledgement(userId, req.body, tenantId, req.user);
    res.status(201).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const getStudentPaymentAcknowledgements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const result = await studentService.getStudentPaymentAcknowledgements(userId, tenantId, req.user);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const listPaymentAcknowledgements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    const result = await studentService.listPaymentAcknowledgements(status);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

export const updatePaymentAcknowledgementStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const acknowledgementId = req.params.id as string;
    const { status } = req.body;
    const { userId } = req.user!;
    const result = await studentService.updatePaymentAcknowledgementStatus(acknowledgementId, status, userId);
    res.status(200).json({ status: 'success', data: result });
  } catch (error) { next(error); }
};

// ─── Student LMS Discovery Handlers ───────────────────────────────────────────
// These handlers are called ONLY by the student-specific LMS routes.
// They do not replace or modify any existing admin/teacher handlers.

export const getMyLmsClassesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const data = await getMyLmsClasses(userId, tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};

export const getMyLmsResourcesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;
    const data = await getMyLmsResources(userId, tenantId);
    res.status(200).json({ status: 'success', data });
  } catch (error) { next(error); }
};
