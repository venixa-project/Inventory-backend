import { z } from 'zod';
export const CreateCustomerSchema = z.object({
    name: z.string().min(2, 'Customer name is required'),
    phone: z.string().min(7, 'Phone number is required'),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    address: z.string().optional(),
    companyName: z.string().optional(),
    gstin: z.string().optional(),
    creditLimit: z.number().nonnegative().default(5000),
    dueAmount: z.number().default(0),
    isAlsoVendor: z.boolean().default(false),
    linkedSupplierId: z.string().optional(),
});
export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export const CustomerPaymentSchema = z.object({
    amount: z.number().positive('Payment amount must be positive'),
    paymentMode: z.string().default('Cash'),
    notes: z.string().optional(),
});
export const CustomerTableDefinition = {
    tableName: 'customers',
    columns: [
        'id',
        'tenant_id',
        'name',
        'phone',
        'email',
        'address',
        'company_name',
        'gstin',
        'credit_limit',
        'due_amount',
        'is_also_vendor',
        'linked_supplier_id',
        'created_at',
        'updated_at',
    ],
    primaryKey: 'id',
    foreignKeys: [{ column: 'tenant_id', references: 'client_tenants(id)' }],
};
