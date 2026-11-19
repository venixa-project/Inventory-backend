import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { SalesOrderController } from '../controllers/salesOrder.controller.js';
const router = Router();
router.use(authenticateToken);
router.use(resolveTenant);
// Sales Orders (Accessible by owner, staff for counter bookings, and product_admin)
router.get('/orders', SalesOrderController.getOrders);
router.get('/orders/:id', SalesOrderController.getOrderById);
router.post('/orders', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.createOrder);
router.put('/orders/:id', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.updateOrder);
router.put('/orders/:id/status', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.updateStatus);
router.delete('/orders/:id', requireRoles('owner', 'product_admin'), SalesOrderController.deleteOrder);
// Packages & Logistics Tracking
router.get('/packages', SalesOrderController.getPackages);
router.get('/packages/:id/document', SalesOrderController.printPackingSlip);
router.get('/packages/:id/slip', SalesOrderController.printPackingSlip);
router.get('/packages/:id', SalesOrderController.getPackageById);
router.post('/packages', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.createPackage);
router.put('/packages/:id/status', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.updatePackageStatus);
router.delete('/packages/:id', requireRoles('owner', 'product_admin'), SalesOrderController.deletePackage);
// Delivery Challans (Dispatches & Transfers)
router.get('/challans', SalesOrderController.getChallans);
router.get('/challans/:id', SalesOrderController.getChallanById);
router.post('/challans', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.createChallan);
router.put('/challans/:id', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.updateChallan);
router.put('/challans/:id/status', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.updateChallanStatus);
router.delete('/challans/:id', requireRoles('owner', 'product_admin'), SalesOrderController.deleteChallan);
router.get('/challans/:id/document', SalesOrderController.printChallan);
export default router;
