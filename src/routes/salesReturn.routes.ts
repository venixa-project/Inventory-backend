import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { SalesReturnController } from '../controllers/salesReturn.controller.js';

const router = Router();

router.use(authenticateToken);
router.use(resolveTenant);

router.get('/', SalesReturnController.getReturns);
router.get('/:id', SalesReturnController.getReturnById);
router.post('/', requireRoles('owner', 'staff', 'product_admin'), SalesReturnController.createReturn);
router.delete('/:id', requireRoles('owner', 'product_admin'), SalesReturnController.deleteReturn);

export default router;
