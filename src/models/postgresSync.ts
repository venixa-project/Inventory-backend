import pkg from 'pg';
import { getPostgresPool, isPostgresActive } from './postgres.js';
import type { DatabaseSchema } from './db.js';

/**
 * PostgreSQL Runtime Synchronizer
 * Automatically synchronizes changes to PostgreSQL in Railway when PostgreSQL is active.
 * Never throws or interrupts main flow (resilient background persistence).
 */
export class PostgresSync {
  /**
   * Syncs an item upsert directly to Railway PostgreSQL
   */
  public static async syncItem(it: any): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO items (
          id, tenant_id, name, name_hi, name_te, category, sku, barcode, hsn_code,
          cost_price, selling_price, mrp, stock, min_stock_alert, unit, sub_unit,
          sub_units_per_unit, rack_location, is_active, notes, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          category = EXCLUDED.category,
          sku = EXCLUDED.sku,
          barcode = EXCLUDED.barcode,
          cost_price = EXCLUDED.cost_price,
          selling_price = EXCLUDED.selling_price,
          mrp = EXCLUDED.mrp,
          stock = EXCLUDED.stock,
          unit = EXCLUDED.unit,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()`,
        [
          it.id, it.tenantId || 'CLI-1001', it.name, it.nameHi || null, it.nameTe || null,
          it.category || 'General', it.sku || null, it.barcode || null, it.hsnCode || null,
          it.costPrice || 0, it.sellingPrice || 0, it.mrp || 0, it.stock || 0,
          it.minStockAlert || 5, it.unit || 'pc', it.subUnit || 'none', it.subUnitsPerUnit || 1,
          it.rackLocation || null, it.isActive ?? true, it.notes || null,
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync item to PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a bill & its line items to Railway PostgreSQL
   */
  public static async syncBill(b: any): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO bills (
            id, tenant_id, bill_number, customer_id, customer_name, customer_phone,
            subtotal, gst, discount, total, round_off, paid, due, payment_mode, date, notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
          ON CONFLICT (id) DO UPDATE SET
            paid = EXCLUDED.paid,
            due = EXCLUDED.due`,
          [
            b.id, b.tenantId || 'CLI-1001', b.billNumber, b.customerId || null,
            b.customerName || 'Walk-in', b.customerPhone || null, b.subtotal || 0,
            b.gst || 0, b.discount || 0, b.total || 0, b.roundOff || 0,
            b.paid || 0, b.due || 0, b.paymentMode || 'Cash', b.date || new Date().toISOString(), b.notes || null,
          ]
        );

