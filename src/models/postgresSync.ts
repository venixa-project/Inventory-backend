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

  /**
   * Syncs a user account upsert to Railway PostgreSQL
   */
  public static async syncUser(user: any): Promise<void> {
    if (!isPostgresActive() || !user) return;
    try {
      const pool = getPostgresPool();
      const validRole = user.role === 'owner' || user.role === 'product_admin' ? user.role : 'staff';
      await pool.query(
        `INSERT INTO users (
          id, username, first_name, last_name, name, email, phone,
          role, role_id, role_name, tenant_id, password_hash,
          branches, branches_access, apps, is_active, status, created_by, updated_by, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, NOW())
        ON CONFLICT (id) DO UPDATE SET
          username = COALESCE(EXCLUDED.username, users.username),
          first_name = COALESCE(EXCLUDED.first_name, users.first_name),
          last_name = COALESCE(EXCLUDED.last_name, users.last_name),
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          role_id = EXCLUDED.role_id,
          role_name = EXCLUDED.role_name,
          tenant_id = EXCLUDED.tenant_id,
          password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
          branches = EXCLUDED.branches,
          branches_access = EXCLUDED.branches_access,
          apps = EXCLUDED.apps,
          is_active = EXCLUDED.is_active,
          status = EXCLUDED.status,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()`,
        [
          user.id,
          user.username || user.name?.toLowerCase().replace(/\s+/g, '.') || 'user',
          user.firstName || user.first_name || null,
          user.lastName || user.last_name || null,
          user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'User',
          user.email || null,
          user.phone || null,
          validRole,
          user.roleId || user.role_id || 'role-sales-purchases',
          user.roleName || user.role_name || 'SALES & PURCHASES',
          user.tenantId || user.tenant_id || 'CLI-1001',
          user.passwordHash || user.password_hash || '$2a$10$xCqzRglYgJkUWTXgj8//YeiXXCyQbs8v7li8LRTlaf1ZmOOgwT9G6',
          JSON.stringify(user.branches || []),
          user.branchesAccess || user.branches_access || 'All Branches',
          JSON.stringify(user.apps || { pos: true, mobile: false, adminPortal: true, inward: false }),
          user.isActive ?? true,
          user.status || (user.isActive ? 'Active' : 'Inactive'),
          user.createdBy || user.created_by || 'Store Owner',
          user.updatedBy || user.updated_by || null,
          user.createdAt || new Date().toISOString(),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync user to PostgreSQL:', err.message);
    }
  }

  /**
   * Deletes a user account from Railway PostgreSQL
   */
  public static async deleteUser(id: string): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      await pool.query('DELETE FROM users WHERE id = $1', [id]);
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to delete user from PostgreSQL:', err.message);
    }
  }

  /**
   * Deletes an item from Railway PostgreSQL
   */
  public static async deleteItem(id: string, tenantId: string = 'CLI-1001'): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      await pool.query('DELETE FROM items WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to delete item from PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a customer upsert to Railway PostgreSQL
   */
  public static async syncCustomer(c: any): Promise<void> {
    if (!isPostgresActive() || !c) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO customers (
          id, tenant_id, name, phone, email, address, company_name, gstin,
          credit_limit, due_amount, is_also_vendor, linked_supplier_id, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          company_name = EXCLUDED.company_name,
          gstin = EXCLUDED.gstin,
          credit_limit = EXCLUDED.credit_limit,
          due_amount = EXCLUDED.due_amount,
          is_also_vendor = EXCLUDED.is_also_vendor,
          linked_supplier_id = EXCLUDED.linked_supplier_id,
          updated_at = NOW()`,
        [
          c.id,
          c.tenantId || 'CLI-1001',
          c.name,
          c.phone || '',
          c.email || null,
          c.address || null,
          c.companyName || null,
          c.gstin || null,
          parseFloat(c.creditLimit) || 0,
          parseFloat(c.dueAmount) || 0,
          Boolean(c.isAlsoVendor),
          c.linkedSupplierId || null,
          c.createdAt ? new Date(c.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync customer to PostgreSQL:', err.message);
    }
  }

  /**
   * Deletes a customer from Railway PostgreSQL
   */
  public static async deleteCustomer(id: string, tenantId: string = 'CLI-1001'): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      await pool.query('DELETE FROM customers WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to delete customer from PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a supplier / vendor upsert to Railway PostgreSQL
   */
  public static async syncSupplier(s: any): Promise<void> {
    if (!isPostgresActive() || !s) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO suppliers (
          id, tenant_id, name, company_name, phone, email, address, gstin,
          bank_account_number, bank_ifsc, bank_name, upi_id, payment_terms,
          is_also_customer, linked_customer_id, contact_person, balance_due, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          company_name = EXCLUDED.company_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          gstin = EXCLUDED.gstin,
          bank_account_number = EXCLUDED.bank_account_number,
          bank_ifsc = EXCLUDED.bank_ifsc,
          bank_name = EXCLUDED.bank_name,
          upi_id = EXCLUDED.upi_id,
          payment_terms = EXCLUDED.payment_terms,
          is_also_customer = EXCLUDED.is_also_customer,
          linked_customer_id = EXCLUDED.linked_customer_id,
          contact_person = EXCLUDED.contact_person,
          balance_due = EXCLUDED.balance_due,
          updated_at = NOW()`,
        [
          s.id,
          s.tenantId || 'CLI-1001',
          s.name,
          s.companyName || null,
          s.phone || '',
          s.email || null,
          s.address || null,
          s.gstin || null,
          s.bankAccountNumber || null,
          s.bankIfsc || null,
          s.bankName || null,
          s.upiId || null,
          s.paymentTerms || 'Net 30',
          Boolean(s.isAlsoCustomer),
          s.linkedCustomerId || null,
          s.contactPerson || null,
          parseFloat(s.balanceDue) || 0,
          s.createdAt ? new Date(s.createdAt).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync supplier to PostgreSQL:', err.message);
    }
  }

  /**
   * Deletes a supplier from Railway PostgreSQL
   */
  public static async deleteSupplier(id: string, tenantId: string = 'CLI-1001'): Promise<void> {
    if (!isPostgresActive()) return;
    try {
      const pool = getPostgresPool();
      await pool.query('DELETE FROM suppliers WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to delete supplier from PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a purchase order & lines to Railway PostgreSQL
   */
  public static async syncPurchaseOrder(po: any): Promise<void> {
    if (!isPostgresActive() || !po) return;
    try {
      const pool = getPostgresPool();
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const validStatus = ['Draft', 'Ordered', 'Sent', 'Received', 'Cancelled'].includes(po.status)
          ? po.status
          : 'Draft';

        await client.query(
          `INSERT INTO purchase_orders (
            id, tenant_id, po_number, supplier_id, date, received_date, status,
            stock_inwarded, payment_status, paid_amount, due_amount, payment_mode, total_amount, notes, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, NOW())
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            stock_inwarded = EXCLUDED.stock_inwarded,
            received_date = EXCLUDED.received_date,
            paid_amount = EXCLUDED.paid_amount,
            due_amount = EXCLUDED.due_amount,
            total_amount = EXCLUDED.total_amount,
            notes = EXCLUDED.notes`,
          [
            po.id,
            po.tenantId || 'CLI-1001',
            po.poNumber || `PO-${po.id.slice(-6)}`,
            po.supplierId,
            po.date ? new Date(po.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
            po.receivedDate ? new Date(po.receivedDate).toISOString().substring(0, 10) : null,
            validStatus,
            Boolean(po.stockInwarded),
            po.paymentStatus || 'Pending',
            parseFloat(po.paidAmount) || 0,
            parseFloat(po.dueAmount) || 0,
            po.paymentMode || 'Credit',
            parseFloat(po.totalAmount) || 0,
            po.notes || null,
          ]
        );

        if (Array.isArray(po.items)) {
          await client.query('DELETE FROM purchase_order_lines WHERE po_id = $1', [po.id]);
          for (const item of po.items) {
            await client.query(
              `INSERT INTO purchase_order_lines (po_id, item_id, qty, cost_price, total_cost)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                po.id,
                item.itemId,
                parseFloat(item.qty) || 1,
                parseFloat(item.costPrice) || 0,
                (parseFloat(item.qty) || 1) * (parseFloat(item.costPrice) || 0),
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
      console.warn('[PostgresSync] Warning: Failed to sync purchase order to PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a vendor payment voucher to Railway PostgreSQL
   */
  public static async syncVendorPayment(vp: any): Promise<void> {
    if (!isPostgresActive() || !vp) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO vendor_payments (
          id, tenant_id, payment_number, supplier_id, supplier_name, po_id, date,
          amount, payment_mode, reference_number, note, recorded_by, created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW())
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          payment_mode = EXCLUDED.payment_mode,
          note = EXCLUDED.note`,
        [
          vp.id,
          vp.tenantId || 'CLI-1001',
          vp.paymentNumber || `VPAY-${vp.id.slice(-6)}`,
          vp.supplierId,
          vp.supplierName || 'Vendor',
          vp.poId || null,
          vp.date ? new Date(vp.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
          parseFloat(vp.amount) || 0,
          vp.paymentMode || 'Bank Transfer',
          vp.referenceNumber || null,
          vp.note || null,
          vp.recordedBy || 'Store Owner',
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync vendor payment to PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a cash shift to Railway PostgreSQL
   */
  public static async syncCashShift(cs: any): Promise<void> {
    if (!isPostgresActive() || !cs) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO cash_shifts (
          id, tenant_id, date, opened_at, closed_at, opening_cash, cash_sales,
          cash_expenses, expected_closing_cash, actual_closing_cash, discrepancy, status, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO UPDATE SET
          closed_at = EXCLUDED.closed_at,
          cash_sales = EXCLUDED.cash_sales,
          cash_expenses = EXCLUDED.cash_expenses,
          expected_closing_cash = EXCLUDED.expected_closing_cash,
          actual_closing_cash = EXCLUDED.actual_closing_cash,
          discrepancy = EXCLUDED.discrepancy,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes`,
        [
          cs.id,
          cs.tenantId || 'CLI-1001',
          cs.date ? new Date(cs.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
          cs.openedAt || new Date().toISOString(),
          cs.closedAt || null,
          parseFloat(cs.openingCash) || 0,
          parseFloat(cs.cashSales) || 0,
          parseFloat(cs.cashExpenses) || 0,
          parseFloat(cs.expectedClosingCash) || 0,
          cs.actualClosingCash !== undefined ? parseFloat(cs.actualClosingCash) : null,
          cs.discrepancy !== undefined ? parseFloat(cs.discrepancy) : null,
          cs.status || 'Open',
          cs.notes || null,
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync cash shift to PostgreSQL:', err.message);
    }
  }

  /**
   * Syncs a cash drawer expense to Railway PostgreSQL
   */
  public static async syncCashExpense(ce: any): Promise<void> {
    if (!isPostgresActive() || !ce) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO cash_expenses (
          id, tenant_id, date, category, amount, note, recorded_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          note = EXCLUDED.note`,
        [
          ce.id,
          ce.tenantId || 'CLI-1001',
          ce.date || new Date().toISOString(),
          ce.category || 'General',
          parseFloat(ce.amount) || 0,
          ce.note || '',
          ce.recordedBy || 'Store Staff',
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync cash expense to PostgreSQL:', err.message);
    }
  }

  public static async syncFestival(f: any): Promise<void> {
    if (!isPostgresActive() || !f || !f.id) return;
    try {
      const pool = getPostgresPool();
      await pool.query(
        `INSERT INTO festivals (
          id, tenant_id, name, description, approx_date, start_date, end_date,
          prep_start_date, sales_peak_date, historical_compare_year, status,
          suggested_tags, buffer_multiplier, selected_product_ids, custom_targets, scenario, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          approx_date = EXCLUDED.approx_date,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          prep_start_date = EXCLUDED.prep_start_date,
          sales_peak_date = EXCLUDED.sales_peak_date,
          historical_compare_year = EXCLUDED.historical_compare_year,
          status = EXCLUDED.status,
          suggested_tags = EXCLUDED.suggested_tags,
          buffer_multiplier = EXCLUDED.buffer_multiplier,
          selected_product_ids = EXCLUDED.selected_product_ids,
          custom_targets = EXCLUDED.custom_targets,
          scenario = EXCLUDED.scenario,
          updated_at = NOW()`,
        [
          f.id,
          f.tenantId || 'CLI-1001',
          f.name,
          f.description || '',
          f.approxDate || f.startDate || '',
          f.startDate || '',
          f.endDate || '',
          f.prepStartDate || '',
          f.salesPeakDate || '',
          f.historicalCompareYear || 2025,
          f.status || 'active',
          f.suggestedTags || [],
          f.bufferMultiplier || 2.0,
          f.selectedProductIds || [],
          JSON.stringify(f.customTargets || {}),
          f.scenario || 'expected',
        ]
      );
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to sync festival to PostgreSQL:', err.message);
    }
  }

  public static async deleteFestival(id: string): Promise<void> {
    if (!isPostgresActive() || !id) return;
    try {
      const pool = getPostgresPool();
      await pool.query('DELETE FROM festivals WHERE id = $1', [id]);
    } catch (err: any) {
      console.warn('[PostgresSync] Warning: Failed to delete festival from PostgreSQL:', err.message);
    }
  }
}

