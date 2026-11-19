import { CashRegisterService } from '../services/cashRegister.service.js';
export class CashRegisterController {
    static getCurrentShift(req, res, next) {
        try {
            const shift = CashRegisterService.getCurrentShift(req.tenantId);
            res.json({ success: true, data: shift });
        }
        catch (err) {
            next(err);
        }
    }
    static getShiftHistory(req, res, next) {
        try {
            const history = CashRegisterService.getShiftHistory(req.tenantId);
            res.json({ success: true, count: history.length, data: history });
        }
        catch (err) {
            next(err);
        }
    }
    static getExpenses(req, res, next) {
        try {
            const expenses = CashRegisterService.getExpenses(req.tenantId);
            res.json({ success: true, count: expenses.length, data: expenses });
        }
        catch (err) {
            next(err);
        }
    }
    static openShift(req, res, next) {
        try {
            const { openingCash, notes } = req.body;
            const shift = CashRegisterService.openShift(req.tenantId, Number(openingCash), notes);
            res.status(201).json({ success: true, message: 'Cash register shift opened', data: shift });
        }
        catch (err) {
            next(err);
        }
    }
    static recordExpense(req, res, next) {
        try {
            const { category, amount, note, recordedBy } = req.body;
            const expense = CashRegisterService.recordExpense(req.tenantId, category, Number(amount), note, recordedBy);
            res.status(201).json({ success: true, message: 'Expense recorded', data: expense });
        }
        catch (err) {
            next(err);
        }
    }
    static closeShift(req, res, next) {
        try {
            const { actualClosingCash, notes } = req.body;
            const shift = CashRegisterService.closeShift(req.tenantId, Number(actualClosingCash), notes);
            res.json({ success: true, message: 'Cash register shift closed', data: shift });
        }
        catch (err) {
            next(err);
        }
    }
}
