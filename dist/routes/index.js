import { Router } from 'express';
import authRoutes from './auth.routes.js';
import productAdminRoutes from './productAdmin.routes.js';
import itemRoutes from './item.routes.js';
import billingRoutes from './billing.routes.js';
import customerRoutes from './customer.routes.js';
import supplierRoutes from './supplier.routes.js';
import salesOrderRoutes from './salesOrder.routes.js';
import cashRegisterRoutes from './cashRegister.routes.js';
import settingsRoutes from './settings.routes.js';
import reportsRoutes from './reports.routes.js';
import webhookRoutes from './webhook.routes.js';
import festivalRoutes from './festival.routes.js';
import inventoryRoutes from './inventory.routes.js';
import emailRoutes from './email.routes.js';
const apiRouter = Router();
// Health check endpoint
apiRouter.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        service: 'Venixa Enterprise Inventory & POS Backend',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        rolesSupported: ['product_admin', 'owner', 'staff'],
    });
});
// Mounted domain modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/product-admin', productAdminRoutes);
apiRouter.use('/items', itemRoutes);
apiRouter.use('/billing', billingRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/purchases', supplierRoutes);
apiRouter.use('/sales', salesOrderRoutes);
apiRouter.use('/cash-register', cashRegisterRoutes);
apiRouter.use('/shifts', cashRegisterRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/festivals', festivalRoutes);
apiRouter.use('/inventory', inventoryRoutes);
apiRouter.use('/webhooks', webhookRoutes);
apiRouter.use('/email', emailRoutes);
export default apiRouter;
