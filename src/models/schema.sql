-- =============================================================================
-- VENIXA MULTI-ROLE INVENTORY MANAGEMENT PLATFORM
-- PRODUCTION POSTGRESQL DATABASE DDL & VERSIONED MIGRATIONS
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ENUMS (Idempotent)
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('product_admin', 'owner', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE business_type_enum AS ENUM ('pooja', 'pharmacy', 'grocery', 'hardware', 'retail_general');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE license_tier_enum AS ENUM ('starter', 'professional', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE client_status_enum AS ENUM ('active', 'trial', 'suspended', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE billing_frequency_enum AS ENUM ('monthly', 'quarterly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode_enum AS ENUM ('Cash', 'UPI', 'Card', 'Credit', 'Split', 'Bank Transfer', 'Cheque', 'Contra');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE po_status_enum AS ENUM ('Draft', 'Ordered', 'Sent', 'Received', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE so_status_enum AS ENUM ('Draft', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Invoiced');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE stock_reason_enum AS ENUM ('sale', 'purchase', 'return', 'damage', 'manual_add', 'audit_correction', 'festival_kit_assembly', 'pos_void', 'initial');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- 2. CLIENT TENANTS (Multi-Tenant Isolation)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS client_tenants (
    id VARCHAR(50) PRIMARY KEY, -- e.g. CLI-1001
    business_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    address TEXT,
    gstin VARCHAR(50),
    business_type business_type_enum NOT NULL DEFAULT 'pooja',
    license_tier license_tier_enum NOT NULL DEFAULT 'professional',
    billing_frequency billing_frequency_enum NOT NULL DEFAULT 'monthly',
    monthly_fee NUMERIC(12, 2) NOT NULL DEFAULT 1499.00,
    status client_status_enum NOT NULL DEFAULT 'active',
    start_date DATE NOT NULL,
    renewal_date DATE NOT NULL,
    branches_count INT NOT NULL DEFAULT 1,
    user_count INT NOT NULL DEFAULT 3,
    sku_count INT NOT NULL DEFAULT 0,
    -- Credentials & access
    username VARCHAR(100) NOT NULL,
    temporary_password VARCHAR(255),
    tenant_code VARCHAR(50) NOT NULL,
    login_url VARCHAR(255) NOT NULL,
    credential_status VARCHAR(50) NOT NULL DEFAULT 'provisioned',
    password_last_reset TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_tenants_status ON client_tenants(status);
CREATE INDEX IF NOT EXISTS idx_client_tenants_tier ON client_tenants(license_tier);

-- -----------------------------------------------------------------------------
-- 3. USERS & RBAC AUTH
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    tenant_id VARCHAR(50) REFERENCES client_tenants(id) ON DELETE SET NULL, -- NULL for product_admin
    phone VARCHAR(50),
    designation VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- -----------------------------------------------------------------------------
-- 4. SOFTWARE LICENSE SALES (SaaS Billing & Invoices)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS software_license_sales (
    id VARCHAR(50) PRIMARY KEY, -- e.g. LIC-INV-2026-001
    client_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    date DATE NOT NULL,
    plan license_tier_enum NOT NULL,
    period VARCHAR(50) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'paid', -- 'paid', 'pending', 'failed'
    receipt_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_sales_client ON software_license_sales(client_id);
CREATE INDEX IF NOT EXISTS idx_license_sales_date ON software_license_sales(date);

-- -----------------------------------------------------------------------------
-- 5. PLATFORM INTEGRATIONS (Hardware, Thermal, SMS, GST, Soundbox)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_integrations (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'platform_global',
    thermal_printer_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    printer_paper_width VARCHAR(20) NOT NULL DEFAULT '80mm',
    printer_interface VARCHAR(50) NOT NULL DEFAULT 'Network / USB',
    cash_drawer_kick_pulse BOOLEAN NOT NULL DEFAULT TRUE,
    payment_soundbox_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    soundbox_provider VARCHAR(50) NOT NULL DEFAULT 'Paytm / PhonePe Soundbox',
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_provider VARCHAR(50) NOT NULL DEFAULT 'Meta Cloud API',
    whatsapp_api_key VARCHAR(255),
    sms_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_gateway VARCHAR(50) NOT NULL DEFAULT 'Fast2SMS Enterprise',
    gst_einvoice_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    gst_portal_username VARCHAR(100),
    eway_bill_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. SHOP SETTINGS (Store Config & Invoicing Profile)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop_settings (
    tenant_id VARCHAR(50) PRIMARY KEY REFERENCES client_tenants(id) ON DELETE CASCADE,
    shop_name VARCHAR(255) NOT NULL,
    tagline VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    gstin VARCHAR(50),
    pan VARCHAR(50),
    fssai VARCHAR(50),
    theme VARCHAR(20) NOT NULL DEFAULT 'light',
    role VARCHAR(20) NOT NULL DEFAULT 'owner',
    default_payment_mode VARCHAR(50) NOT NULL DEFAULT 'Cash',
    low_stock_threshold INT NOT NULL DEFAULT 5,
    upi_id VARCHAR(100),
    bank_name VARCHAR(150),
    account_number VARCHAR(100),
    ifsc VARCHAR(50),
    branch VARCHAR(100),
    receipt_footer_message TEXT,
    auto_round_off BOOLEAN NOT NULL DEFAULT TRUE,
    font_size_scale VARCHAR(20) NOT NULL DEFAULT 'normal',
    high_contrast BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE shop_settings ALTER COLUMN city DROP NOT NULL;
ALTER TABLE shop_settings ALTER COLUMN state DROP NOT NULL;
ALTER TABLE shop_settings ALTER COLUMN pincode DROP NOT NULL;
ALTER TABLE shop_settings ALTER COLUMN address DROP NOT NULL;
ALTER TABLE shop_settings ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE shop_settings ALTER COLUMN email DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 7. INVENTORY ITEMS (Catalog, Stock, Batches, Units)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    regional_name VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    barcode VARCHAR(100),
    unit VARCHAR(20) NOT NULL DEFAULT 'pc',
    sub_unit VARCHAR(20) NOT NULL DEFAULT 'none',
    sub_units_per_unit NUMERIC(10, 4) NOT NULL DEFAULT 1,
    sub_unit_name VARCHAR(50),
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    mrp NUMERIC(12, 2),
    stock NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    reorder_level INT NOT NULL DEFAULT 5,
    hsn VARCHAR(50),
    gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    batch_number VARCHAR(100),
    expiry_date DATE,
    shelf_location VARCHAR(100),
    is_loose_item BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_tenant ON items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_items_barcode ON items(tenant_id, barcode);
CREATE INDEX IF NOT EXISTS idx_items_sku ON items(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(tenant_id, category);

-- -----------------------------------------------------------------------------
-- 8. COMPOSITE FESTIVAL KITS (Combos & Recipes)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kits (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    regional_name VARCHAR(255),
    festival_tag VARCHAR(100),
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kit_items (
    id SERIAL PRIMARY KEY,
    kit_id VARCHAR(50) NOT NULL REFERENCES kits(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    qty NUMERIC(10, 4) NOT NULL DEFAULT 1.0000,
    unit VARCHAR(20) NOT NULL DEFAULT 'pc'
);

CREATE INDEX IF NOT EXISTS idx_kits_tenant ON kits(tenant_id);

-- -----------------------------------------------------------------------------
-- 9. CUSTOMERS & CREDIT LEDGER
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    company_name VARCHAR(255),
    gstin VARCHAR(50),
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    due_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    -- Dual Entity flag
    is_also_vendor BOOLEAN NOT NULL DEFAULT FALSE,
    linked_supplier_id VARCHAR(50),
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(tenant_id, phone);

-- -----------------------------------------------------------------------------
-- 10. SUPPLIERS & VENDORS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    gstin VARCHAR(50),
    bank_account_number VARCHAR(100),
    bank_ifsc VARCHAR(50),
    bank_name VARCHAR(150),
    upi_id VARCHAR(100),
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    -- Dual Entity flag
    is_also_customer BOOLEAN NOT NULL DEFAULT FALSE,
    linked_customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- -----------------------------------------------------------------------------
-- 11. PURCHASE ORDERS & INWARDING
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    po_number VARCHAR(100) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    received_date DATE,
    status po_status_enum NOT NULL DEFAULT 'Draft',
    stock_inwarded BOOLEAN NOT NULL DEFAULT FALSE,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Due', -- 'Paid', 'Due', 'Partial'
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    due_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Credit',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
    id SERIAL PRIMARY KEY,
    po_id VARCHAR(50) NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    qty NUMERIC(10, 4) NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_po_tenant ON purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);

-- -----------------------------------------------------------------------------
-- 12. VENDOR PAYMENTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vendor_payments (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    payment_number VARCHAR(100) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    po_id VARCHAR(50) REFERENCES purchase_orders(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    note TEXT,
    recorded_by VARCHAR(100) DEFAULT 'Store Administrator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 13. PURCHASE RETURNS & DEBIT NOTES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS purchase_returns (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    return_number VARCHAR(100) NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Approved',
    notes TEXT,
    refund_mode VARCHAR(50) NOT NULL DEFAULT 'Deduct from Due',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_return_lines (
    id SERIAL PRIMARY KEY,
    return_id VARCHAR(50) NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    qty NUMERIC(10, 4) NOT NULL,
    cost_price NUMERIC(12, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    reason VARCHAR(100) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 14. CONTRA OFFSETS (Dual-Entity Receivable vs Payable Settlement)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contra_offsets (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    offset_number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    supplier_id VARCHAR(50) NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_name VARCHAR(255) NOT NULL,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    offset_amount NUMERIC(12, 2) NOT NULL,
    note TEXT,
    recorded_by VARCHAR(100) DEFAULT 'Store Administrator',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 15. POS BILLS & INVOICES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bills (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    bill_number VARCHAR(100) NOT NULL,
    date TIMESTAMPTZ NOT NULL,
    customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    payment_mode payment_mode_enum NOT NULL DEFAULT 'Cash',
    split_details JSONB,
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    round_off NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    paid NUMERIC(12, 2) NOT NULL,
    due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cashier_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bill_lines (
    id SERIAL PRIMARY KEY,
    bill_id VARCHAR(50) NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    qty NUMERIC(10, 4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    rate NUMERIC(12, 2) NOT NULL,
    gst_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    item_type VARCHAR(50) DEFAULT 'item'
);

CREATE INDEX IF NOT EXISTS idx_bills_tenant ON bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_id);

-- -----------------------------------------------------------------------------
-- 16. B2B SALES ORDERS & LOGISTICS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_orders (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    so_number VARCHAR(100) NOT NULL,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    date DATE NOT NULL,
    expected_delivery_date DATE,
    payment_terms VARCHAR(100),
    delivery_method VARCHAR(100),
    salesperson VARCHAR(100),
    subtotal NUMERIC(12, 2) NOT NULL,
    discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    adjustment NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    customer_notes TEXT,
    terms TEXT,
    status so_status_enum NOT NULL DEFAULT 'Confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_order_lines (
    id SERIAL PRIMARY KEY,
    so_id VARCHAR(50) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
    item_name VARCHAR(255) NOT NULL,
    qty NUMERIC(10, 4) NOT NULL,
    rate NUMERIC(12, 2) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS packages (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    package_number VARCHAR(100) NOT NULL,
    sales_order_id VARCHAR(50) NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    so_number VARCHAR(100) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Not Shipped',
    carrier VARCHAR(100) NOT NULL,
    tracking_number VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_challans (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    challan_number VARCHAR(100) NOT NULL,
    customer_id VARCHAR(50) NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    delivery_address TEXT,
    date DATE NOT NULL,
    reference_number VARCHAR(100),
    challan_type VARCHAR(100) NOT NULL,
    transporter_name VARCHAR(100),
    vehicle_number VARCHAR(100),
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS transporter_name VARCHAR(100);
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);
ALTER TABLE delivery_challans ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS due_amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending';
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0.00;

-- -----------------------------------------------------------------------------
-- 17. CASH REGISTER (Shifts, Daily Closing, Petty Cash)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_shifts (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    opening_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cash_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    expected_closing_cash NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    actual_closing_cash NUMERIC(12, 2),
    discrepancy NUMERIC(12, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- 'Open', 'Closed'
    notes TEXT
);

CREATE TABLE IF NOT EXISTS cash_expenses (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    note TEXT NOT NULL,
    recorded_by VARCHAR(100) NOT NULL DEFAULT 'Store Staff'
);

CREATE INDEX IF NOT EXISTS idx_cash_shifts_tenant ON cash_shifts(tenant_id);

-- -----------------------------------------------------------------------------
-- 18. STOCK AUDIT LOGS (Immutable Movement Ledger)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_logs (
    id VARCHAR(50) PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL REFERENCES client_tenants(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    item_id VARCHAR(50) NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    qty_change NUMERIC(10, 4) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    reason stock_reason_enum NOT NULL,
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_stock_logs_item ON stock_logs(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_logs_tenant ON stock_logs(tenant_id);

-- -----------------------------------------------------------------------------
-- 19. IDEMPOTENT PRODUCTION COMPATIBILITY MIGRATIONS
-- -----------------------------------------------------------------------------
ALTER TABLE items ADD COLUMN IF NOT EXISTS name_hi VARCHAR(255);
ALTER TABLE items ADD COLUMN IF NOT EXISTS name_te VARCHAR(255);
ALTER TABLE items ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
ALTER TABLE items ADD COLUMN IF NOT EXISTS min_stock_alert INT DEFAULT 5;
ALTER TABLE items ADD COLUMN IF NOT EXISTS rack_location VARCHAR(100);
ALTER TABLE items ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE items ALTER COLUMN sub_unit DROP NOT NULL;
ALTER TABLE items ALTER COLUMN sub_units_per_unit DROP NOT NULL;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(150);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance_due NUMERIC(12, 2) DEFAULT 0.00;

ALTER TABLE bills ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS gst NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE bill_lines DROP CONSTRAINT IF EXISTS bill_lines_item_id_fkey;
ALTER TABLE bill_lines ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE sales_order_lines DROP CONSTRAINT IF EXISTS sales_order_lines_item_id_fkey;
ALTER TABLE sales_order_lines ALTER COLUMN item_id DROP NOT NULL;

ALTER TABLE purchase_order_lines DROP CONSTRAINT IF EXISTS purchase_order_lines_item_id_fkey;
ALTER TABLE purchase_order_lines ALTER COLUMN item_id DROP NOT NULL;
