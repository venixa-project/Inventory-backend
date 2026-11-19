import { Router } from 'express';
import { authenticateToken, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { ItemController } from '../controllers/item.controller.js';
const router = Router();
router.use(authenticateToken);
router.use(resolveTenant);
// Composite Kits routes
router.get('/kits', ItemController.getKits);
router.get('/kits/:id', ItemController.getKitById);
router.post('/kits', requireRoles('owner', 'staff', 'product_admin'), ItemController.createKit);
router.put('/kits/:id', requireRoles('owner', 'staff', 'product_admin'), ItemController.updateKit);
router.delete('/kits/:id', requireRoles('owner', 'staff', 'product_admin'), ItemController.deleteKit);
// Read items & stock logs
router.get('/', ItemController.getAll);
router.get('/barcode/:barcode', ItemController.getByBarcode);
router.get('/stock-logs', ItemController.getStockLogs);
router.get('/:id', ItemController.getById);
// Stock adjustment (can be done during billing or inventory correction by owner or staff)
router.post('/adjust-stock', requireRoles('owner', 'staff', 'product_admin'), (req, res, next) => {
    req.params.id = req.body.itemId || req.body.id;
    req.body.change = req.body.change ?? req.body.delta;
    ItemController.adjustStock(req, res, next);
});
router.post('/:id/adjust-stock', requireRoles('owner', 'staff', 'product_admin'), ItemController.adjustStock);
// Item creation, updating, deletion (accessible by store owner, staff for adding/editing products, product_admin)
router.post('/bulk', requireRoles('owner', 'staff', 'product_admin'), ItemController.bulkCreate);
router.post('/', requireRoles('owner', 'staff', 'product_admin'), ItemController.create);
router.put('/:id', requireRoles('owner', 'staff', 'product_admin'), ItemController.update);
router.delete('/:id', requireRoles('owner', 'staff', 'product_admin'), ItemController.delete);
export default router;
