import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
const router = Router();
// Public auth endpoints
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
// Protected session profile
router.get('/me', authenticateToken, AuthController.getProfile);
router.put('/me', authenticateToken, AuthController.updateProfile);
router.post('/switch-role', authenticateToken, AuthController.switchRole);
// Store staff management (Store Owner & Product Admin manage counter staff)
router.get('/staff', authenticateToken, resolveTenant, requireRoles('owner', 'product_admin'), AuthController.getStaff);
router.post('/staff', authenticateToken, resolveTenant, requireRoles('owner', 'product_admin'), AuthController.createStaff);
router.put('/staff/:id', authenticateToken, resolveTenant, requireRoles('owner', 'product_admin'), AuthController.updateStaff);
router.delete('/staff/:id', authenticateToken, resolveTenant, requireRoles('owner', 'product_admin'), AuthController.deleteStaff);
export default router;
