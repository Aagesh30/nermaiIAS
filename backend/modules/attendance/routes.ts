import { Router } from 'express';
import { requirePlayerJwt } from '../../core/middleware/auth.middleware';
import * as AttendanceController from './controller';

export const AttendanceRoutes = Router();

AttendanceRoutes.use(requirePlayerJwt);

AttendanceRoutes.post('/event', AttendanceController.processEvent);
AttendanceRoutes.get('/status/:classId', AttendanceController.getStatus);