        if (b.lines && Array.isArray(b.lines)) {
          for (const line of b.lines) {
            const itemId = line.referenceId || line.itemId;
            await client.query(
              `INSERT INTO bill_lines (bill_id, item_id, item_name, qty, unit, rate, gst_percent, total, item_type)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                b.id, itemId || null, line.name || line.itemName || 'Item', line.qty || 1,
                line.unit || 'pc', line.unitPrice || line.rate || 0, line.gstPercent || 0,
                line.totalPrice || line.total || 0, line.type || 'item'
              ]
            );
          }
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync bill to PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a sales order to Railway PostgreSQL
   */
  public static async syncSalesOrder(so: any): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const soStatus = so.status === 'Invoiced' ? 'Confirmed' : (['Draft', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'].includes(so.status) ? so.status : 'Confirmed');

        await client.query(
          `INSERT INTO sales_orders (
            id, tenant_id, so_number, customer_id, customer_name, customer_phone,
            date, subtotal, total, status, paid_amount, due_amount, payment_status, tax_amount, customer_notes, notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            paid_amount = EXCLUDED.paid_amount,
            due_amount = EXCLUDED.due_amount,
            payment_status = EXCLUDED.payment_status`,
          [
            so.id, so.tenantId || 'CLI-1001', so.soNumber, so.customerId || null,
            so.customerName || 'Customer', so.customerPhone || null, so.date || new Date().toISOString().substring(0, 10),
            so.subtotal || 0, so.total || 0, soStatus,
            so.paidAmount || 0, so.dueAmount || 0, so.paymentStatus || 'Pending',
            so.taxAmount || 0, so.customerNotes || so.notes || null, so.notes || null,
          ]
        );

        if (so.lines && Array.isArray(so.lines)) {
          for (const line of so.lines) {
            await client.query(
              `INSERT INTO sales_order_lines (so_id, item_id, item_name, qty, rate, amount)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [so.id, line.itemId || null, line.itemName || 'Item', line.qty || 1, line.rate || 0, line.amount || 0]
            );
          }
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync sales order to PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a delivery challan to Railway PostgreSQL
   */
  public static async syncDeliveryChallan(dc: any): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO delivery_challans (
          id, tenant_id, challan_number, customer_id, customer_name, customer_phone,
          delivery_address, date, reference_number, challan_type, transporter_name,
          vehicle_number, total, status, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          transporter_name = EXCLUDED.transporter_name,
          vehicle_number = EXCLUDED.vehicle_number`,
        [
          dc.id, dc.tenantId || 'CLI-1001', dc.challanNumber, dc.customerId || null,
          dc.customerName || 'Consignee', dc.customerPhone || null, dc.deliveryAddress || null,
          dc.date || new Date().toISOString().substring(0, 10), dc.referenceNumber || null,
          dc.challanType || 'Customer Delivery / Dispatch', dc.transporterName || null,
          dc.vehicleNumber || null, dc.total || 0, dc.status || 'Open', dc.notes || null,
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync delivery challan to PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a stock log entry to Railway PostgreSQL
   */
  public static async syncStockLog(sl: any): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      const validReasons = ['sale', 'purchase', 'return', 'damage', 'manual_add', 'audit_correction', 'festival_kit_assembly', 'pos_void'];
      const slReason = (sl.reason === 'initial' || !validReasons.includes(sl.reason)) ? 'audit_correction' : sl.reason;

      await pool.query(
        `INSERT INTO stock_logs (
          id, tenant_id, item_id, item_name, qty_change, unit, reason, note, date
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO NOTHING`,
        [
          sl.id, sl.tenantId || 'CLI-1001', sl.itemId, sl.itemName,
          sl.qtyChange, sl.unit || 'pc', slReason, sl.note || null,
          sl.date || new Date().toISOString(),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync stock log to PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs shop settings & branding to Railway PostgreSQL
   */
  public static async syncShopSettings(s: any): Promise<void> {
    if (!isPostgresActive() || !s) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO shop_settings (
          tenant_id, shop_name, tagline, address, phone, email,
          gstin, theme, role, receipt_footer_message, auto_round_off, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW())
        ON CONFLICT (tenant_id) DO UPDATE SET
          shop_name = EXCLUDED.shop_name,
          tagline = EXCLUDED.tagline,
          address = EXCLUDED.address,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          gstin = EXCLUDED.gstin,
          receipt_footer_message = EXCLUDED.receipt_footer_message,
          updated_at = NOW()`,
        [
          s.tenantId || 'CLI-1001',
          s.shopName || 'Store',
          s.tagline || null,
          s.address || null,
          s.phone || null,
          s.userEmail || null,
          s.gstin || null,
          s.theme || 'light',
          s.role || 'owner',
          s.receiptFooterNote || s.receiptFooterMessage || null,
          true,
        ]
      );

      // Keep client_tenants business_name in sync
      if (s.shopName && s.tenantId) {
        await pool.query(
          `UPDATE client_tenants SET business_name = $1 WHERE id = $2`,
          [s.shopName, s.tenantId]
        );
      }
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync shopSettings to PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a role upsert to Railway PostgreSQL
   */
  public static async syncRole(role: any, tenantId: string = 'CLI-1001'): Promise<void> {
    if (!isPostgresActive() || !role) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO roles (
          id, tenant_id, name, description, permissions, user_count, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          permissions = EXCLUDED.permissions,
          user_count = EXCLUDED.user_count,
          updated_at = NOW()`,
        [
          role.id,
          role.tenantId || tenantId,
          role.name,
          role.description || '',
          JSON.stringify(role.permissions || {}),
          role.userCount || 0,
          role.createdAt || new Date().toISOString(),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync role to PostgreSQL:', err.message);
    }
  }

  /**
   * Deletes a role from Railway PostgreSQL
   */
  public static async deleteRole(id: string, tenantId: string = 'CLI-1001'): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      await pool.query(`DELETE FROM roles WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to delete role from PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a branch upsert to Railway PostgreSQL
   */
  public static async syncBranch(branch: any, tenantId: string = 'CLI-1001'): Promise<void> {
    if (!isPostgresActive() || !branch) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO branches (
          id, tenant_id, name, code, group_name, city, state, address, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          code = EXCLUDED.code,
          group_name = EXCLUDED.group_name,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          address = EXCLUDED.address,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()`,
        [
          branch.id,
          branch.tenantId || tenantId,
          branch.name,
          branch.code || null,
          branch.group || branch.group_name || 'General',
          branch.city || 'Hyderabad',
          branch.state || 'Telangana',
          branch.address || null,
          branch.isActive ?? true,
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync branch to PostgreSQL:', err.message);
    }
  }

  /**
   * Deletes a branch from Railway PostgreSQL
   */
  public static async deleteBranch(id: string, tenantId: string = 'CLI-1001'): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      await pool.query(`DELETE FROM branches WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to delete branch from PostgreSQL:', err.message);
    }
  }
}

