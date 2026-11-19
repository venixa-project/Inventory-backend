import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { SettingsController } from '../controllers/settings.controller.js';

const router = Router();

router.use(authenticateToken);
router.use(resolveTenant);

// Shop settings (staff can update UI/terminal display preferences, owners full control)
router.get('/shop', SettingsController.getShopSettings);
router.put('/shop', requireRoles('owner', 'staff', 'product_admin'), SettingsController.updateShopSettings);

// Tenant Data Backup & Restore (restricted to owner and product_admin)
router.get('/backup', requireRoles('owner', 'product_admin'), SettingsController.getBackup);
router.post('/restore', requireRoles('owner', 'product_admin'), SettingsController.restoreBackup);

export default router;
