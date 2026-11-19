import { z } from 'zod';
import { CashRegisterShift, CashExpense } from '../types/index.js';

export const OpenShiftSchema = z.object({
  openingCash: z.number().nonnegative('Opening cash cannot be negative'),
  notes: z.string().optional(),
});

export const RecordExpenseSchema = z.object({
  category: z.enum(['Tea/Refreshment', 'Packaging', 'Transport', 'Cleaning', 'Repairs', 'Other']),
  amount: z.number().positive('Expense amount must be positive'),
  note: z.string().min(1, 'Expense description note is required'),
  recordedBy: z.string().optional(),
});

export const CloseShiftSchema = z.object({
  actualClosingCash: z.number().nonnegative('Closing cash cannot be negative'),
  notes: z.string().optional(),
});

export interface CashRegisterShiftModel extends CashRegisterShift {}
export interface CashExpenseModel extends CashExpense {}

export const CashRegisterShiftTableDefinition = {
  tableName: 'cash_shifts',
  columns: [
    'id',
    'tenant_id',
    'date',
    'opened_at',
    'closed_at',
    'opening_cash',
    'cash_sales',
    'cash_expenses',
    'expected_closing_cash',
    'actual_closing_cash',
    'discrepancy',
    'status',
    'notes',
  ],
  primaryKey: 'id',
  foreignKeys: [{ column: 'tenant_id', references: 'client_tenants(id)' }],
};

export const CashExpenseTableDefinition = {
  tableName: 'cash_expenses',
  columns: ['id', 'tenant_id', 'date', 'category', 'amount', 'note', 'recorded_by'],
  primaryKey: 'id',
  foreignKeys: [{ column: 'tenant_id', references: 'client_tenants(id)' }],
};
