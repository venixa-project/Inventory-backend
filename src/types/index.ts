export type UserRole = 'product_admin' | 'owner' | 'staff';

export type BusinessType =
  | 'pooja'
  | 'pharmacy'
  | 'grocery'
  | 'hardware'
  | 'apparel'
  | 'retail_general';

export type UnitType =
  | 'pc'
  | 'kg'
  | 'g'
  | 'L'
  | 'ml'
  | 'dozen'
  | 'box'
  | 'strip'
  | 'bottle'
  | 'packet'
  | 'meter'
  | 'set'
  | 'lb'
  | 'oz'
  | 'gal'
  | 'fl_oz'
  | 'pt'
  | 'ft'
  | 'yd';

export type SubUnitType = 'g' | 'ml' | 'oz' | 'fl_oz' | 'tablet' | 'capsule' | 'none';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  roles?: UserRole[];
  tenantId?: string; // Nullable for product_admin
  phone?: string;
  designation?: string;
  isActive: boolean;
  status?: 'active' | 'inactive' | 'pending_approval' | 'blocked';
  username?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  roleName?: string;
  branches?: string[];
  branchesAccess?: string;
  apps?: {
    pos: boolean;
    mobile: boolean;
    adminPortal: boolean;
    inward: boolean;
  };
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleRecord {
  id: string;
  name: string;
  description?: string;
  tenantId?: string;
  userCount?: number;
  createdAt: string;
  updatedAt: string;
  permissions: Record<string, boolean>;
}

export interface BranchRecord {
  id: string;
  name: string;
  code: string;
  group: string;
  city: string;
  state?: string;
  address?: string;
  isActive: boolean;
}

export interface ClientCredentials {
  username: string;
  temporaryPassword?: string;
  tenantCode: string;
  loginUrl: string;
  status: 'provisioned' | 'pending';
  lastLogin?: string;
  passwordLastReset?: string;
}

export type LicenseTier = 'starter' | 'professional' | 'enterprise';
export type ClientStatus = 'active' | 'trial' | 'suspended' | 'expired' | 'pending' | 'blocked';
export type BillingFrequency = 'monthly' | 'quarterly' | 'annual';

export interface ClientTenant {
  id: string; // e.g. CLI-1001
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  address?: string;
  gstin?: string;
  businessType: BusinessType;
  licenseTier: LicenseTier;
  billingFrequency: BillingFrequency;
  monthlyFee: number;
  status: ClientStatus;
  startDate: string;
  renewalDate: string;
  branchesCount: number;
  userCount: number;
  skuCount: number;
  credentials: ClientCredentials;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SoftwareLicenseSale {
  id: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  date: string;
  plan: LicenseTier;
  period: string;
  amount: number;
  paymentMethod: 'UPI' | 'Razorpay' | 'Bank Transfer' | 'Cash';
  status: 'paid' | 'pending' | 'failed';
  receiptPdfUrl?: string;
  createdAt: string;
}

export interface PlatformIntegrationSettings {
  // 1. POS Hardware & Thermal Printers
  thermalPrinterEnabled: boolean;
  printerPaperWidth: '58mm' | '80mm';
  printerConnectionType: 'USB' | 'Bluetooth' | 'LAN/WiFi';
  printerName: string;
  autoCutReceipt: boolean;
  kickCashDrawer: boolean;
  weighingScaleEnabled: boolean;
  weighingScalePort: string;
  barcodePrinterModel: string;

  // 2. UPI QR & Soundbox Payments
  dynamicUpiEnabled: boolean;
  storeUpiVpa: string;
  soundboxEnabled: boolean;
  soundboxProvider: 'Paytm' | 'PhonePe' | 'BharatPe';
  soundboxDeviceId: string;
  edcTerminalEnabled: boolean;
  edcTerminalModel: 'PineLabs' | 'MSwipe' | 'Mosambee';
  razorpayEnabled?: boolean;
  razorpayKeyId?: string;

