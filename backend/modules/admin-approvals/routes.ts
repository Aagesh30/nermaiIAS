import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware';
import {
  submitRequest,
  listPending,
  approveRequest,
  rejectRequest,
} from './controller';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Submit a new approval request (any authenticated staff/admin/editor)
router.post('/', submitRequest);

// Super Admin: list pending requests
router.get('/pending', listPending);

// Super Admin: approve and apply a request
router.post('/:id/approve', approveRequest);

// Super Admin: reject a request
router.post('/:id/reject', rejectRequest);

export default router;
