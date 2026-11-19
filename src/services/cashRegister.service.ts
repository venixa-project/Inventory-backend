import { db } from '../models/db.js';
import { CashRegisterShift, CashExpense } from '../types/index.js';
import { AppError } from '../middlewares/error.middleware.js';

export class CashRegisterService {
  public static getCurrentShift(tenantId: string) {
    const shifts = db.get('cashShifts');
    const shift = shifts.find((s) => s.tenantId === tenantId && s.status === 'Open');
    return shift || null;
  }

  public static getShiftHistory(tenantId: string) {
    const shifts = db.get('cashShifts');
    return shifts.filter((s) => s.tenantId === tenantId && s.status === 'Closed');
  }

  public static getExpenses(tenantId: string) {
    const expenses = db.get('cashExpenses');
    return tenantId === 'ALL' ? expenses : expenses.filter((e) => e.tenantId === tenantId);
  }

  public static openShift(tenantId: string, openingCash: number, notes?: string) {
    const existing = this.getCurrentShift(tenantId);
    if (existing) {
      throw new AppError('An open cash register shift already exists for this store.', 400);
    }

    const shifts = db.get('cashShifts');
    const todayStr = new Date().toISOString().substring(0, 10);

    const newShift: CashRegisterShift = {
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
    return newShift;
  }

  public static recordExpense(
    tenantId: string,
    category: CashExpense['category'],
    amount: number,
    note: string,
    recordedBy = 'Store Staff'
  ) {
    const expenses = db.get('cashExpenses');
    const newExpense: CashExpense = {
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

    // Update active shift if any
    const shifts = db.get('cashShifts');
    const active = shifts.find((s) => s.tenantId === tenantId && s.status === 'Open');
    if (active) {
      active.cashExpenses = Number((active.cashExpenses + amount).toFixed(2));
      active.expectedClosingCash = Number(
        (active.openingCash + active.cashSales - active.cashExpenses).toFixed(2)
      );
      db.set('cashShifts', shifts);
    }

    return newExpense;
  }

  public static closeShift(tenantId: string, actualClosingCash: number, notes?: string) {
    const shifts = db.get('cashShifts');
    const activeIndex = shifts.findIndex((s) => s.tenantId === tenantId && s.status === 'Open');
    if (activeIndex === -1) {
      throw new AppError('No active open shift found to close.', 400);
    }

    const shift = shifts[activeIndex];
    const discrepancy = Number((actualClosingCash - shift.expectedClosingCash).toFixed(2));

    const closedShift: CashRegisterShift = {
      ...shift,
      closedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      actualClosingCash,
      discrepancy,
      status: 'Closed',
      notes: notes ? `${shift.notes ? shift.notes + ' | ' : ''}${notes}` : shift.notes,
    };

    shifts[activeIndex] = closedShift;
    db.set('cashShifts', shifts);
    return closedShift;
  }
}
