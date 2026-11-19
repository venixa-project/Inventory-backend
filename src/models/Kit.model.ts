import { z } from 'zod';
import { Kit } from '../types/index.js';

export const KitItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  qty: z.number().positive('Quantity must be positive'),
  unit: z.string().default('pc'),
});

export const CreateKitSchema = z.object({
  name: z.string().min(1, 'Kit name is required'),
  regionalName: z.string().optional(),
  festivalTag: z.string().optional(),
  price: z.number().nonnegative('Price must be non-negative'),
  description: z.string().optional(),
  items: z.array(KitItemSchema).min(1, 'Kit must contain at least one item recipe'),
});

export interface KitModel extends Kit {}

export const KitTableDefinition = {
  tableName: 'kits',
  columns: ['id', 'tenant_id', 'name', 'regional_name', 'festival_tag', 'price', 'description', 'created_at'],
  primaryKey: 'id',
  foreignKeys: [{ column: 'tenant_id', references: 'client_tenants(id)' }],
};

export const KitItemTableDefinition = {
  tableName: 'kit_items',
  columns: ['id', 'kit_id', 'item_id', 'qty', 'unit'],
  primaryKey: 'id',
  foreignKeys: [
    { column: 'kit_id', references: 'kits(id)' },
    { column: 'item_id', references: 'items(id)' },
  ],
};
