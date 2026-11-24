import { db } from '../models/db.js';
import { ShopSettings, PlatformIntegrationSettings } from '../types/index.js';
import { SEED_SHOP_SETTINGS } from '../models/initialSeed.js';

export class SettingsService {
  public static getShopSettings(tenantId: string): ShopSettings {
    const allSettings = db.get('shopSettings') || {};
    if (!allSettings[tenantId]) {
      const client = (db.get('clients') || []).find((c) => c.id === tenantId);
      allSettings[tenantId] = {
        ...SEED_SHOP_SETTINGS,
        tenantId,
        ...(client?.businessName ? { shopName: client.businessName } : {}),
        ...(client?.phone ? { phone: client.phone } : {}),
        ...(client?.email ? { userEmail: client.email } : {}),
        ...(client?.businessType ? { businessType: client.businessType } : {}),
        hasSelectedDomain: true,
      };
      db.set('shopSettings', allSettings);
    }
    return allSettings[tenantId];
  }

  public static updateShopSettings(
    tenantId: string,
    updates: Partial<ShopSettings>,
    role?: string
  ): ShopSettings {
    const allSettings = db.get('shopSettings') || {};
    const current = this.getShopSettings(tenantId);

    // If counter staff, strictly disallow modifying banking, UPI QR, or store financial configuration
    // Only Store Owners ('owner') have permission to add or modify bank details and UPI destinations
    let sanitizedUpdates: Partial<ShopSettings> = updates;
    if (role === 'staff') {
      sanitizedUpdates = {
        theme: updates.theme,
        fontSizeScale: updates.fontSizeScale,
        highContrast: updates.highContrast,
        receiptType: updates.receiptType,
        enableSoundEffects: updates.enableSoundEffects,
        enableVoiceAssist: updates.enableVoiceAssist,
      };
    }

    const updated: ShopSettings = {
      ...current,
      ...sanitizedUpdates,
      tenantId,
      hasSelectedDomain: updates.hasSelectedDomain !== undefined ? updates.hasSelectedDomain : true,
    };
    allSettings[tenantId] = updated;
    db.set('shopSettings', allSettings);

    // Synchronize client tenant businessName in client registry if shopName was modified
    if (updated.shopName) {
      const clients = db.get('clients') || [];
      const tenant = clients.find((c) => c.id === tenantId);
      if (tenant && tenant.businessName !== updated.shopName) {
        tenant.businessName = updated.shopName;
        db.set('clients', clients);
      }
    }

    return updated;
  }

  public static getPlatformIntegrations(): PlatformIntegrationSettings {
    return db.get('platformIntegrations');
  }

  public static updatePlatformIntegrations(
    updates: Partial<PlatformIntegrationSettings>
  ): PlatformIntegrationSettings {
    const current = db.get('platformIntegrations');
    const updated = {
      ...current,
      ...updates,
    };
    db.set('platformIntegrations', updated);
    return updated;
  }

  /**
   * Complete Tenant Data Backup Export
   */
  public static getTenantBackup(tenantId: string) {
    const filterTenant = <T extends { tenantId?: string }>(items: T[]): T[] => {
      return tenantId === 'ALL' ? items : items.filter((i) => i.tenantId === tenantId);
    };

    return {
      backupVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      tenantId,
      shopSettings: this.getShopSettings(tenantId),
      items: filterTenant(db.get('items')),
      kits: filterTenant(db.get('kits')),
      customers: filterTenant(db.get('customers')),
      suppliers: filterTenant(db.get('suppliers')),
      purchaseOrders: filterTenant(db.get('purchaseOrders')),
      vendorPayments: filterTenant(db.get('vendorPayments')),
      purchaseReturns: filterTenant(db.get('purchaseReturns')),
      contraOffsets: filterTenant(db.get('contraOffsets')),
      bills: filterTenant(db.get('bills')),
      salesOrders: filterTenant(db.get('salesOrders')),
      packages: filterTenant(db.get('packages')),
      deliveryChallans: filterTenant(db.get('deliveryChallans')),
      festivals: filterTenant(db.get('festivals')),
      stockLogs: filterTenant(db.get('stockLogs')),
    };
  }

  /**
   * Restore Tenant Data from Backup
   */
  public static restoreTenantBackup(tenantId: string, backupData: any) {
    if (!backupData || typeof backupData !== 'object') {
      throw new Error('Invalid backup file payload');
    }

    // Helper to merge or overwrite tenant records
    const mergeCollection = <T extends { tenantId?: string }>(
      key: any,
      newRecords?: T[]
    ) => {
      if (!Array.isArray(newRecords)) return;
      const current = db.get(key) as T[];
      const others = current.filter((c) => c.tenantId && c.tenantId !== tenantId);
      const incoming = newRecords.map((r) => ({ ...r, tenantId }));
      db.set(key, [...others, ...incoming] as any);
    };

    if (backupData.shopSettings) {
      const allSettings = db.get('shopSettings');
      allSettings[tenantId] = { ...backupData.shopSettings, tenantId };
      db.set('shopSettings', allSettings);
    }

    mergeCollection('items', backupData.items);
    mergeCollection('kits', backupData.kits);
    mergeCollection('customers', backupData.customers);
    mergeCollection('suppliers', backupData.suppliers);
    mergeCollection('purchaseOrders', backupData.purchaseOrders);
    mergeCollection('vendorPayments', backupData.vendorPayments);
    mergeCollection('purchaseReturns', backupData.purchaseReturns);
    mergeCollection('contraOffsets', backupData.contraOffsets);
    mergeCollection('bills', backupData.bills);
    mergeCollection('salesOrders', backupData.salesOrders);
    mergeCollection('packages', backupData.packages);
    mergeCollection('deliveryChallans', backupData.deliveryChallans);
    mergeCollection('festivals', backupData.festivals);
    mergeCollection('stockLogs', backupData.stockLogs);

    return {
      success: true,
      message: `Tenant backup successfully restored for ${tenantId}`,
      restoredAt: new Date().toISOString(),
    };
  }
}
