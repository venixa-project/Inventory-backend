import { z } from 'zod';
export const PaymentModeSchema = z.enum(['Cash', 'UPI', 'Card', 'Credit', 'Split']);
export const BillLineSchema = z.object({
    id: z.string().optional(),
    itemId: z.string().min(1, 'Item ID is required'),
    name: z.string().min(1, 'Item name is required'),
    regionalName: z.string().optional(),
    qty: z.number().positive('Quantity must be positive'),
    subQty: z.number().optional(),
    unit: z.string().default('pc'),
    rate: z.number().nonnegative(),
    gstPercent: z.number().nonnegative().default(0),
    total: z.number().nonnegative(),
    itemType: z.enum(['item', 'kit']).default('item'),
});
export const SplitPaymentDetailSchema = z.object({
    cash: z.number().nonnegative().default(0),
    upi: z.number().nonnegative().default(0),
    card: z.number().nonnegative().default(0),
    credit: z.number().nonnegative().default(0),
});
export const CheckoutBillSchema = z.object({
    customerId: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    lines: z.array(BillLineSchema).min(1, 'Cart cannot be empty'),
    subtotal: z.number().nonnegative(),
    discountAmount: z.number().nonnegative().default(0),
    taxAmount: z.number().nonnegative().default(0),
    roundOff: z.number().default(0),
    total: z.number().nonnegative(),
    paymentMode: PaymentModeSchema,
    paidAmount: z.number().nonnegative(),
    splitDetails: SplitPaymentDetailSchema.optional(),
});
export const BillTableDefinition = {
    tableName: 'bills',
    columns: [
        'id',
        'tenant_id',
        'bill_number',
        'date',
        'customer_id',
        'customer_name',
        'customer_phone',
        'payment_mode',
        'split_details',
        'subtotal',
        'discount_amount',
        'tax_amount',
        'round_off',
        'total',
        'paid',
        'due',
        'cashier_id',
        'created_at',
    ],
    primaryKey: 'id',
    foreignKeys: [
        { column: 'tenant_id', references: 'client_tenants(id)' },
        { column: 'customer_id', references: 'customers(id)' },
    ],
};
export const BillLineTableDefinition = {
    tableName: 'bill_lines',
    columns: ['id', 'bill_id', 'item_id', 'item_name', 'qty', 'unit', 'rate', 'gst_percent', 'total', 'item_type'],
    primaryKey: 'id',
    foreignKeys: [
        { column: 'bill_id', references: 'bills(id)' },
        { column: 'item_id', references: 'items(id)' },
    ],
};