  // 3. WhatsApp & SMS Digital Invoices
  whatsappEnabled: boolean;
  whatsappSenderNumber: string;
  whatsappApiToken: string;
  sendPdfOnCheckout: boolean;
  lowStockAlertWhatsapp: boolean;
  smsGatewayEnabled: boolean;
  smsSenderId: string;
  smsApiKey: string;

  // 4. GST Portal & E-Way Bill (Govt Compliance)
  gstVerificationEnabled: boolean;
  gstPortalApiKey: string;
  ewayBillEnabled: boolean;
  nicGspUsername: string;
  eInvoiceAutoGenerate: boolean;

  // Legacy/Product admin general fields
  productName?: string;
  productVersion?: string;
  supportEmail?: string;
  supportPhone?: string;
  portalDomain?: string;
  backupCloudEnabled?: boolean;
  backupFrequency?: 'daily' | 'weekly';
  lastBackupAt?: string;
  announcementNotice?: string;
  maintenanceMode?: boolean;
}

export interface Item {
  id: string;
  tenantId: string;
  // Identification & Classification
  name: string;
  nameHi?: string;
  nameTe?: string;
  productDescription?: string;
  itemType?: 'Goods' | 'Service' | 'Raw Material' | 'Finished Goods';
  status?: 'Active' | 'Discontinued' | 'Out of Stock';
  sku?: string;
  barcode?: string;
  category: string;
  brand?: string;
  manufacturer?: string;
  countryOfOrigin?: string;
  genericName?: string;
  rackLocation?: string;
  isPrescriptionRequired?: boolean;
  hsnCode?: string;

  // Commercial, Multi-Tier Pricing & Taxation
  mrp?: number;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  minimumSellingPrice?: number;
  discountPercent?: number;
  gstPercent: number;
  cessPercent?: number;
  taxPreference?: 'Taxable' | 'Non-Taxable' | 'Exempt' | 'Nil Rated';

  // Units & Measurement
  unit: UnitType;
  subUnit: SubUnitType;
  subUnitsPerUnit: number;

  // Inventory Levels & Procurement Automation
  stock: number;
  reorderLevel: number;
  reorderQuantity?: number;
  maxStockLevel?: number;
  minOrderQuantity?: number;
  leadTimeDays?: number;
  preferredVendorId?: string;
  preferredSupplierName?: string;

  // Logistics & Traceability
  salesAccount?: string;
  costAccount?: string;
  returnable?: boolean;
  dimensions?: string;
  weight?: string;
  batchNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  festivalTags: string[];
  country?: string;

  // 1. Medical & Pharmacy Specialization (English)
  dosageStrength?: string;
  drugSchedule?: 'OTC' | 'Schedule H' | 'Schedule H1' | 'Schedule X' | 'Ayurvedic' | 'Narcotic' | 'General';
  drugLicenseNo?: string;
  packSize?: string;
  storageCondition?: 'Room Temperature' | 'Cool & Dry (15-25°C)' | 'Refrigerated (2-8°C)' | 'Deep Freeze (-20°C)' | 'Protect from Direct Sunlight';

  // 2. Pooja & Spiritual Specialization (English)
  poojaPurpose?: string;
  materialForm?: 'Solid' | 'Powder' | 'Liquid' | 'Paste' | 'Leaves/Herbs' | 'Fabric/Cloth' | 'Brass/Metal' | 'Wood' | 'General';
  purityGrade?: string;
  fragranceType?: string;
  packQuantity?: string;

  // 3. Electronics, Appliances & Hardware Specialization
  hasSerialNumberTracking?: boolean;
  warrantyMonths?: number;
  modelNumber?: string;
  voltagePowerRating?: string;

  // 4. Food, FMCG & Grocery Specialization
  foodPreference?: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan' | 'Contains Egg' | 'Not Applicable';
  fssaiLicenseNo?: string;
  bestBeforeDays?: number;
  allergens?: string;
  organicCertified?: boolean;

