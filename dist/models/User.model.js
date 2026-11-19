import { z } from 'zod';
export const UserRoleSchema = z.enum(['product_admin', 'owner', 'staff']);
export const CreateUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: UserRoleSchema,
    tenantId: z.string().optional(),
    phone: z.string().optional(),
    designation: z.string().optional(),
});
export const LoginUserSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});
export const UserTableDefinition = {
    tableName: 'users',
    columns: [
        'id',
        'name',
        'email',
        'password_hash',
        'role',
        'tenant_id',
        'phone',
        'designation',
        'is_active',
        'created_at',
        'updated_at',
    ],
    primaryKey: 'id',
    foreignKeys: [{ column: 'tenant_id', references: 'client_tenants(id)' }],
};
