import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { BillingController } from '../controllers/billing.controller.js';

const router = Router();

router.use(authenticateToken);
router.use(resolveTenant);

// Billing & Checkout accessible by both store owner and counter staff
router.get('/', BillingController.getAll);
router.get('/:id', BillingController.getById);
router.get('/:id/document', BillingController.printInvoice);
router.get('/:id/pdf', BillingController.printInvoice);
router.post('/checkout', BillingController.checkout);
router.post('/upi-settlement', BillingController.settleUpiPayment);
router.put('/:id', requireRoles('owner', 'product_admin'), BillingController.update);
router.delete('/:id', requireRoles('owner', 'product_admin'), BillingController.delete);

export default router;
