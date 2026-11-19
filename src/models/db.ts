import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import { isPostgresActive } from './postgres.js';
import { PostgresSync } from './postgresSync.js';
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
import {
  SEED_USERS,
  SEED_CLIENTS,
  SEED_LICENSE_SALES,
  SEED_PLATFORM_INTEGRATIONS,
  SEED_SHOP_SETTINGS,
  SEED_ITEMS,
  SEED_KITS,
  SEED_CUSTOMERS,
  SEED_SUPPLIERS,
  SEED_PURCHASE_ORDERS,
  SEED_VENDOR_PAYMENTS,
  SEED_PURCHASE_RETURNS,
  SEED_CONTRA_OFFSETS,
  SEED_BILLS,
  SEED_SALES_ORDERS,
  SEED_PACKAGES,
  SEED_CHALLANS,
  SEED_CASH_SHIFT,
  SEED_CASH_EXPENSES,
  SEED_STOCK_LOGS,
  SEED_FESTIVALS,
} from './initialSeed.js';

export interface DatabaseSchema {
  users: User[];
  clients: ClientTenant[];
  licenseSales: SoftwareLicenseSale[];
  platformIntegrations: PlatformIntegrationSettings;
  shopSettings: Record<string, ShopSettings>; // Keyed by tenantId
  items: Item[];
  kits: Kit[];
  customers: Customer[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  vendorPayments: VendorPayment[];
  purchaseReturns: PurchaseReturn[];
  contraOffsets: ContraOffset[];
  bills: Bill[];
  salesOrders: SalesOrder[];
  packages: PackageRecord[];
  deliveryChallans: DeliveryChallan[];
  cashShifts: CashRegisterShift[];
  cashExpenses: CashExpense[];
  stockLogs: StockLog[];
  festivals: FestivalPlan[];
  bankSettlements: any[];
}

class DatabaseService {
  private data: DatabaseSchema;
  private filePath: string;
  private isDirty = false;

  constructor() {
    this.filePath = path.resolve(process.cwd(), ENV.DB_STORAGE_PATH);
    this.data = this.loadDatabase();
  }

  private getCandidatePaths(): string[] {
    const paths = [
      this.filePath,
      path.resolve(process.cwd(), 'backend', 'data', 'db.json'),
      path.resolve(process.cwd(), 'data', 'db.json'),
      path.resolve(process.cwd(), '..', 'backend', 'data', 'db.json'),
      path.resolve(process.cwd(), '..', 'data', 'db.json'),
    ];
    return Array.from(new Set(paths));
  }

  private getDefaultData(): DatabaseSchema {
    return {
      users: [...SEED_USERS],
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
    };
  }

  private loadDatabase(): DatabaseSchema {
    const candidates = this.getCandidatePaths();
    // Prefer the candidate file that exists and has the largest data size (e.g. contains stored logos & customizations)
    let bestPath = '';
    let bestSize = -1;

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        try {
          const stats = fs.statSync(p);
          if (stats.size > bestSize) {
            bestSize = stats.size;
            bestPath = p;
          }
        } catch {}
      }
    }

    if (bestPath) {
      try {
        const fileContent = fs.readFileSync(bestPath, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.filePath = bestPath;
        const defaultData = this.getDefaultData();
        return { ...defaultData, ...parsed };
      } catch (err) {
        console.warn(`[Database] Failed reading ${bestPath}, initializing default:`, err);
      }
    }

    const initial = this.getDefaultData();
    this.saveToDisk(initial);
    return initial;
  }

  private saveToDisk(dataToSave?: DatabaseSchema) {
    try {
      const toWrite = dataToSave || this.data;
      const candidates = this.getCandidatePaths();

      for (const targetPath of candidates) {
        try {
          const dir = path.dirname(targetPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(targetPath, JSON.stringify(toWrite, null, 2), 'utf-8');
        } catch (err) {
          console.error(`[Database] Error saving to ${targetPath}:`, err);
        }
      }
      this.isDirty = false;
    } catch (err) {
      console.error('[Database] Error saving to disk:', err);
    }
  }

  public persist() {
    this.isDirty = true;
    this.saveToDisk();
  }

  // Generic Getters
  public get<K extends keyof DatabaseSchema>(key: K): DatabaseSchema[K] {
    return this.data[key];
  }

  public set<K extends keyof DatabaseSchema>(key: K, value: DatabaseSchema[K]) {
    this.data[key] = value;
    this.persist();

    // Asynchronously reflect latest change in PostgreSQL
    if (isPostgresActive()) {
      if (Array.isArray(value) && value.length > 0) {
        const latest = value[value.length - 1];
        if (key === 'items') PostgresSync.syncItem(latest);
        else if (key === 'bills') PostgresSync.syncBill(latest);
        else if (key === 'salesOrders') PostgresSync.syncSalesOrder(latest);
        else if (key === 'deliveryChallans') PostgresSync.syncDeliveryChallan(latest);
        else if (key === 'stockLogs') PostgresSync.syncStockLog(latest);
      } else if (key === 'shopSettings' && typeof value === 'object' && value !== null) {
        const tenantIds = Object.keys(value);
        if (tenantIds.length > 0) {
          const lastTenant = tenantIds[tenantIds.length - 1];
          PostgresSync.syncShopSettings((value as any)[lastTenant]);
        }
      }
    }
  }

  public resetToDefault() {
    this.data = this.getDefaultData();
    this.saveToDisk();
  }
}

export const db = new DatabaseService();
