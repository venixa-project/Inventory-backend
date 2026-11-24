import { db } from '../models/db.js';
import { AppError } from '../middlewares/error.middleware.js';
export class SalesReturnService {
    /**
     * List all sales returns for a tenant
     */
    static getReturns(tenantId) {
        const allReturns = db.get('salesReturns') || [];
        return allReturns
            .filter((r) => tenantId === 'ALL' || !r.tenantId || r.tenantId === tenantId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    /**
     * Get return by ID
     */
    static getReturnById(tenantId, id) {
        const allReturns = db.get('salesReturns') || [];
        const found = allReturns.find((r) => (tenantId === 'ALL' || !r.tenantId || r.tenantId === tenantId) && (r.id === id || r.returnNumber === id));
        if (!found) {
            throw new AppError(`Sales return / Credit Note '${id}' not found.`, 404);
        }
        return found;
    }
    /**
     * Create a new sales return / credit note with full inventory & ledger reconciliation
     */
    static createReturn(tenantId, data, user) {
        const existingReturns = db.get('salesReturns') || [];
        const count = existingReturns.length + 1;
        const returnNumber = data.returnNumber || `CN-2026-${String(count).padStart(3, '0')}`;
        const id = data.id || `sret-${Date.now()}`;
        const voucherCode = data.refundMode === 'Store Credit'
            ? data.storeCreditVoucherCode ||
                `VOUCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${String(count).padStart(3, '0')}`
            : undefined;
        const totalAmount = Number(data.totalAmount || 0);
        const subtotal = Number(data.subtotal || totalAmount);
        const gst = Number(data.gst || 0);
        const newReturn = {
            id,
            tenantId,
            returnNumber,
            billId: data.billId,
            billNumber: data.billNumber,
            salesOrderId: data.salesOrderId,
            salesOrderNumber: data.salesOrderNumber,
            customerId: data.customerId,
            customerName: data.customerName || 'Walk-in Customer',
            customerPhone: data.customerPhone,
            date: data.date || new Date().toISOString(),
            lines: (data.lines || []),
            subtotal,
            gst,
            totalAmount,
            refundMode: data.refundMode || 'Cash',
            refundStatus: data.refundStatus ||
                (data.refundMode === 'Store Credit' ? 'Store Credit Active' : 'Completed'),
            status: data.status || 'Completed',
            storeCreditVoucherCode: voucherCode,
            notes: data.notes,
            processedBy: data.processedBy || user?.name || 'Store Staff',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // 1. Inventory Stock Impact: Restock resaleable items, record stock adjustments
        const items = db.get('items') || [];
        const stockLogs = db.get('stockLogs') || [];
        let itemsUpdated = false;
        for (const line of newReturn.lines) {
            const itIdx = items.findIndex((it) => it.id === line.itemId || it.name.toLowerCase() === line.itemName.toLowerCase());
            if (itIdx !== -1) {
                const item = items[itIdx];
                if (line.condition === 'resaleable') {
                    item.stock = (item.stock || 0) + Number(line.qty);
                    itemsUpdated = true;
                    const log = {
                        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                        tenantId,
                        date: new Date().toISOString(),
                        itemId: item.id,
                        itemName: item.name,
                        qtyChange: Number(line.qty),
                        unit: (item.unit || line.unit || 'piece'),
                        reason: 'return',
                        referenceNumber: returnNumber,
                        note: `Customer return restocked via Credit Note ${returnNumber}`,
                    };
                    stockLogs.push(log);
                }
                else {
                    // Damaged/Scrap return - stock remains uncredited to active sellable, logged for shrinkage
                    const log = {
                        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                        tenantId,
                        date: new Date().toISOString(),
                        itemId: item.id,
                        itemName: item.name,
                        qtyChange: 0,
                        unit: (item.unit || line.unit || 'piece'),
                        reason: 'damage',
                        referenceNumber: returnNumber,
                        note: `Customer returned damaged/scrap unit via Credit Note ${returnNumber} (${line.reason || 'Defective'})`,
                    };
                    stockLogs.push(log);
                }
            }
        }
        if (itemsUpdated) {
            db.set('items', items);
        }
        db.set('stockLogs', stockLogs);
        // 2. Khata Ledger Adjustment: decrement customer due balance by return refund
        if (newReturn.refundMode === 'Khata Adjustment' && newReturn.customerId) {
            const customers = db.get('customers') || [];
            const custIdx = customers.findIndex((c) => c.id === newReturn.customerId && (tenantId === 'ALL' || !c.tenantId || c.tenantId === tenantId));
            if (custIdx !== -1) {
                const customer = customers[custIdx];
                const prevBal = customer.dueAmount || 0;
                customer.dueAmount = Math.max(0, prevBal - totalAmount);
                customer.updatedAt = new Date().toISOString();
                db.set('customers', customers);
            }
        }
        // 3. Cash Register Drawer Impact: record expense in open shift for cash refunds
        if (newReturn.refundMode === 'Cash') {
            try {
                const cashShifts = db.get('cashShifts') || [];
                const activeShift = cashShifts.find((s) => (tenantId === 'ALL' || !s.tenantId || s.tenantId === tenantId) && s.status === 'Open');
                if (activeShift) {
                    const cashExpenses = db.get('cashExpenses') || [];
                    cashExpenses.push({
                        id: `exp-${Date.now()}`,
                        tenantId,
                        date: new Date().toISOString(),
                        category: 'Other',
                        amount: totalAmount,
                        note: `POS Customer Return Refund: ${returnNumber}`,
                        recordedBy: newReturn.processedBy || 'Store Staff',
                    });
                    db.set('cashExpenses', cashExpenses);
                }
            }
            catch (e) {
                console.warn('[SalesReturnService] Failed to record cash expense in shift:', e);
            }
        }
        // 4. Save Return Record
        db.set('salesReturns', [newReturn, ...existingReturns]);
        return newReturn;
    }
    /**
     * Delete sales return
     */
    static deleteReturn(tenantId, id) {
        const allReturns = db.get('salesReturns') || [];
        const idx = allReturns.findIndex((r) => (tenantId === 'ALL' || !r.tenantId || r.tenantId === tenantId) && (r.id === id || r.returnNumber === id));
        if (idx === -1) {
            throw new AppError(`Sales return '${id}' not found.`, 404);
        }
        allReturns.splice(idx, 1);
        db.set('salesReturns', allReturns);
        return true;
    }
}
