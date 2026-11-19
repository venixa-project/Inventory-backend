import { db } from '../models/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ItemService } from './item.service.js';
export class SalesOrderService {
    // ═══════════════════════════════════════════════════════════════
    // SALES ORDERS
    // ═══════════════════════════════════════════════════════════════
    static getSalesOrders(tenantId, filters) {
        let orders = db.get('salesOrders');
        if (tenantId !== 'ALL') {
            orders = orders.filter((o) => o.tenantId === tenantId);
        }
        if (filters?.status && filters.status !== 'All') {
            orders = orders.filter((o) => o.status === filters.status);
        }
        if (filters?.customerId) {
            orders = orders.filter((o) => o.customerId === filters.customerId);
        }
        if (filters?.startDate) {
            orders = orders.filter((o) => o.date >= filters.startDate);
        }
        if (filters?.endDate) {
            orders = orders.filter((o) => o.date <= filters.endDate);
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase().trim();
            orders = orders.filter((o) => o.soNumber.toLowerCase().includes(q) ||
                o.customerName.toLowerCase().includes(q) ||
                (o.customerPhone && o.customerPhone.includes(q)) ||
                (o.referenceNumber && o.referenceNumber.toLowerCase().includes(q)));
        }
        if (filters?.category && filters.category !== 'All') {
            const items = db.get('items');
            orders = orders.filter((o) => o.lines.some((l) => {
                const item = items.find((i) => i.id === l.itemId);
                return (item?.category || 'General') === filters.category;
            }));
        }
        return orders;
    }
    static getOrderById(tenantId, id) {
        const orders = db.get('salesOrders');
        const order = orders.find((o) => (tenantId === 'ALL' || o.tenantId === tenantId) && (o.id === id || o.soNumber === id));
        if (!order) {
            throw new AppError(`Sales order '${id}' not found.`, 404);
        }
        return order;
    }
    static deleteOrder(tenantId, id) {
        const orders = db.get('salesOrders');
        const orderToDelete = orders.find((o) => (tenantId === 'ALL' || o.tenantId === tenantId) && (o.id === id || o.soNumber === id));
        if (!orderToDelete) {
            throw new AppError(`Sales order '${id}' not found.`, 404);
        }
        // Restore reserved stock when deleting a sales order
        for (const line of orderToDelete.lines) {
            try {
                ItemService.adjustStock(tenantId, line.itemId, line.qty, 'return', `Stock restored - Sales Order ${orderToDelete.soNumber} cancelled`);
            }
            catch (e) {
                console.warn(`[SalesOrderService] Could not restore stock for item ${line.itemId}:`, e);
            }
        }
        const filtered = orders.filter((o) => o.id !== orderToDelete.id);
        db.set('salesOrders', filtered);
        return { success: true, message: `Sales order ${orderToDelete.soNumber} deleted and stock restored.` };
    }
    static createSalesOrder(tenantId, data) {
        const orders = db.get('salesOrders');
        let soNumber = data.soNumber;
        if (!soNumber) {
            let maxSeq = 100;
            for (const order of orders) {
                const match = order.soNumber?.match(/SO-\d{4}-(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxSeq)
                        maxSeq = num;
                }
            }
            const year = new Date().getFullYear();
            soNumber = `SO-${year}-${maxSeq + 1}`;
        }
        const soId = data.id || `so-${Date.now()}`;
        // Idempotency check
        const existing = orders.find((o) => (tenantId === 'ALL' || o.tenantId === tenantId) && o.id === soId);
        if (existing) {
            return existing;
        }
        const newOrder = {
            ...data,
            id: soId,
            tenantId,
            soNumber,
            status: data.status || 'Confirmed',
            createdAt: new Date().toISOString(),
        };
        // Deduct/reserve stock safely
        for (const line of data.lines) {
            try {
                ItemService.adjustStock(tenantId, line.itemId, -line.qty, 'sale', `Reserved in Sales Order ${soNumber}`);
            }
            catch (e) {
                console.warn(`[SalesOrderService] Could not reserve stock for item ${line.itemId}:`, e);
            }
        }
        orders.unshift(newOrder);
        db.set('salesOrders', orders);
        return newOrder;
    }
    static updateSOStatus(tenantId, id, status) {
        const orders = db.get('salesOrders');
        const index = orders.findIndex((o) => (tenantId === 'ALL' || o.tenantId === tenantId) && (o.id === id || o.soNumber === id));
        if (index === -1) {
            throw new AppError(`Sales order '${id}' not found.`, 404);
        }
        orders[index].status = status;
        db.set('salesOrders', orders);
        return orders[index];
    }
    static updateSalesOrder(tenantId, id, updates) {
        const orders = db.get('salesOrders');
        const index = orders.findIndex((o) => (tenantId === 'ALL' || o.tenantId === tenantId) && (o.id === id || o.soNumber === id));
        if (index === -1) {
            throw new AppError(`Sales order '${id}' not found.`, 404);
        }
        const updated = { ...orders[index], ...updates };
        orders[index] = updated;
        db.set('salesOrders', orders);
        return updated;
    }
    // ═══════════════════════════════════════════════════════════════
    // PACKAGES & LOGISTICS
    // ═══════════════════════════════════════════════════════════════
    static getPackages(tenantId, filters) {
        let packages = db.get('packages');
        if (tenantId !== 'ALL') {
            packages = packages.filter((p) => p.tenantId === tenantId);
        }
        if (filters?.status && filters.status !== 'All') {
            packages = packages.filter((p) => p.status === filters.status);
        }
        if (filters?.startDate) {
            packages = packages.filter((p) => p.date >= filters.startDate);
        }
        if (filters?.endDate) {
            packages = packages.filter((p) => p.date <= filters.endDate);
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase().trim();
            packages = packages.filter((p) => p.packageNumber.toLowerCase().includes(q) ||
                p.soNumber.toLowerCase().includes(q) ||
                p.customerName.toLowerCase().includes(q) ||
                (p.trackingNumber && p.trackingNumber.toLowerCase().includes(q)));
        }
        return packages;
    }
    static getPackageById(tenantId, id) {
        const packages = db.get('packages');
        const pkg = packages.find((p) => (tenantId === 'ALL' || p.tenantId === tenantId) && (p.id === id || p.packageNumber === id));
        if (!pkg) {
            throw new AppError(`Package '${id}' not found.`, 404);
        }
        return pkg;
    }
    static createPackageFromSO(tenantId, soId, carrier, trackingNumber) {
        const orders = db.get('salesOrders');
        const so = orders.find((s) => (tenantId === 'ALL' || s.tenantId === tenantId) && (s.id === soId || s.soNumber === soId));
        if (!so) {
            throw new AppError(`Sales order '${soId}' not found.`, 404);
        }
        const packages = db.get('packages');
        // Check for existing package for this SO (idempotency)
        const existingPkg = packages.find((p) => p.salesOrderId === so.id);
        if (existingPkg) {
            return existingPkg;
        }
        let maxSeq = 0;
        for (const pkg of packages) {
            const match = pkg.packageNumber?.match(/PKG-(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxSeq)
                    maxSeq = num;
            }
        }
        const packageNumber = `PKG-${String(maxSeq + 1).padStart(4, '0')}`;
        const newPkg = {
            id: `pkg-${Date.now()}`,
            tenantId,
            packageNumber,
            salesOrderId: so.id,
            soNumber: so.soNumber,
            customerName: so.customerName,
            date: new Date().toISOString().substring(0, 10),
            status: 'Not Shipped',
            carrier: carrier || 'Standard Logistics',
            trackingNumber: trackingNumber || `TRK-${Math.floor(10000 + Math.random() * 90000)}`,
            createdAt: new Date().toISOString(),
        };
        // Update SO status to Packed
        so.status = 'Packed';
        packages.unshift(newPkg);
        db.set('packages', packages);
        db.set('salesOrders', orders);
        return newPkg;
    }
    static updatePackageStatus(tenantId, pkgId, status, carrier, trackingNumber) {
        const packages = db.get('packages');
        const index = packages.findIndex((p) => (tenantId === 'ALL' || p.tenantId === tenantId) && (p.id === pkgId || p.packageNumber === pkgId));
        if (index === -1) {
            throw new AppError(`Package '${pkgId}' not found.`, 404);
        }
        packages[index].status = status;
        if (carrier)
            packages[index].carrier = carrier;
        if (trackingNumber)
            packages[index].trackingNumber = trackingNumber;
        // Synchronize parent Sales Order status
        if (packages[index].salesOrderId) {
            const orders = db.get('salesOrders');
            const order = orders.find((o) => o.id === packages[index].salesOrderId);
            if (order) {
                if (status === 'Shipped')
                    order.status = 'Shipped';
                if (status === 'Delivered')
                    order.status = 'Delivered';
                db.set('salesOrders', orders);
            }
        }
        db.set('packages', packages);
        return packages[index];
    }
    static deletePackage(tenantId, id) {
        const packages = db.get('packages');
        const filtered = packages.filter((p) => !((tenantId === 'ALL' || p.tenantId === tenantId) && (p.id === id || p.packageNumber === id)));
        if (filtered.length === packages.length) {
            throw new AppError(`Package '${id}' not found.`, 404);
        }
        db.set('packages', filtered);
        return { success: true, message: `Package ${id} deleted.` };
    }
    // ═══════════════════════════════════════════════════════════════
    // DELIVERY CHALLANS
    // ═══════════════════════════════════════════════════════════════
    static getChallans(tenantId, filters) {
        let challans = db.get('deliveryChallans');
        if (tenantId !== 'ALL') {
            challans = challans.filter((c) => c.tenantId === tenantId);
        }
        if (filters?.status && filters.status !== 'All') {
            challans = challans.filter((c) => c.status === filters.status);
        }
        if (filters?.customerId) {
            challans = challans.filter((c) => c.customerId === filters.customerId);
        }
        if (filters?.startDate) {
            challans = challans.filter((c) => c.date >= filters.startDate);
        }
        if (filters?.endDate) {
            challans = challans.filter((c) => c.date <= filters.endDate);
        }
        if (filters?.search) {
            const q = filters.search.toLowerCase().trim();
            challans = challans.filter((c) => c.challanNumber.toLowerCase().includes(q) ||
                c.customerName.toLowerCase().includes(q) ||
                (c.referenceNumber && c.referenceNumber.toLowerCase().includes(q)));
        }
        if (filters?.category && filters.category !== 'All') {
            const items = db.get('items');
            challans = challans.filter((c) => c.lines.some((l) => {
                const item = items.find((i) => i.id === l.itemId);
                return (item?.category || 'General') === filters.category;
            }));
        }
        return challans;
    }
    static getChallanById(tenantId, id) {
        const challans = db.get('deliveryChallans');
        const challan = challans.find((c) => (tenantId === 'ALL' || c.tenantId === tenantId) && (c.id === id || c.challanNumber === id));
        if (!challan) {
            throw new AppError(`Delivery Challan '${id}' not found.`, 404);
        }
        return challan;
    }
    static updateChallanStatus(tenantId, id, status) {
        const challans = db.get('deliveryChallans');
        const index = challans.findIndex((c) => (tenantId === 'ALL' || c.tenantId === tenantId) && (c.id === id || c.challanNumber === id));
        if (index === -1) {
            throw new AppError(`Delivery Challan '${id}' not found.`, 404);
        }
        challans[index].status = status;
        db.set('deliveryChallans', challans);
        return challans[index];
    }
    static updateChallan(tenantId, id, updates) {
        const challans = db.get('deliveryChallans');
        const index = challans.findIndex((c) => (tenantId === 'ALL' || c.tenantId === tenantId) && (c.id === id || c.challanNumber === id));
        if (index === -1) {
            throw new AppError(`Delivery Challan '${id}' not found.`, 404);
        }
        const updated = { ...challans[index], ...updates };
        challans[index] = updated;
        db.set('deliveryChallans', challans);
        return updated;
    }
    static deleteChallan(tenantId, id) {
        const challans = db.get('deliveryChallans');
        const filtered = challans.filter((c) => !((tenantId === 'ALL' || c.tenantId === tenantId) && (c.id === id || c.challanNumber === id)));
        if (filtered.length === challans.length) {
            throw new AppError(`Delivery Challan '${id}' not found.`, 404);
        }
        db.set('deliveryChallans', filtered);
        return { success: true, message: `Delivery Challan ${id} deleted.` };
    }
    static createDeliveryChallan(tenantId, data) {
        const challans = db.get('deliveryChallans');
        const dcId = data.id || `dc-${Date.now()}`;
        // Idempotency check
        const existing = challans.find((c) => (tenantId === 'ALL' || c.tenantId === tenantId) && c.id === dcId);
        if (existing) {
            return existing;
        }
        // Also check by reference number (prevent duplicate challans for same SO)
        if (data.referenceNumber) {
            const existingByRef = challans.find((c) => (tenantId === 'ALL' || c.tenantId === tenantId) && c.referenceNumber === data.referenceNumber);
            if (existingByRef) {
                return existingByRef;
            }
        }
        let maxSeq = 0;
        for (const ch of challans) {
            const match = ch.challanNumber?.match(/DC-(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxSeq)
                    maxSeq = num;
            }
        }
        const challanNumber = data.challanNumber || `DC-${String(maxSeq + 1).padStart(4, '0')}`;
        const newDC = {
            ...data,
            id: dcId,
            tenantId,
            challanNumber,
            status: data.status || 'Open',
            createdAt: new Date().toISOString(),
        };
        challans.unshift(newDC);
        db.set('deliveryChallans', challans);
        return newDC;
    }
}
