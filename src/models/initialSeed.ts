import {
  User,
  ClientTenant,
  SoftwareLicenseSale,
  PlatformIntegrationSettings,
  Item,
  Kit,
  Customer,
  Supplier,
  PurchaseOrder,
  VendorPayment,
  PurchaseReturn,
  ContraOffset,
  Bill,
  SalesOrder,
  PackageRecord,
  DeliveryChallan,
  CashRegisterShift,
  CashExpense,
  ShopSettings,
  StockLog,
  FestivalPlan,
} from '../types/index.js';
import bcrypt from 'bcryptjs';

// Pre-hashed passwords for seed: Owner@1234, Staff@1234
const OWNER_HASH = bcrypt.hashSync('Owner@1234', 10);
const STAFF_HASH = bcrypt.hashSync('Staff@1234', 10);

// ============================================================================
// 1. SYSTEM USERS & CREDENTIALS (TWO OWNER ACCOUNTS FOR TWO TENANTS)
// ============================================================================
export const SEED_USERS: User[] = [
  {
    id: 'owner-retail-01',
    name: 'Retail Store Owner',
    email: 'retail.owner@store.com',
    passwordHash: OWNER_HASH,
    role: 'owner',
    tenantId: 'TENANT-RETAIL-01',
    phone: '+91 98765 11111',
    designation: 'Store Owner',
    isActive: true,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'owner-pooja-02',
    name: 'Pooja Store Owner',
    email: 'pooja.owner@store.com',
    passwordHash: OWNER_HASH,
    role: 'owner',
    tenantId: 'TENANT-POOJA-02',
    phone: '+91 98765 22222',
    designation: 'Store Owner',
    isActive: true,
    status: 'active',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// ============================================================================
// 2. CLIENT TENANTS (TWO ISOLATED STORE TENANTS)
// ============================================================================
export const SEED_CLIENTS: ClientTenant[] = [
  {
    id: 'TENANT-RETAIL-01',
    businessName: 'City Retail Superstore',
    ownerName: 'Retail Store Owner',
    email: 'retail.owner@store.com',
    phone: '+91 98765 11111',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'Plot 45, Main Road, Hitec City',
    businessType: 'retail_general',
    licenseTier: 'enterprise',
    billingFrequency: 'annual',
    monthlyFee: 2999,
    status: 'active',
    startDate: '2026-01-01',
    renewalDate: '2027-01-01',
    branchesCount: 1,
    userCount: 1,
    skuCount: 0,
    credentials: {
      username: 'retail.owner@store.com',
      tenantCode: 'RETAIL01',
      loginUrl: '/login',
      status: 'provisioned',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'TENANT-POOJA-02',
    businessName: 'Vedic Pooja & Spiritual Store',
    ownerName: 'Pooja Store Owner',
    email: 'pooja.owner@store.com',
    phone: '+91 98765 22222',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'Shop 12, Temple Road, Kukatpally',
    businessType: 'pooja',
    licenseTier: 'enterprise',
    billingFrequency: 'annual',
    monthlyFee: 2999,
    status: 'active',
    startDate: '2026-01-01',
    renewalDate: '2027-01-01',
    branchesCount: 1,
    userCount: 1,
    skuCount: 0,
    credentials: {
      username: 'pooja.owner@store.com',
      tenantCode: 'POOJA02',
      loginUrl: '/login',
      status: 'provisioned',
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

// ============================================================================
// 3. SOFTWARE LICENSE SALES (CLEAN 0-RECORD STATE)
// ============================================================================
export const SEED_LICENSE_SALES: SoftwareLicenseSale[] = [];

// ============================================================================
// 4. PLATFORM INTEGRATIONS (DEFAULT HARDWARE & PRINTER PRESETS)
// ============================================================================
export const SEED_PLATFORM_INTEGRATIONS: PlatformIntegrationSettings = {
  thermalPrinterEnabled: true,
  printerPaperWidth: '80mm',
  printerConnectionType: 'USB',
  printerName: 'TVS RP 3200 Plus / EPSON TM-T82X 80mm',
  autoCutReceipt: true,
  kickCashDrawer: true,
  weighingScaleEnabled: true,
  weighingScalePort: 'COM3',
  barcodePrinterModel: 'TVS LP 46 Neo / TSC TE244 Direct Thermal',
  dynamicUpiEnabled: true,
  storeUpiVpa: 'sriganesh.store@icici',
  soundboxEnabled: true,
  soundboxProvider: 'PhonePe',
  soundboxDeviceId: 'PHNP-SND-984210',
  edcTerminalEnabled: true,
  edcTerminalModel: 'PineLabs',
  razorpayEnabled: true,
  razorpayKeyId: 'rzp_live_venixa984210',
  whatsappEnabled: true,
  whatsappSenderNumber: '+919876543210',
  whatsappApiToken: 'WA_CLOUD_API_PROD_TOKEN',
  sendPdfOnCheckout: true,
  lowStockAlertWhatsapp: true,
  smsGatewayEnabled: true,
  smsSenderId: 'VENIXA',
  smsApiKey: 'SMS_GATEWAY_PROD_KEY_2026',
  gstVerificationEnabled: true,
  gstPortalApiKey: 'GSTN_NIC_API_TOKEN_PROD',
  ewayBillEnabled: true,
  nicGspUsername: 'VENIXA_GSP_36AABCS',
  eInvoiceAutoGenerate: true,
  productName: 'Venixa Enterprise Cloud ERP',
  productVersion: 'v2.8.4',
  supportEmail: 'support@venixa.com',
  supportPhone: '+91 40 6824 1000',
  portalDomain: 'erp.venixa.com',
  backupCloudEnabled: true,
  backupFrequency: 'daily',
  lastBackupAt: '2026-10-26T03:00:00Z',
  maintenanceMode: false,
};

// ============================================================================
// 5. SHOP SETTINGS FOR CLI-1001
// ============================================================================
export const SEED_SHOP_SETTINGS: ShopSettings = {
  tenantId: 'CLI-1001',
  shopName: 'Retail & Inventory Store',
  shopNameHi: 'वेनिक्सा स्टोर',
  shopNameTe: 'వెనిక్సా స్టోర్',
  tagline: 'Multi-category retail and inventory management platform',
  phone: '+91 98765 43210',
  address: 'Main Commercial Market Complex, Central Road',
  upiId: 'store@upi',
  gstin: '36AABCS1234D1ZP',
  businessType: 'retail_general',
  role: 'owner',
  theme: 'light',
  receiptType: '80mm',
  fontSizeScale: 'normal',
  highContrast: false,
  enableVoiceAssist: false,
  enableSoundEffects: true,
  userName: 'Store Administrator',
  userEmail: 'owner@sriganesh.com',
  userPhone: '+91 98765 43210',
  userDesignation: 'General Manager',
};

// ============================================================================
// 6. ALL OPERATIONAL COLLECTIONS (PURGED & EMPTY - CLEAN PRODUCTION SLATE)
// ============================================================================
export const SEED_SUPPLIERS: Supplier[] = [];
export const SEED_CUSTOMERS: Customer[] = [];
export const SEED_ITEMS: Item[] = [];
export const SEED_KITS: Kit[] = [];
export const SEED_PURCHASE_ORDERS: PurchaseOrder[] = [];
export const SEED_VENDOR_PAYMENTS: VendorPayment[] = [];
export const SEED_PURCHASE_RETURNS: PurchaseReturn[] = [];
export const SEED_CONTRA_OFFSETS: ContraOffset[] = [];
export const SEED_BILLS: Bill[] = [];
export const SEED_SALES_ORDERS: SalesOrder[] = [];
export const SEED_PACKAGES: PackageRecord[] = [];
export const SEED_CHALLANS: DeliveryChallan[] = [];
export const SEED_CASH_SHIFT: CashRegisterShift | null = null;
export const SEED_CASH_EXPENSES: CashExpense[] = [];
export const SEED_STOCK_LOGS: StockLog[] = [];
export const SEED_FESTIVALS: FestivalPlan[] = [];
