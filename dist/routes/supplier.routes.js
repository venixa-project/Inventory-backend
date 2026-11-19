import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { SupplierController } from '../controllers/supplier.controller.js';
const router = Router();
router.use(authenticateToken);
router.use(resolveTenant);
// Purchase Orders & Inwarding (Accessible by owner, staff for inward receiving, and product_admin)
router.get('/orders', SupplierController.getPOs);
router.get('/orders/list', SupplierController.getPOs);
router.get('/orders/:id', SupplierController.getPOById);
router.post('/orders', requireRoles('owner', 'staff', 'product_admin'), SupplierController.createPO);
router.post('/orders/:id/receive', requireRoles('owner', 'staff', 'product_admin'), SupplierController.markPOReceived);
router.delete('/orders/:id', requireRoles('owner', 'product_admin'), SupplierController.deletePO);
router.get('/orders/:id/document', SupplierController.printPO);
router.get('/orders/:id/pdf', SupplierController.printPO);
// Vendor Payments, Debit Notes & Contra Offsets (Accessible by staff for counter cash payouts, full controls by owner & product_admin)
router.post('/payments', requireRoles('owner', 'staff', 'product_admin'), SupplierController.recordPayment);
router.post('/returns', requireRoles('owner', 'product_admin'), SupplierController.createPurchaseReturn);
router.post('/contra-offset', requireRoles('owner', 'product_admin'), SupplierController.executeContra);
// Suppliers Directory (Lookup accessible by staff, creation/updates by staff & owner, deletion strictly by owner & product_admin)
router.get('/', SupplierController.getAll);
router.post('/', requireRoles('owner', 'staff', 'product_admin'), SupplierController.create);
router.get('/:id/ledger', requireRoles('owner', 'product_admin'), SupplierController.getLedger);
router.get('/:id', SupplierController.getById);
router.put('/:id', requireRoles('owner', 'staff', 'product_admin'), SupplierController.update);
router.delete('/:id', requireRoles('owner', 'product_admin'), SupplierController.deleteSupplier);
export default router;
