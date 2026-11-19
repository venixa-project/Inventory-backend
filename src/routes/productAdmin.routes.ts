import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { ClientTenantController } from '../controllers/clientTenant.controller.js';
import { LicenseSaleController } from '../controllers/licenseSale.controller.js';
import { SettingsController } from '../controllers/settings.controller.js';

const router = Router();

// Protect all Product Admin routes to require 'product_admin' role
router.use(authenticateToken);
router.use(requireRoles('product_admin'));

// 1. Platform Metrics & Growth Insights
router.get('/metrics', ClientTenantController.getMetrics);

// 2. Client Tenants Directory & Provisioning
router.get('/clients', ClientTenantController.getAll);
router.get('/clients/:id', ClientTenantController.getById);
router.post('/clients', ClientTenantController.create);
router.put('/clients/:id', ClientTenantController.update);
router.delete('/clients/:id', ClientTenantController.delete);
router.post('/clients/:id/toggle-status', ClientTenantController.toggleStatus);
router.post('/clients/:id/approve', ClientTenantController.approve);
router.post('/clients/:id/activate', ClientTenantController.activate);
router.post('/clients/:id/deactivate', ClientTenantController.deactivate);
router.post('/clients/:id/block', ClientTenantController.block);
router.post('/clients/:id/regenerate-password', ClientTenantController.regeneratePassword);

// 3. Software License Sales & Subscriptions
router.get('/licenses', LicenseSaleController.getAll);
router.post('/licenses', LicenseSaleController.create);
router.put('/licenses/:id/status', LicenseSaleController.updateStatus);

// 4. Platform Configurations (Printers, UPI, WhatsApp, GST)
router.get('/integrations', SettingsController.getPlatformIntegrations);
router.put('/integrations', SettingsController.updatePlatformIntegrations);

export default router;