  // 5. Fashion, Apparel & Lifestyle Specialization
  sizeVariant?: string;
  colorVariant?: string;
  fabricMaterial?: string;
  genderCategory?: 'Men' | 'Women' | 'Kids' | 'Unisex';

  createdAt: string;
  updatedAt: string;
}

export interface KitComponent {
  itemId: string;
  qty: number;
  displayUnit?: string;
}

export interface Kit {
  id: string;
  tenantId: string;
  name: string;
  nameHi?: string;
  nameTe?: string;
  description?: string;
  sellingPrice: number;
  components: KitComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  dueAmount: number;
  createdAt: string;
  gstin?: string;
  address?: string;
  city?: string;
  pincode?: string;
  country?: string;
  creditLimit?: number;
  isAlsoVendor?: boolean;
  linkedSupplierId?: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  companyName?: string;
  categorySpecialty?: string;
  gstin?: string;
  email?: string;
  address?: string;
  country?: string;
  city?: string;
  pincode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  paymentTerms?: string;
  creditLimit?: number;
  openingBalance?: number;
  isAlsoCustomer?: boolean;
  linkedCustomerId?: string;
  isInternalUser?: boolean;
  linkedUserId?: string;
  userRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface POLine {
  itemId: string;
  qty: number;
  subQty?: number;
  costPrice?: number;
  taxPercent?: number;
  taxAmount?: number;
  totalCost?: number;
}

export interface PurchaseOrder {
  id: string;
  tenantId: string;
  poNumber: string;
  supplierId: string;
  lines: POLine[];
  status: 'Draft' | 'Sent' | 'Received';
  date: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  country?: string;
  paymentTerms?: string;
  paymentStatus?: 'Paid' | 'Due' | 'Partial';
  paidAmount?: number;
  dueAmount?: number;
  paymentMode?: string;
  invoiceNumber?: string;
  stockInwarded?: boolean;
  shippingCost?: number;
  taxAmount?: number;
  subtotal?: number;
  totalAmount?: number;
  notes?: string;
  createdAt: string;
}

export interface VendorPayment {
  id: string;
  tenantId: string;
  paymentNumber: string;
  supplierId: string;
  supplierName: string;
  poId?: string;
  date: string;
  amount: number;
  paymentMode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Contra';
  referenceNumber?: string;
  note?: string;
  recordedBy?: string;
  createdAt: string;
}

export interface PurchaseReturnLine {
  itemId: string;
  itemName: string;
  qty: number;
  unit: string;
  costPrice: number;
  totalAmount: number;
  reason: 'damaged' | 'expired' | 'wrong_item' | 'quality_rejection' | 'excess_stock';
}

export interface PurchaseReturn {
  id: string;
  tenantId: string;
  returnNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  lines: PurchaseReturnLine[];
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Completed';
  notes?: string;
  refundMode?: 'Deduct from Due' | 'Cash Refund' | 'Bank Refund';
  createdAt: string;
}

export interface ContraOffset {
  id: string;
  tenantId: string;
  offsetNumber: string;
  date: string;
  supplierId: string;
  supplierName: string;
  customerId: string;
  customerName: string;
  offsetAmount: number;
  note?: string;
  recordedBy?: string;
  createdAt: string;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Credit' | 'Split';

export interface CartItem extends BillLine {
  isSubUnit?: boolean;
}

export interface BillLine {
  id: string;
  type: 'item' | 'kit';
  referenceId: string;
  name: string;
  nameHi?: string;
  nameTe?: string;
  barcode?: string;
  batchNumber?: string;
  unit: string;
  qty: number;
  mainUnitEquivalentQty: number;
  unitPrice: number;
  totalPrice: number;
  gstPercent: number;
  gstAmount: number;
}

export interface SplitPaymentDetail {
  cash: number;
  upi: number;
  card: number;
  credit: number;
}

export interface Bill {
  id: string;
  tenantId: string;
  billNumber: string;
  date: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  lines: BillLine[];
  subtotal: number;
  gst: number;
  discount?: number;
  total: number;
  roundOff: number;
  paid: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Credit' | 'Split';
  splitDetails?: SplitPaymentDetail;
  due: number;
  notes?: string;
  cashTendered?: number;
  changeReturned?: number;
  upiReference?: string;
  settlementDetails?: any;
  createdAt: string;
}

export interface SalesOrder {
  id: string;
  tenantId: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  referenceNumber?: string;
  date: string;
  expectedDeliveryDate?: string;
  paymentTerms: string;
  deliveryMethod?: string;
  salesperson?: string;
  lines: Array<{
    itemId: string;
    itemName: string;
    qty: number;
    unit?: string;
    hsnCode?: string;
    rate: number;
    gstPercent?: number;
    gstAmount?: number;
    amount: number;
  }>;
  subtotal: number;
  taxAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
  adjustment?: number;
  total: number;
  customerNotes?: string;
  terms?: string;
  status: 'Draft' | 'Confirmed' | 'Invoiced' | 'Packed' | 'Shipped' | 'Delivered';
  createdAt: string;
}

export interface PackageRecord {
  id: string;
  tenantId: string;
  packageNumber: string;
  salesOrderId: string;
  soNumber: string;
  customerName: string;
  date: string;
  status: 'Not Shipped' | 'Shipped' | 'Delivered';
  carrier?: string;
  trackingNumber?: string;
  createdAt: string;
}

export interface DeliveryChallan {
  id: string;
  tenantId: string;
  challanNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  deliveryAddress?: string;
  date: string;
  referenceNumber?: string;
  challanType: string;
  transporterName?: string;
  vehicleNumber?: string;
  notes?: string;
  lines: Array<{
    itemId: string;
    itemName: string;
    qty: number;
    unit?: string;
    hsnCode?: string;
    rate: number;
    amount: number;
  }>;
  total: number;
  status: 'Open' | 'Delivered';
  createdAt: string;
}

export interface StockLog {
  id: string;
  tenantId: string;
  date: string;
  itemId: string;
  itemName: string;
  qtyChange: number;
  unit: UnitType;
  reason: 'damage' | 'expired' | 'sample' | 'correction' | 'sale' | 'purchase' | 'manual_add' | 'return' | 'initial';
  referenceNumber?: string;
  account?: string;
  note?: string;
}

export interface CashExpense {
  id: string;
  tenantId: string;
  date: string;
  category: 'Tea/Refreshment' | 'Packaging' | 'Transport' | 'Utility/Repairs' | 'Salary/Advance' | 'Other';
  amount: number;
  note: string;
  recordedBy: string;
}

export interface CashRegisterShift {
  id: string;
  tenantId: string;
  date: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  cashSales: number;
  cashExpenses: number;
  expectedClosingCash: number;
  actualClosingCash?: number;
  discrepancy?: number;
  status: 'Open' | 'Closed';
  notes?: string;
}

export interface ShopSettings {
  tenantId: string;
  shopName: string;
  shopLogo?: string;
  shopNameHi?: string;
  shopNameTe?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userAvatar?: string;
  userDesignation?: string;
  userEmployeeId?: string;
  userAlternatePhone?: string;
  userCounterAssigned?: string;
  userShiftPreference?: string;
  userJoinedDate?: string;
  userQuickPin?: string;
  businessType: BusinessType;
  tagline: string;
  phone: string;
  address: string;
  upiId: string;
  upiPayeeName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankIfscCode?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountType?: 'Current' | 'Savings';
  gstin?: string;
  language?: string;
  role: UserRole;
  theme: 'light' | 'dark';
  receiptType: '58mm' | '80mm' | 'A4';
  fontSizeScale: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  enableVoiceAssist: boolean;
  enableSoundEffects: boolean;
  currencySymbol?: string;
  country?: string;
  hasSelectedDomain?: boolean;
}

export interface FestivalPlan {
  id: string;
  tenantId?: string;
  name: string;
  description?: string;
  nameHi?: string;
  nameTe?: string;
  approxDate?: string;
  panchangNote?: string;
  suggestedTags?: string[];
  startDate?: string;
  endDate?: string;
  prepStartDate?: string;
  salesPeakDate?: string;
  historicalCompareYear?: number;
  status?: 'draft' | 'active' | 'completed' | 'archived';
  warehouseId?: string;
  region?: string;
  selectedProductIds?: string[];
  bufferMultiplier?: number;
  customTargets?: Record<string, number>;
  scenario?: 'conservative' | 'expected' | 'optimistic';
}

export interface SeasonalForecastItem {
  itemId: string;
  name: string;
  sku: string;
  category: string;
  image?: string;
  previousFestivalSales: number;
  recent30DaySales: number;
  forecastedUnits: number;
  lowerBoundUnits: number;
  upperBoundUnits: number;
  currentStock: number;
  incomingStock: number;
  safetyStock: number;
  suggestedPurchaseQty: number;
  costPrice: number;
  sellingPrice: number;
  expectedRevenue: number;
  expectedGrossProfit: number;
  forecastConfidence: number;
  supplierName: string;
  leadTimeDays: number;
  recommendedOrderDate: string;
  demandGrowthPercent: number;
}

export interface DemandDriverBreakdown {
  driverName: string;
  impactDirection: 'positive' | 'negative' | 'neutral';
  percentageContribution: number;
  metricLabel: string;
  explanation: string;
}

export interface AiStrategicRecommendation {
  id: string;
  category: 'merchandising' | 'pricing' | 'bundling' | 'procurement' | 'outreach';
  title: string;
  metricHighlight?: string;
  description: string;
  impactLevel: 'High' | 'Medium' | 'Critical';
  targetProducts: string[];
  actionLabel?: string;
  actionPayload?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  meta?: Record<string, any>;
}

// -------------------------------------------------------------
// Sales Returns & Credit Notes
// -------------------------------------------------------------
export type ItemCondition = 'resaleable' | 'damaged';

export type SalesReturnReason =
  | 'Defective/Damaged'
  | 'Wrong Item Sent'
  | 'Customer Changed Mind'
  | 'Expired/Nearing Expiry'
  | 'Quality Not as Expected'
  | 'Other';

export type SalesReturnRefundMode =
  | 'Cash'
  | 'Khata Adjustment'
  | 'Store Credit'
  | 'UPI'
  | 'Bank Transfer';

export interface SalesReturnLine {
  id?: string;
  itemId: string;
  itemName: string;
  qty: number;
  unit: string;
  unitPrice: number;
  gstPercent: number;
  totalAmount: number;
  condition: ItemCondition;
  reason: SalesReturnReason;
  batchNumber?: string;
}

export interface SalesReturn {
  id: string;
  tenantId?: string;
  returnNumber: string;
  billId?: string;
  billNumber?: string;
  salesOrderId?: string;
  salesOrderNumber?: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  lines: SalesReturnLine[];
  subtotal: number;
  gst: number;
  totalAmount: number;
  refundMode: SalesReturnRefundMode;
  refundStatus: 'Completed' | 'Pending' | 'Store Credit Active';
  status: 'Completed' | 'Draft' | 'Approved' | 'Void';
  storeCreditVoucherCode?: string;
  notes?: string;
  processedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// Payment Requests (Internal UPI / QR Billing Settlement)
// -------------------------------------------------------------
export interface PaymentRequestItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

export interface InternalPaymentRequest {
  id: string;
  tenantId?: string;
  orderNumber: string;
  amount: number;
  userId: string;
  userName: string;
  userPhone?: string;
  userEmail?: string;
  userRole?: 'Customer' | 'Vendor' | 'Staff';
  senderName: string;
  vpa: string;
  payeeName: string;
  createdAt: string;
  status: 'Pending' | 'Paid' | 'Cancelled';
  paidAt?: string;
  utr?: string;
  items?: PaymentRequestItem[];
  subtotal?: number;
  tax?: number;
}

