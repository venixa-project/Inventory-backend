import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { ItemController } from '../controllers/item.controller.js';
import { SalesOrderController } from '../controllers/salesOrder.controller.js';
import { FestivalController } from '../controllers/festival.controller.js';
import { SalesOrderService } from '../services/salesOrder.service.js';
const router = Router();
router.use(authenticateToken);
router.use(resolveTenant);
// ============================================================================
// 1. STOCK ADJUSTMENTS & RECONCILIATION AUDIT LOGS
// ============================================================================
router.get('/adjustments', ItemController.getStockLogs);
router.post('/adjustments', requireRoles('owner', 'staff', 'product_admin'), (req, res, next) => {
    req.params.id = req.body.itemId || req.body.id;
    req.body.change = req.body.change ?? req.body.delta;
    ItemController.adjustStock(req, res, next);
});
router.post('/adjustments/:id', requireRoles('owner', 'staff', 'product_admin'), ItemController.adjustStock);
router.put('/adjustments/:id', requireRoles('owner', 'staff', 'product_admin'), ItemController.updateStockLog);
router.delete('/adjustments/:id', requireRoles('owner', 'staff', 'product_admin'), ItemController.deleteStockLog);
// ============================================================================
// 2. PACKAGES & PACKING SLIPS
// ============================================================================
router.get('/packages', SalesOrderController.getPackages);
router.get('/packages/:id/document', SalesOrderController.printPackingSlip);
router.get('/packages/:id/slip', SalesOrderController.printPackingSlip);
router.get('/packages/:id', SalesOrderController.getPackageById);
router.post('/packages', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.createPackage);
router.put('/packages/:id/status', requireRoles('owner', 'staff', 'product_admin'), SalesOrderController.updatePackageStatus);
router.delete('/packages/:id', requireRoles('owner', 'product_admin'), SalesOrderController.deletePackage);
// ============================================================================
// 3. SHIPMENT TRACKING & DISPATCH CONFIRMATION
// ============================================================================
router.get('/shipments', (req, res, next) => {
    try {
        const { search, startDate, endDate } = req.query;
        const pkgs = SalesOrderService.getPackages(req.tenantId, { search, startDate, endDate });
        const shipments = pkgs.filter((p) => p.status === 'Shipped' || p.status === 'Delivered');
        res.json({ success: true, count: shipments.length, data: shipments });
    }
    catch (err) {
        next(err);
    }
});
router.put('/shipments/:id/deliver', requireRoles('owner', 'staff', 'product_admin'), (req, res, next) => {
    try {
        const id = req.params.id;
        const updated = SalesOrderService.updatePackageStatus(req.tenantId, id, 'Delivered');
        res.json({ success: true, message: 'Shipment marked as Delivered', data: updated });
    }
    catch (err) {
        next(err);
    }
});
// ============================================================================
// 4. SEASONAL DEMAND FORECAST & PO GENERATION
// ============================================================================
router.get('/forecast-plans', FestivalController.getPlans);
router.get('/forecast/:festivalId', FestivalController.getForecast);
router.post('/generate-po', requireRoles('owner', 'product_admin'), FestivalController.generatePO);
export default router;
