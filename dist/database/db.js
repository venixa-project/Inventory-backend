import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';
import { SEED_USERS, SEED_CLIENTS, SEED_LICENSE_SALES, SEED_PLATFORM_INTEGRATIONS, SEED_SHOP_SETTINGS, SEED_ITEMS, SEED_KITS, SEED_CUSTOMERS, SEED_SUPPLIERS, SEED_PURCHASE_ORDERS, SEED_VENDOR_PAYMENTS, SEED_PURCHASE_RETURNS, SEED_CONTRA_OFFSETS, SEED_BILLS, SEED_SALES_ORDERS, SEED_PACKAGES, SEED_CHALLANS, SEED_CASH_SHIFT, SEED_CASH_EXPENSES, SEED_STOCK_LOGS, } from './initialSeed.js';
class DatabaseService {
    data;
    filePath;
    isDirty = false;
    constructor() {
        this.filePath = path.resolve(process.cwd(), ENV.DB_STORAGE_PATH);
        this.data = this.loadDatabase();
    }
    getDefaultData() {
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
            cashShifts: [{ ...SEED_CASH_SHIFT }],
            cashExpenses: [...SEED_CASH_EXPENSES],
            stockLogs: [...SEED_STOCK_LOGS],
        };
    }
    loadDatabase() {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            if (fs.existsSync(this.filePath)) {
                const fileContent = fs.readFileSync(this.filePath, 'utf-8');
                const parsed = JSON.parse(fileContent);
                // Ensure all collections exist
                const defaultData = this.getDefaultData();
                return { ...defaultData, ...parsed };
            }
        }
        catch (err) {
            console.warn('[Database] Failed to read db file, initializing with fresh seed data', err);
        }
        const initial = this.getDefaultData();
        this.saveToDisk(initial);
        return initial;
    }
    saveToDisk(dataToSave) {
        try {
            const toWrite = dataToSave || this.data;
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.filePath, JSON.stringify(toWrite, null, 2), 'utf-8');
            this.isDirty = false;
        }
        catch (err) {
            console.error('[Database] Error saving to disk:', err);
        }
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
    }
    resetToDefault() {
        this.data = this.getDefaultData();
        this.saveToDisk();
    }
}
export const db = new DatabaseService();
