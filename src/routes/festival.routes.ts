import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { FestivalController } from '../controllers/festival.controller.js';

const router = Router();

router.use(authenticateToken);
router.use(resolveTenant);

// Accessible by store owner, counter staff, and product admin
router.get('/', FestivalController.getPlans);
router.get('/plans', FestivalController.getPlans);
router.post('/plans', requireRoles('owner', 'staff', 'product_admin'), FestivalController.createPlan);
router.put('/plans/:id', requireRoles('owner', 'staff', 'product_admin'), FestivalController.updatePlan);
router.delete('/plans/:id', requireRoles('owner', 'staff', 'product_admin'), FestivalController.deletePlan);

// Forecast calculation & AI recommendations
router.get('/forecast/:festivalId', FestivalController.getForecast);
router.get('/recommendations/:festivalId', FestivalController.getRecommendations);

// PO generation
router.post('/generate-po', requireRoles('owner', 'staff', 'product_admin'), FestivalController.generatePO);

export default router;
