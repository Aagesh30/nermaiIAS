import { Router } from 'express';
import { ProviderAccountController } from './controller';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', ProviderAccountController.listAccounts);
router.post('/', ProviderAccountController.createAccount);
router.get('/:id', ProviderAccountController.getAccount);
router.put('/:id', ProviderAccountController.updateAccount);
router.delete('/:id', ProviderAccountController.deleteAccount);

export default router;
