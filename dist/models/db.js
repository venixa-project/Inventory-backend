import { isPostgresActive, getPostgresPool } from './postgres.js';
import { PostgresSync } from './postgresSync.js';
import { SEED_USERS, SEED_ROLES, SEED_BRANCHES, SEED_CLIENTS, SEED_LICENSE_SALES, SEED_PLATFORM_INTEGRATIONS, SEED_SHOP_SETTINGS, SEED_ITEMS, SEED_KITS, SEED_CUSTOMERS, SEED_SUPPLIERS, SEED_PURCHASE_ORDERS, SEED_VENDOR_PAYMENTS, SEED_PURCHASE_RETURNS, SEED_CONTRA_OFFSETS, SEED_BILLS, SEED_SALES_ORDERS, SEED_PACKAGES, SEED_CHALLANS, SEED_CASH_SHIFT, SEED_CASH_EXPENSES, SEED_STOCK_LOGS, SEED_FESTIVALS, } from './initialSeed.js';
class DatabaseService {
    data;
    isDirty = false;
    constructor() {
        this.data = this.getDefaultData();
    }
    getDefaultData() {
        return {
            users: [...SEED_USERS],
            roles: [...SEED_ROLES],
            branches: [...SEED_BRANCHES],
            clients: [...SEED_CLIENTS],
            licenseSales: [...SEED_LICENSE_SALES],
            platformIntegrations: { ...SEED_PLATFORM_INTEGRATIONS },
            shopSettings: {
                'CLI-1001': { ...SEED_SHOP_SETTINGS },
            },
            items: [...SEED_ITEMS],
            kits: [...SEED_KITS],
            customers: [...SEED_CUSTOMERS],
            suppliers: [...SEED_SUPPLIERS],
            purchaseOrders: [...SEED_PURCHASE_ORDERS],
            vendorPayments: [...SEED_VENDOR_PAYMENTS],
            purchaseReturns: [...SEED_PURCHASE_RETURNS],
            contraOffsets: [...SEED_CONTRA_OFFSETS],
            bills: [...SEED_BILLS],
            salesOrders: [...SEED_SALES_ORDERS],
            packages: [...SEED_PACKAGES],
            deliveryChallans: [...SEED_CHALLANS],
            cashShifts: SEED_CASH_SHIFT ? [{ ...SEED_CASH_SHIFT }] : [],
            cashExpenses: [...SEED_CASH_EXPENSES],
            stockLogs: [...SEED_STOCK_LOGS],
            festivals: [...SEED_FESTIVALS],
            bankSettlements: [],
            salesReturns: [],
            paymentRequests: [],
        };
    }
    saveToDisk(_dataToSave) {
        // PostgreSQL is the sole, persistent database storage engine.
        // No mock JSON or disk files are created or maintained.
        this.isDirty = false;
    }
    persist() {
        this.isDirty = true;
        this.saveToDisk();
    }
    // Generic Getters
    get(key) {
        return this.data[key];
    }
    set(key, value) {
        this.data[key] = value;
        this.persist();
        // Asynchronously reflect latest change in PostgreSQL
        if (isPostgresActive()) {
            if (Array.isArray(value) && value.length > 0) {
                const latest = value[value.length - 1];
                if (key === 'items')
                    PostgresSync.syncItem(latest);
                else if (key === 'bills')
                    PostgresSync.syncBill(latest);
                else if (key === 'salesOrders')
                    PostgresSync.syncSalesOrder(latest);
                else if (key === 'deliveryChallans')
                    PostgresSync.syncDeliveryChallan(latest);
                else if (key === 'stockLogs')
                    PostgresSync.syncStockLog(latest);
                else if (key === 'roles')
                    PostgresSync.syncRole(latest);
                else if (key === 'branches')
                    PostgresSync.syncBranch(latest);
                else if (key === 'users')
                    PostgresSync.syncUser(latest);
                else if (key === 'customers')
                    PostgresSync.syncCustomer(latest);
                else if (key === 'suppliers')
                    PostgresSync.syncSupplier(latest);
                else if (key === 'purchaseOrders')
                    PostgresSync.syncPurchaseOrder(latest);
                else if (key === 'vendorPayments')
                    PostgresSync.syncVendorPayment(latest);
                else if (key === 'cashShifts')
                    PostgresSync.syncCashShift(latest);
                else if (key === 'cashExpenses')
                    PostgresSync.syncCashExpense(latest);
                else if (key === 'festivals')
                    PostgresSync.syncFestival(latest);
            }
            else if (key === 'shopSettings' && typeof value === 'object' && value !== null) {
                const tenantIds = Object.keys(value);
                if (tenantIds.length > 0) {
                    const lastTenant = tenantIds[tenantIds.length - 1];
                    PostgresSync.syncShopSettings(value[lastTenant]);
                }
            }
        }
    }
    async loadFromPostgres() {
        if (!isPostgresActive())
            return false;
        try {
            const pool = getPostgresPool();
            console.log('🔄 [DatabaseService] Hydrating application state directly from live PostgreSQL database...');
            // 1. Client Tenants
            const tenantsRes = await pool.query('SELECT * FROM client_tenants');
            if (tenantsRes.rows.length > 0) {
                this.data.clients = tenantsRes.rows.map((r) => ({
                    id: r.id,
                    businessName: r.business_name,
                    ownerName: r.owner_name,
                    email: r.email,
                    phone: r.phone,
                    city: r.city,
                    state: r.state,
                    address: r.address || '',
                    gstin: r.gstin || undefined,
                    businessType: r.business_type,
                    licenseTier: r.license_tier,
                    billingFrequency: r.billing_frequency,
                    monthlyFee: parseFloat(r.monthly_fee) || 0,
                    status: r.status,
                    startDate: r.start_date ? new Date(r.start_date).toISOString().substring(0, 10) : '2026-01-01',
                    renewalDate: r.renewal_date ? new Date(r.renewal_date).toISOString().substring(0, 10) : '2027-01-01',
                    branchesCount: r.branches_count || 1,
                    userCount: r.user_count || 1,
                    skuCount: r.sku_count || 0,
                    credentials: {
                        username: r.username || r.email,
                        tenantCode: r.tenant_code || r.id,
                        loginUrl: r.login_url || '/login',
                        status: r.credential_status || 'provisioned',
                    },
                    notes: r.notes || undefined,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 2. Users
            const usersRes = await pool.query('SELECT * FROM users ORDER BY created_at ASC');
            if (usersRes.rows.length > 0) {
                this.data.users = usersRes.rows.map((r) => ({
                    id: r.id,
                    username: r.username || (r.name ? r.name.toLowerCase().replace(/\s+/g, '.') : 'user'),
                    firstName: r.first_name || '',
                    lastName: r.last_name || '',
                    name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username,
                    email: r.email,
                    phone: r.phone || '',
                    role: r.role,
                    roleId: r.role_id || (r.role === 'owner' ? 'role-owner' : 'role-sales-purchases'),
                    roleName: r.role_name || (r.role === 'owner' ? 'Store Owner' : 'SALES & PURCHASES'),
                    tenantId: r.tenant_id || undefined,
                    designation: r.designation || undefined,
                    passwordHash: r.password_hash,
                    branches: typeof r.branches === 'string' ? JSON.parse(r.branches) : (r.branches || []),
                    branchesAccess: r.branches_access || 'All Branches',
                    apps: typeof r.apps === 'string' ? JSON.parse(r.apps) : (r.apps || { pos: true, mobile: false, adminPortal: true, inward: false }),
                    isActive: r.is_active ?? true,
                    status: r.is_active ? 'active' : 'inactive',
                    createdBy: r.created_by || 'System',
                    updatedBy: r.updated_by || undefined,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 3. Items
            const itemsRes = await pool.query('SELECT * FROM items');
            if (itemsRes.rows.length > 0) {
                this.data.items = itemsRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    name: r.name,
                    nameHi: r.name_hi || undefined,
                    nameTe: r.name_te || undefined,
                    category: r.category,
                    sku: r.sku || '',
                    barcode: r.barcode || '',
                    hsnCode: r.hsn_code || '',
                    costPrice: parseFloat(r.cost_price) || 0,
                    sellingPrice: parseFloat(r.selling_price) || 0,
                    mrp: parseFloat(r.mrp) || 0,
                    stock: parseFloat(r.stock) || 0,
                    minStockAlert: r.min_stock_alert || 5,
                    unit: r.unit || 'pc',
                    subUnit: r.sub_unit || undefined,
                    subUnitsPerUnit: r.sub_units_per_unit || undefined,
                    rackLocation: r.rack_location || undefined,
                    isActive: r.is_active ?? true,
                    gstPercent: 0,
                    reorderLevel: 5,
                    festivalTags: [],
                    notes: r.notes || undefined,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 4. Shop Settings
            const shopRes = await pool.query('SELECT * FROM shop_settings');
            if (shopRes.rows.length > 0) {
                for (const r of shopRes.rows) {
                    const tenantClient = this.data.clients.find(c => c.id === r.tenant_id);
                    this.data.shopSettings[r.tenant_id] = {
                        tenantId: r.tenant_id,
                        shopName: r.shop_name,
                        shopNameHi: r.shop_name_hi || 'वेनिक्सा स्टोर',
                        shopNameTe: r.shop_name_te || 'వెనిక్సా స్టోర్',
                        tagline: r.tagline || '',
                        phone: r.phone || '+91 98765 43210',
                        address: r.address || '',
                        upiId: r.upi_id || 'store@upi',
                        gstin: r.gstin || '',
                        businessType: tenantClient?.businessType || 'pooja',
                        hasSelectedDomain: true,
                        role: r.role || 'owner',
                        theme: r.theme || 'light',
                        receiptType: r.receipt_type || '80mm',
                        fontSizeScale: r.font_size_scale || 'normal',
                        highContrast: r.high_contrast ?? false,
                        enableVoiceAssist: r.enable_voice_assist ?? false,
                        enableSoundEffects: r.enable_sound_effects ?? true,
                        userName: tenantClient?.ownerName || 'Store Owner',
                        userEmail: tenantClient?.email || 'owner@store.com',
                        userPhone: tenantClient?.phone || '+91 98765 43210',
                        userDesignation: 'Store Owner',
                    };
                }
            }
            // 5. Customers
            const custRes = await pool.query('SELECT * FROM customers');
            if (custRes.rows.length > 0) {
                this.data.customers = custRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    name: r.name,
                    phone: r.phone || '',
                    email: r.email || undefined,
                    address: r.address || undefined,
                    gstin: r.gstin || undefined,
                    dueAmount: parseFloat(r.due_amount) || 0,
                    creditLimit: parseFloat(r.credit_limit) || 0,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 6. Suppliers
            const suppRes = await pool.query('SELECT * FROM suppliers');
            if (suppRes.rows.length > 0) {
                this.data.suppliers = suppRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    name: r.name,
                    contactPerson: r.contact_person || undefined,
                    phone: r.phone || '',
                    email: r.email || undefined,
                    address: r.address || undefined,
                    gstin: r.gstin || undefined,
                    balanceDue: parseFloat(r.balance_due) || 0,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 7. Bills & Bill Lines
            const billsRes = await pool.query('SELECT * FROM bills ORDER BY date ASC');
            const billLinesRes = await pool.query('SELECT * FROM bill_lines');
            if (billsRes.rows.length > 0) {
                const linesByBill = new Map();
                for (const l of billLinesRes.rows) {
                    if (!linesByBill.has(l.bill_id))
                        linesByBill.set(l.bill_id, []);
                    linesByBill.get(l.bill_id).push({
                        id: `bline-${l.bill_id}-${l.item_id}`,
                        type: l.item_type || 'item',
                        referenceId: l.item_id,
                        itemId: l.item_id,
                        name: l.item_name,
                        itemName: l.item_name,
                        unit: l.unit || 'pc',
                        qty: parseFloat(l.qty) || 1,
                        unitPrice: parseFloat(l.rate) || 0,
                        rate: parseFloat(l.rate) || 0,
                        gstPercent: parseFloat(l.gst_percent) || 0,
                        gstAmount: 0,
                        totalPrice: parseFloat(l.total) || 0,
                        total: parseFloat(l.total) || 0,
                    });
                }
                this.data.bills = billsRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    billNumber: r.bill_number,
                    date: r.date ? new Date(r.date).toISOString().replace('T', ' ').substring(0, 16) : new Date().toISOString(),
                    customerId: r.customer_id || undefined,
                    customerName: r.customer_name || 'Walk-in',
                    customerPhone: r.customer_phone || undefined,
                    lines: linesByBill.get(r.id) || [],
                    subtotal: parseFloat(r.subtotal) || 0,
                    gst: parseFloat(r.gst) || 0,
                    discount: parseFloat(r.discount) || 0,
                    total: parseFloat(r.total) || 0,
                    roundOff: parseFloat(r.round_off) || 0,
                    paid: parseFloat(r.paid) || 0,
                    due: parseFloat(r.due) || 0,
                    paymentMode: r.payment_mode || 'Cash',
                    notes: r.notes || undefined,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 8. Sales Orders & Sales Order Lines
            const soRes = await pool.query('SELECT * FROM sales_orders ORDER BY date ASC');
            const soLinesRes = await pool.query('SELECT * FROM sales_order_lines');
            if (soRes.rows.length > 0) {
                const linesBySo = new Map();
                for (const l of soLinesRes.rows) {
                    if (!linesBySo.has(l.so_id))
                        linesBySo.set(l.so_id, []);
                    linesBySo.get(l.so_id).push({
                        itemId: l.item_id,
                        itemName: l.item_name,
                        qty: parseFloat(l.qty) || 1,
                        rate: parseFloat(l.rate) || 0,
                        amount: parseFloat(l.amount) || 0,
                        unit: 'pc',
                        gstPercent: 0,
                        gstAmount: 0,
                    });
                }
                this.data.salesOrders = soRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    soNumber: r.so_number,
                    date: r.date ? new Date(r.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
                    customerId: r.customer_id || undefined,
                    customerName: r.customer_name || 'Customer',
                    customerPhone: r.customer_phone || undefined,
                    lines: linesBySo.get(r.id) || [],
                    subtotal: parseFloat(r.subtotal) || 0,
                    taxAmount: parseFloat(r.tax_amount) || 0,
                    total: parseFloat(r.total) || 0,
                    status: r.status,
                    paidAmount: parseFloat(r.paid_amount) || 0,
                    dueAmount: parseFloat(r.due_amount) || 0,
                    paymentStatus: r.payment_status || 'Pending',
                    paymentTerms: 'Due on Receipt',
                    customerNotes: r.customer_notes || undefined,
                    notes: r.notes || undefined,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 9. Delivery Challans
            const dcRes = await pool.query('SELECT * FROM delivery_challans');
            if (dcRes.rows.length > 0) {
                this.data.deliveryChallans = dcRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    challanNumber: r.challan_number,
                    customerId: r.customer_id || undefined,
                    customerName: r.customer_name,
                    customerPhone: r.customer_phone || undefined,
                    deliveryAddress: r.delivery_address || undefined,
                    date: r.date ? new Date(r.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
                    referenceNumber: r.reference_number || undefined,
                    challanType: r.challan_type,
                    transporterName: r.transporter_name || undefined,
                    vehicleNumber: r.vehicle_number || undefined,
                    total: parseFloat(r.total) || 0,
                    status: r.status,
                    lines: [],
                    notes: r.notes || undefined,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 10. Stock Logs
            const slRes = await pool.query('SELECT * FROM stock_logs ORDER BY date DESC LIMIT 200');
            if (slRes.rows.length > 0) {
                this.data.stockLogs = slRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    itemId: r.item_id,
                    itemName: r.item_name,
                    qtyChange: parseFloat(r.qty_change) || 0,
                    unit: r.unit || 'pc',
                    reason: r.reason,
                    note: r.note || '',
                    date: r.date ? new Date(r.date).toISOString() : new Date().toISOString(),
                }));
            }
            // 11. Roles (Tenant-based RBAC)
            const rolesRes = await pool.query('SELECT * FROM roles ORDER BY created_at ASC');
            if (rolesRes.rows.length > 0) {
                this.data.roles = rolesRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    name: r.name,
                    description: r.description || '',
                    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
                    userCount: r.user_count || 0,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
                }));
            }
            else {
                this.data.roles = [];
            }
            // 12. Branches (Tenant-based Multi-Branch)
            const branchesRes = await pool.query('SELECT * FROM branches ORDER BY created_at ASC');
            if (branchesRes.rows.length > 0) {
                this.data.branches = branchesRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    name: r.name,
                    code: r.code || '',
                    group: r.group_name || 'General',
                    city: r.city || '',
                    state: r.state || '',
                    address: r.address || '',
                    isActive: r.is_active ?? true,
                }));
            }
            else {
                this.data.branches = [];
            }
            // 13. Purchase Orders
            const poRes = await pool.query('SELECT * FROM purchase_orders ORDER BY created_at DESC');
            const poLinesRes = await pool.query('SELECT * FROM purchase_order_lines');
            if (poRes.rows.length > 0) {
                const linesByPo = new Map();
                for (const l of poLinesRes.rows) {
                    if (!linesByPo.has(l.po_id))
                        linesByPo.set(l.po_id, []);
                    linesByPo.get(l.po_id).push({
                        itemId: l.item_id,
                        qty: parseFloat(l.qty) || 1,
                        costPrice: parseFloat(l.cost_price) || 0,
                        totalCost: parseFloat(l.total_cost) || 0,
                    });
                }
                this.data.purchaseOrders = poRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    poNumber: r.po_number,
                    supplierId: r.supplier_id,
                    date: r.date ? new Date(r.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
                    receivedDate: r.received_date ? new Date(r.received_date).toISOString().substring(0, 10) : undefined,
                    status: r.status,
                    stockInwarded: r.stock_inwarded ?? false,
                    paymentStatus: r.payment_status || 'Pending',
                    paidAmount: parseFloat(r.paid_amount) || 0,
                    dueAmount: parseFloat(r.due_amount) || 0,
                    paymentMode: r.payment_mode || 'Credit',
                    totalAmount: parseFloat(r.total_amount) || 0,
                    notes: r.notes || undefined,
                    lines: linesByPo.get(r.id) || [],
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 14. Vendor Payments
            const vpRes = await pool.query('SELECT * FROM vendor_payments ORDER BY created_at DESC');
            if (vpRes.rows.length > 0) {
                this.data.vendorPayments = vpRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    paymentNumber: r.payment_number,
                    supplierId: r.supplier_id,
                    supplierName: r.supplier_name,
                    poId: r.po_id || undefined,
                    date: r.date ? new Date(r.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
                    amount: parseFloat(r.amount) || 0,
                    paymentMode: r.payment_mode || 'Bank Transfer',
                    referenceNumber: r.reference_number || undefined,
                    note: r.note || undefined,
                    recordedBy: r.recorded_by || 'Store Owner',
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                }));
            }
            // 15. Cash Shifts
            const csRes = await pool.query('SELECT * FROM cash_shifts ORDER BY opened_at DESC');
            if (csRes.rows.length > 0) {
                this.data.cashShifts = csRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    date: r.date ? new Date(r.date).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
                    openedAt: r.opened_at ? new Date(r.opened_at).toISOString() : new Date().toISOString(),
                    closedAt: r.closed_at ? new Date(r.closed_at).toISOString() : undefined,
                    openingCash: parseFloat(r.opening_cash) || 0,
                    cashSales: parseFloat(r.cash_sales) || 0,
                    cashExpenses: parseFloat(r.cash_expenses) || 0,
                    expectedClosingCash: parseFloat(r.expected_closing_cash) || 0,
                    actualClosingCash: r.actual_closing_cash !== null ? parseFloat(r.actual_closing_cash) : undefined,
                    discrepancy: r.discrepancy !== null ? parseFloat(r.discrepancy) : undefined,
                    status: r.status,
                    notes: r.notes || undefined,
                }));
            }
            // 16. Festivals & Seasonal Demand Plans
            const festRes = await pool.query('SELECT * FROM festivals ORDER BY start_date ASC');
            if (festRes.rows.length > 0) {
                this.data.festivals = festRes.rows.map((r) => ({
                    id: r.id,
                    tenantId: r.tenant_id,
                    name: r.name,
                    description: r.description || '',
                    approxDate: r.approx_date || r.start_date,
                    startDate: r.start_date || '',
                    endDate: r.end_date || '',
                    prepStartDate: r.prep_start_date || '',
                    salesPeakDate: r.sales_peak_date || '',
                    historicalCompareYear: r.historical_compare_year || 2025,
                    status: r.status || 'active',
                    suggestedTags: r.suggested_tags || [],
                    bufferMultiplier: parseFloat(r.buffer_multiplier) || 2.0,
                    selectedProductIds: r.selected_product_ids || [],
                    customTargets: typeof r.custom_targets === 'string' ? JSON.parse(r.custom_targets) : (r.custom_targets || {}),
                    scenario: r.scenario || 'expected',
                }));
            }
            console.log(`✅ [DatabaseService] Successfully loaded live PostgreSQL data! (${this.data.items.length} items, ${this.data.bills.length} bills, ${this.data.festivals.length} festivals, ${this.data.clients.length} tenants, ${this.data.users.length} users, ${this.data.roles.length} roles)`);
            return true;
        }
        catch (err) {
            console.warn('⚠️ [DatabaseService] loadFromPostgres failed:', err.message);
            return false;
        }
    }
    resetToDefault() {
        this.data = this.getDefaultData();
        this.saveToDisk();
    }
}
export const db = new DatabaseService();
