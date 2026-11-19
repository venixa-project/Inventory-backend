import { z } from 'zod';
import { ClientTenant, BusinessType, LicenseTier, ClientStatus, BillingFrequency } from '../types/index.js';

export const BusinessTypeSchema = z.enum(['pooja', 'pharmacy', 'grocery', 'hardware', 'retail_general']);
export const LicenseTierSchema = z.enum(['starter', 'professional', 'enterprise']);
export const ClientStatusSchema = z.enum(['active', 'trial', 'suspended', 'expired']);
export const BillingFrequencySchema = z.enum(['monthly', 'quarterly', 'annual']);

export const CreateClientTenantSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  ownerName: z.string().min(2, 'Owner name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(8, 'Phone number is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  address: z.string().optional(),
  gstin: z.string().optional(),
  businessType: BusinessTypeSchema.default('pooja'),
  licenseTier: LicenseTierSchema.default('professional'),
  billingFrequency: BillingFrequencySchema.default('monthly'),
  monthlyFee: z.number().nonnegative().default(1499),
  status: ClientStatusSchema.default('active'),
  startDate: z.string().optional(),
  renewalDate: z.string().optional(),
  branchesCount: z.number().int().positive().default(1),
  userCount: z.number().int().positive().default(3),
  notes: z.string().optional(),
});

export const UpdateClientTenantSchema = CreateClientTenantSchema.partial();

export interface ClientTenantModel extends ClientTenant {}

export const ClientTenantTableDefinition = {
  tableName: 'client_tenants',
  columns: [
    'id',
    'business_name',
    'owner_name',
    'email',
    'phone',
    'city',
    'state',
    'address',
    'gstin',
    'business_type',
    'license_tier',
    'billing_frequency',
    'monthly_fee',
    'status',
    'start_date',
    'renewal_date',
    'branches_count',
    'user_count',
    'sku_count',
    'username',
    'temporary_password',
    'tenant_code',
    'login_url',
    'credential_status',
    'password_last_reset',
    'last_login',
    'notes',
    'created_at',
    'updated_at',
  ],
  primaryKey: 'id',
};
