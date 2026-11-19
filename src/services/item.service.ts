import { db } from '../models/db.js';
import { Item, Kit, StockLog } from '../types/index.js';
import { AppError } from '../middlewares/error.middleware.js';

export class ItemService {
  public static getItems(tenantId: string, filters?: {
    category?: string;
    lowStock?: boolean;
    search?: string;
  }) {
    let items = db.get('items');
    if (tenantId !== 'ALL') {
      items = items.filter((i) => i.tenantId === tenantId);
    }

    if (filters?.category && filters.category !== 'all') {
      items = items.filter((i) => i.category === filters.category);
    }

    if (filters?.lowStock) {
      items = items.filter((i) => i.stock <= i.reorderLevel);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.genericName && i.genericName.toLowerCase().includes(q)) ||
          (i.barcode && i.barcode.toLowerCase().includes(q)) ||
          (i.sku && i.sku.toLowerCase().includes(q)) ||
          (i.hsnCode && i.hsnCode.toLowerCase().includes(q)) ||
          (i.brand && i.brand.toLowerCase().includes(q)) ||
          (i.modelNumber && i.modelNumber.toLowerCase().includes(q)) ||
          (i.batchNumber && i.batchNumber.toLowerCase().includes(q))
      );
    }

    return items;
  }

  public static getItemById(tenantId: string, id: string) {
    const items = db.get('items');
    const item = items.find(
      (i) => (tenantId === 'ALL' || i.tenantId === tenantId) && i.id === id
    );
    if (!item) {
      throw new AppError(`Item '${id}' not found.`, 404);
    }
    return item;
  }

  public static getItemByBarcode(tenantId: string, code: string) {
    const clean = code.trim().toLowerCase();
    const items = db.get('items');
    const item = items.find(
      (i) =>
        (tenantId === 'ALL' || i.tenantId === tenantId) &&
        ((i.barcode && i.barcode.toLowerCase() === clean) ||
          (i.sku && i.sku.toLowerCase() === clean) ||
          i.id.toLowerCase() === clean)
    );
    return item || null;
  }

  public static createItem(tenantId: string, data: Omit<Item, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const items = db.get('items');

    // Auto-generate clean category code (e.g. GRO, PHA, POO, ELE, FAS, GEN)
    const catCode = (data.category || 'GEN')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase() || 'GEN';

    // Auto-generate unique product ID if not provided: PRD-CAT-XXXXX
    const resolvedId = data.id && data.id.trim() !== ''
      ? data.id.trim()
      : `PRD-${catCode}-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;

    // Idempotency: if item with this ID already exists, return existing
    const existing = items.find((i) => (tenantId === 'ALL' || i.tenantId === tenantId) && i.id === resolvedId);
    if (existing) {
      return existing;
    }

    // Auto-generate valid EAN-13 barcode with GS1 Modulo-10 checksum if not provided
    let resolvedBarcode = (data.barcode || '').trim();
    if (!resolvedBarcode) {
      let digits = '890';
      for (let i = 0; i < 9; i++) {
        digits += Math.floor(Math.random() * 10).toString();
      }
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const d = parseInt(digits[i], 10);
        sum += i % 2 === 0 ? d : d * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      resolvedBarcode = `${digits}${checkDigit}`;
    }

    // Auto-generate SKU Code: SKU-CAT-XXXXX if not provided
    let resolvedSku = (data.sku || '').trim();
    if (!resolvedSku) {
      const tenantItems = items.filter((i) => i.tenantId === tenantId);
      const catCount = tenantItems.filter((i) => i.sku && i.sku.startsWith(`SKU-${catCode}-`)).length;
      resolvedSku = `SKU-${catCode}-${10001 + catCount}`;
    }

    // Auto-fill HSN Code from category if not provided
    let resolvedHsn = (data.hsnCode || '').trim();
    if (!resolvedHsn) {
      const lowerCat = (data.category || '').toLowerCase();
      if (lowerCat.includes('pooja') || lowerCat.includes('camphor')) resolvedHsn = '2914';
      else if (lowerCat.includes('agarbatti') || lowerCat.includes('fragrance')) resolvedHsn = '3307';
      else if (lowerCat.includes('pharma') || lowerCat.includes('health') || lowerCat.includes('medicine')) resolvedHsn = '3004';
      else if (lowerCat.includes('grain') || lowerCat.includes('rice') || lowerCat.includes('grocery') || lowerCat.includes('fmcg')) resolvedHsn = '1006';
      else if (lowerCat.includes('oil')) resolvedHsn = '1512';
      else if (lowerCat.includes('atta') || lowerCat.includes('flour')) resolvedHsn = '1101';
      else if (lowerCat.includes('electric') || lowerCat.includes('hardware') || lowerCat.includes('switch')) resolvedHsn = '8536';
      else if (lowerCat.includes('wire') || lowerCat.includes('cable')) resolvedHsn = '8544';
      else if (lowerCat.includes('cloth') || lowerCat.includes('apparel') || lowerCat.includes('fashion')) resolvedHsn = '6203';
      else if (lowerCat.includes('silk') || lowerCat.includes('saree')) resolvedHsn = '5007';
      else resolvedHsn = '2106';
    }

    const sellingPrice = Number(data.sellingPrice) >= 0 ? Number(data.sellingPrice) : 0;
    const costPrice = Number(data.costPrice) >= 0 ? Number(data.costPrice) : 0;
    const mrp = Number(data.mrp) > 0 ? Number(data.mrp) : (sellingPrice || costPrice || 0);

    const newItem: Item = {
      ...data,
      id: resolvedId,
      barcode: resolvedBarcode,
      sku: resolvedSku,
      hsnCode: resolvedHsn,
      sellingPrice,
      costPrice,
      mrp,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    items.unshift(newItem);
    db.set('items', items);

    // Initial stock log if stock > 0
    if (newItem.stock > 0) {
      const stockLogs = db.get('stockLogs');
      stockLogs.unshift({
        id: `log-${Date.now()}`,
        tenantId,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        itemId: newItem.id,
        itemName: newItem.name,
        qtyChange: newItem.stock,
        unit: newItem.unit,
        reason: 'initial',
        note: 'Initial inventory on product creation',
      });
      db.set('stockLogs', stockLogs);
    }

    return newItem;
  }

  public static bulkCreateItems(
    tenantId: string,
    itemsList: Array<Omit<Item, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> & { id?: string }>
  ) {
    const createdItems: Item[] = [];
    for (const itemData of itemsList) {
      if (!itemData || !itemData.name || !itemData.name.trim()) continue;
      const created = this.createItem(tenantId, itemData);
      createdItems.push(created);
    }
    return createdItems;
  }

  public static updateItem(tenantId: string, id: string, updates: Partial<Item>) {
    const items = db.get('items');
    const index = items.findIndex(
      (i) => (tenantId === 'ALL' || i.tenantId === tenantId) && i.id === id
    );
    if (index === -1) {
      throw new AppError(`Item '${id}' not found.`, 404);
    }

    const updatesClean: Partial<Item> = { ...updates };
    if (updatesClean.sellingPrice !== undefined) {
      updatesClean.sellingPrice = Number(updatesClean.sellingPrice) >= 0 ? Number(updatesClean.sellingPrice) : 0;
    }
    if (updatesClean.costPrice !== undefined) {
      updatesClean.costPrice = Number(updatesClean.costPrice) >= 0 ? Number(updatesClean.costPrice) : 0;
    }
    if (updatesClean.mrp !== undefined) {
      updatesClean.mrp = Number(updatesClean.mrp) >= 0 ? Number(updatesClean.mrp) : (updatesClean.sellingPrice || 0);
    }

    const updated = {
      ...items[index],
      ...updatesClean,
      updatedAt: new Date().toISOString(),
    };

    items[index] = updated;
    db.set('items', items);
    return updated;
  }

  public static deleteItem(tenantId: string, id: string) {
    const items = db.get('items');
    const filtered = items.filter(
      (i) => !((tenantId === 'ALL' || i.tenantId === tenantId) && i.id === id)
    );
    if (filtered.length === items.length) {
      throw new AppError(`Item '${id}' not found.`, 404);
    }
    db.set('items', filtered);
    return { success: true, message: `Item ${id} deleted.` };
  }

  public static adjustStock(
    tenantId: string,
    itemId: string,
    change: number,
    reason: StockLog['reason'],
    note?: string
  ) {
    const item = this.getItemById(tenantId, itemId);
    const newStock = Number(Math.max(0, item.stock + change).toFixed(4));

    this.updateItem(tenantId, itemId, { stock: newStock });

    const stockLogs = db.get('stockLogs');
    const log: StockLog = {
      id: `log-${Date.now()}`,
      tenantId,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      itemId,
      itemName: item.name,
      qtyChange: change,
      unit: item.unit,
      reason,
      note: note || '',
    };
    stockLogs.unshift(log);
    db.set('stockLogs', stockLogs);

    return { item: { ...item, stock: newStock }, log };
  }

  public static updateStockLog(
    tenantId: string,
    id: string,
    updates: Partial<StockLog>,
    recomputeStock = true
  ) {
    const stockLogs = db.get('stockLogs');
    const index = stockLogs.findIndex(
      (l) => (tenantId === 'ALL' || l.tenantId === tenantId) && l.id === id
    );
    if (index === -1) {
      throw new AppError(`Stock log '${id}' not found.`, 404);
    }
    const current = stockLogs[index];

    if (
      recomputeStock &&
      updates.qtyChange !== undefined &&
      Number(updates.qtyChange) !== current.qtyChange
    ) {
      const diff = Number(updates.qtyChange) - current.qtyChange;
      try {
        const item = this.getItemById(tenantId, current.itemId);
        const newStock = Number(Math.max(0, item.stock + diff).toFixed(4));
        this.updateItem(tenantId, current.itemId, { stock: newStock });
      } catch (err) {
        // item may not exist, continue
      }
    }

    const updated = {
      ...current,
      ...updates,
      ...(updates.qtyChange !== undefined ? { qtyChange: Number(updates.qtyChange) } : {}),
    };
    stockLogs[index] = updated;
    db.set('stockLogs', stockLogs);
    return updated;
  }

  public static deleteStockLog(tenantId: string, id: string, revertStock = true) {
    const stockLogs = db.get('stockLogs');
    const log = stockLogs.find(
      (l) => (tenantId === 'ALL' || l.tenantId === tenantId) && l.id === id
    );
    if (!log) {
      throw new AppError(`Stock log '${id}' not found.`, 404);
    }

    if (revertStock) {
      try {
        const item = this.getItemById(tenantId, log.itemId);
        const newStock = Number(Math.max(0, item.stock - log.qtyChange).toFixed(4));
        this.updateItem(tenantId, log.itemId, { stock: newStock });
      } catch (err) {
        // ignore if item not found
      }
    }

    const filtered = stockLogs.filter(
      (l) => !((tenantId === 'ALL' || l.tenantId === tenantId) && l.id === id)
    );
    db.set('stockLogs', filtered);
    return { success: true, message: `Stock log ${id} deleted.` };
  }

  // Composite Kits
  public static getKits(tenantId: string) {
    const kits = db.get('kits');
    return tenantId === 'ALL' ? kits : kits.filter((k) => k.tenantId === tenantId);
  }

  public static getKitById(tenantId: string, id: string) {
    const kits = db.get('kits');
    const kit = kits.find(
      (k) => (tenantId === 'ALL' || k.tenantId === tenantId) && k.id === id
    );
    if (!kit) {
      throw new AppError(`Kit '${id}' not found.`, 404);
    }
    return kit;
  }

  public static createKit(tenantId: string, data: Omit<Kit, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const kits = db.get('kits');
    const resolvedId = data.id || `kit-${Date.now().toString().slice(-6)}`;
    const existing = kits.find((k) => (tenantId === 'ALL' || k.tenantId === tenantId) && k.id === resolvedId);
    if (existing) {
      return existing;
    }

    const newKit: Kit = {
      ...data,
      id: resolvedId,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    kits.unshift(newKit);
    db.set('kits', kits);
    return newKit;
  }

  public static updateKit(tenantId: string, id: string, updates: Partial<Kit>) {
    const kits = db.get('kits');
    const index = kits.findIndex(
      (k) => (tenantId === 'ALL' || k.tenantId === tenantId) && k.id === id
    );
    if (index === -1) {
      throw new AppError(`Kit '${id}' not found.`, 404);
    }
    const updated = {
      ...kits[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    kits[index] = updated;
    db.set('kits', kits);
    return updated;
  }

  public static deleteKit(tenantId: string, id: string) {
    const kits = db.get('kits');
    const filtered = kits.filter(
      (k) => !((tenantId === 'ALL' || k.tenantId === tenantId) && k.id === id)
    );
    if (filtered.length === kits.length) {
      throw new AppError(`Kit '${id}' not found.`, 404);
    }
    db.set('kits', filtered);
    return { success: true, message: `Kit ${id} deleted.` };
  }

  public static getStockLogs(tenantId: string) {
    const logs = db.get('stockLogs');
    return tenantId === 'ALL' ? logs : logs.filter((l) => l.tenantId === tenantId);
  }
}
