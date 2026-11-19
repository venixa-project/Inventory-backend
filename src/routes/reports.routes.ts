import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { ReportsController } from '../controllers/reports.controller.js';

const router = Router();

router.use(authenticateToken);
router.use(resolveTenant);

// Dashboard summary accessible by owner, staff (for counter metrics), and product_admin
router.get('/dashboard-summary', ReportsController.getDashboard);
router.get('/summary', ReportsController.getDashboard);

// Staff Operational Dashboard (Purely Operational Metrics & ZERO Revenue)
router.get('/staff-dashboard', ReportsController.getStaffDashboard);
router.get('/staff-summary', ReportsController.getStaffDashboard);

// In-depth financial & business analytics restricted to owner & product_admin
router.get('/sales-profit', requireRoles('owner', 'product_admin'), ReportsController.getSalesReport);
router.get('/sales-velocity', requireRoles('owner', 'product_admin'), ReportsController.getSalesReport);
router.get('/profit-margin', requireRoles('owner', 'product_admin'), ReportsController.getSalesReport);
router.get('/top-products', requireRoles('owner', 'product_admin'), ReportsController.getTopProducts);
router.get('/stock-health', requireRoles('owner', 'product_admin'), ReportsController.getStockHealth);
router.get('/inventory-valuation', requireRoles('owner', 'product_admin'), ReportsController.getStockHealth);
router.get('/tax-gst', requireRoles('owner', 'product_admin'), ReportsController.getTaxGST);
router.get('/gst', requireRoles('owner', 'product_admin'), ReportsController.getTaxGST);
router.get('/customer-aging', requireRoles('owner', 'product_admin'), ReportsController.getCustomerAging);

export default router;
