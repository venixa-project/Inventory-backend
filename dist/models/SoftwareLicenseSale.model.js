import { z } from 'zod';
import { LicenseTierSchema } from './ClientTenant.model.js';
export const CreateLicenseSaleSchema = z.object({
    clientId: z.string().min(1, 'Client ID is required'),
    clientName: z.string().min(1, 'Client Name is required'),
    plan: LicenseTierSchema,
    period: z.string().min(1, 'Period is required'),
    amount: z.number().positive('Amount must be positive'),
    paymentMethod: z.enum(['UPI', 'Razorpay', 'Bank Transfer', 'Cash']).default('UPI'),
    status: z.enum(['paid', 'pending', 'failed']).default('paid'),
    date: z.string().optional(),
});
export const SoftwareLicenseSaleTableDefinition = {
    tableName: 'software_license_sales',
    columns: [
        'id',
        'client_id',
        'client_name',
        'invoice_number',
        'date',
        'plan',
        'period',
        'amount',
        'payment_method',
        'status',
        'receipt_pdf_url',
        'created_at',
    ],
    primaryKey: 'id',
    foreignKeys: [{ column: 'client_id', references: 'client_tenants(id)' }],
};
