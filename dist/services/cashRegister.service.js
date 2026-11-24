import { db } from '../models/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { PostgresSync } from '../models/postgresSync.js';
export class CashRegisterService {
    static getCurrentShift(tenantId) {
        const shifts = db.get('cashShifts');
        const shift = shifts.find((s) => s.tenantId === tenantId && s.status === 'Open');
        return shift || null;
    }
    static getShiftHistory(tenantId) {
        const shifts = db.get('cashShifts');
        return shifts.filter((s) => s.tenantId === tenantId && s.status === 'Closed');
    }
    static getExpenses(tenantId) {
        const expenses = db.get('cashExpenses');
        return tenantId === 'ALL' ? expenses : expenses.filter((e) => e.tenantId === tenantId);
    }
    static openShift(tenantId, openingCash, notes) {
        const existing = this.getCurrentShift(tenantId);
        if (existing) {
            throw new AppError('An open cash register shift already exists for this store.', 400);
        }
        const shifts = db.get('cashShifts');
        const todayStr = new Date().toISOString().substring(0, 10);
        const newShift = {
            id: `shift-${Date.now()}`,
            tenantId,
            date: todayStr,
            openedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            openingCash,
            cashSales: 0,
            cashExpenses: 0,
            expectedClosingCash: openingCash,
            status: 'Open',
            notes: notes || '',
        };
        shifts.unshift(newShift);
        db.set('cashShifts', shifts);
        PostgresSync.syncCashShift(newShift);
        return newShift;
    }
    static recordExpense(tenantId, category, amount, note, recordedBy = 'Store Staff') {
        const expenses = db.get('cashExpenses');
        const newExpense = {
            id: `exp-${Date.now()}`,
            tenantId,
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            category,
            amount,
            note,
            recordedBy,
        };
        expenses.unshift(newExpense);
        db.set('cashExpenses', expenses);
        PostgresSync.syncCashExpense(newExpense);
        // Update active shift if any
        const shifts = db.get('cashShifts');
        const active = shifts.find((s) => s.tenantId === tenantId && s.status === 'Open');
        if (active) {
            active.cashExpenses = Number((active.cashExpenses + amount).toFixed(2));
            active.expectedClosingCash = Number((active.openingCash + active.cashSales - active.cashExpenses).toFixed(2));
            db.set('cashShifts', shifts);
        }
        return newExpense;
    }
    static closeShift(tenantId, actualClosingCash, notes) {
        const shifts = db.get('cashShifts');
        const activeIndex = shifts.findIndex((s) => s.tenantId === tenantId && s.status === 'Open');
        if (activeIndex === -1) {
            throw new AppError('No active open shift found to close.', 400);
        }
        const shift = shifts[activeIndex];
        const discrepancy = Number((actualClosingCash - shift.expectedClosingCash).toFixed(2));
        const closedShift = {
            ...shift,
            closedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
            actualClosingCash,
            discrepancy,
            status: 'Closed',
            notes: notes ? `${shift.notes ? shift.notes + ' | ' : ''}${notes}` : shift.notes,
        };
        shifts[activeIndex] = closedShift;
        db.set('cashShifts', shifts);
        PostgresSync.syncCashShift(closedShift);
        return closedShift;
    }
}
