import { z } from 'zod';
import {
  Supplier,
  PurchaseOrder,
  POLine,
  VendorPayment,
  PurchaseReturn,
  PurchaseReturnLine,
  ContraOffset,
} from '../types/index.js';

export const CreateSupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  companyName: z.string().optional(),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  gstin: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfsc: z.string().optional(),
  bankName: z.string().optional(),
  upiId: z.string().optional(),
  paymentTerms: z.string().default('Net 30'),
  isAlsoCustomer: z.boolean().default(false),
  linkedCustomerId: z.string().optional(),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

export const POLineSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  qty: z.number().positive('Quantity must be positive'),
  subQty: z.number().optional(),
  costPrice: z.number().nonnegative('Cost price must be non-negative'),
  totalCost: z.number().nonnegative().optional(),
});

export const CreatePOSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  lines: z.array(POLineSchema).min(1, 'At least one line item is required'),
  notes: z.string().optional(),
  paymentStatus: z.enum(['Paid', 'Due', 'Partial']).default('Due'),
  paymentMode: z.string().default('Credit'),
  stockInwarded: z.boolean().default(false),
  totalAmount: z.number().optional(),
});

export const CreateVendorPaymentSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  poId: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  paymentMode: z.enum(['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit', 'Contra']),
  referenceNumber: z.string().optional(),
  note: z.string().optional(),
});

export const PurchaseReturnLineSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  qty: z.number().positive(),
  costPrice: z.number().nonnegative(),
  totalAmount: z.number().nonnegative(),
  reason: z.string().default('damaged'),
});

export const CreatePurchaseReturnSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  lines: z.array(PurchaseReturnLineSchema).min(1),
  notes: z.string().optional(),
  refundMode: z.enum(['Deduct from Due', 'Cash Refund', 'Bank Refund']).default('Deduct from Due'),
});

export const ExecuteContraOffsetSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  customerId: z.string().min(1, 'Customer ID is required'),
  amount: z.number().positive('Offset amount must be positive'),
  note: z.string().optional(),
});

export interface SupplierModel extends Supplier {}
export interface PurchaseOrderModel extends PurchaseOrder {}
export interface VendorPaymentModel extends VendorPayment {}
export interface PurchaseReturnModel extends PurchaseReturn {}
export interface ContraOffsetModel extends ContraOffset {}

export const SupplierTableDefinition = {
  tableName: 'suppliers',
  columns: [
    'id',
    'tenant_id',
    'name',
    'company_name',
    'phone',
    'email',
    'address',
    'gstin',
    'bank_account_number',
    'bank_ifsc',
    'bank_name',
    'upi_id',
    'payment_terms',
    'is_also_customer',
    'linked_customer_id',
    'created_at',
    'updated_at',
  ],
  primaryKey: 'id',
  foreignKeys: [
    { column: 'tenant_id', references: 'client_tenants(id)' },
    { column: 'linked_customer_id', references: 'customers(id)' },
  ],
};

export const PurchaseOrderTableDefinition = {
  tableName: 'purchase_orders',
  columns: [
    'id',
    'tenant_id',
    'po_number',
    'supplier_id',
    'date',
    'received_date',
    'status',
    'stock_inwarded',
    'payment_status',
    'paid_amount',
    'due_amount',
    'payment_mode',
    'total_amount',
    'notes',
    'created_at',
  ],
  primaryKey: 'id',
  foreignKeys: [
    { column: 'tenant_id', references: 'client_tenants(id)' },
    { column: 'supplier_id', references: 'suppliers(id)' },
  ],
};
