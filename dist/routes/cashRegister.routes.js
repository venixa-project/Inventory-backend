import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth.middleware.js';
import { resolveTenant } from '../middlewares/tenant.middleware.js';
import { CashRegisterController } from '../controllers/cashRegister.controller.js';
const router = Router();
router.use(authenticateToken);
router.use(resolveTenant);
// Accessible by owner and staff for cashier shift handover
router.get('/current-shift', CashRegisterController.getCurrentShift);
router.get('/history', CashRegisterController.getShiftHistory);
router.get('/expenses', CashRegisterController.getExpenses);
router.post('/open-shift', CashRegisterController.openShift);
router.post('/open', CashRegisterController.openShift);
router.post('/record-expense', CashRegisterController.recordExpense);
router.post('/expense', CashRegisterController.recordExpense);
router.post('/close-shift', CashRegisterController.closeShift);
router.post('/close', CashRegisterController.closeShift);
export default router;
