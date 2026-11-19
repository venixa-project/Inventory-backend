import { db } from '../models/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ItemService } from './item.service.js';
import { CustomerService } from './customer.service.js';
export class SupplierService {
    static getSuppliers(tenantId) {
        const suppliers = db.get('suppliers');
        return tenantId === 'ALL' ? suppliers : suppliers.filter((s) => s.tenantId === tenantId);
    }
    static getSupplierById(tenantId, id) {
        const suppliers = db.get('suppliers');
        const sup = suppliers.find((s) => (tenantId === 'ALL' || s.tenantId === tenantId) && s.id === id);
        if (!sup) {
            throw new AppError(`Supplier '${id}' not found.`, 404);
        }
        return sup;
    }
    static createSupplier(tenantId, data) {
        const suppliers = db.get('suppliers');
        const resolvedId = data.id || `sup-${Date.now().toString().slice(-6)}`;
        // Idempotency check
        const existing = suppliers.find((s) => (tenantId === 'ALL' || s.tenantId === tenantId) && s.id === resolvedId);
        if (existing) {
            return existing;
        }
        const newSup = {
            ...data,
            id: resolvedId,
            tenantId,
            createdAt: data.createdAt || new Date().toISOString().substring(0, 10),
            updatedAt: new Date().toISOString(),
        };
        // If dual entity flagged, link customer
        if (newSup.isAlsoCustomer && newSup.linkedCustomerId) {
            CustomerService.updateCustomer(tenantId, newSup.linkedCustomerId, {
                isAlsoVendor: true,
                linkedSupplierId: newSup.id,
            });
        }
        suppliers.unshift(newSup);
        db.set('suppliers', suppliers);
        return newSup;
    }
    static updateSupplier(tenantId, id, updates) {
        const suppliers = db.get('suppliers');
        const index = suppliers.findIndex((s) => (tenantId === 'ALL' || s.tenantId === tenantId) && s.id === id);
        if (index === -1) {
            throw new AppError(`Supplier '${id}' not found.`, 404);
        }
        const updated = {
            ...suppliers[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        suppliers[index] = updated;
        db.set('suppliers', suppliers);
        return updated;
    }
    // Purchase Orders
    static getPurchaseOrders(tenantId, supplierId) {
        let pos = db.get('purchaseOrders');
        if (tenantId !== 'ALL') {
            pos = pos.filter((p) => p.tenantId === tenantId);
        }
        if (supplierId) {
            pos = pos.filter((p) => p.supplierId === supplierId);
        }
        return pos;
    }
    static getPOById(tenantId, id) {
        const pos = db.get('purchaseOrders');
        const po = pos.find((p) => (tenantId === 'ALL' || p.tenantId === tenantId) && p.id === id);
        if (!po) {
            throw new AppError(`Purchase order '${id}' not found.`, 404);
        }
        return po;
    }
    static createPO(tenantId, data) {
        const pos = db.get('purchaseOrders');
        const poId = data.id || `po-${Date.now()}`;
        // Idempotency check
        const existing = pos.find((p) => (tenantId === 'ALL' || p.tenantId === tenantId) && p.id === poId);
        if (existing) {
            return existing;
        }
        const count = pos.length + 1;
        const poNumber = data.invoiceNumber || data.poNumber || `PUR-2026-${String(count).padStart(3, '0')}`;
        const autoInward = data.stockInwarded === true;
        const calculatedTotal = data.totalAmount !== undefined
            ? data.totalAmount
            : data.lines.reduce((sum, l) => sum + (l.totalCost || l.qty * (l.costPrice || 0)), 0);
        const isPaid = data.paymentStatus === 'Paid';
        const newPO = {
            ...data,
            id: poId,
            tenantId,
            poNumber,
            supplierId: data.supplierId,
            lines: data.lines,
            status: autoInward ? 'Received' : 'Draft',
            date: data.date || new Date().toISOString().substring(0, 10),
            receivedDate: autoInward ? new Date().toISOString().substring(0, 10) : undefined,
            stockInwarded: autoInward,
            paymentStatus: data.paymentStatus || 'Due',
            paidAmount: isPaid ? calculatedTotal : data.paidAmount || 0,
            dueAmount: isPaid ? 0 : calculatedTotal,
            paymentMode: data.paymentMode || 'Credit',
            totalAmount: calculatedTotal,
            notes: data.notes,
            createdAt: new Date().toISOString(),
        };
        if (autoInward) {
            for (const line of data.lines) {
                try {
                    ItemService.adjustStock(tenantId, line.itemId, line.qty, 'purchase', `Purchased via ${poNumber}`);
                }
                catch (e) {
                    console.warn(`[SupplierService] Could not inward stock for line item ${line.itemId}:`, e);
                }
            }
        }
        pos.unshift(newPO);
        db.set('purchaseOrders', pos);
        return newPO;
    }
    static markPOReceived(tenantId, poId) {
        const pos = db.get('purchaseOrders');
        const po = pos.find((p) => (tenantId === 'ALL' || p.tenantId === tenantId) && p.id === poId);
        if (!po || po.status === 'Received')
            return po;
        for (const line of po.lines) {
            ItemService.adjustStock(tenantId, line.itemId, line.qty, 'purchase', `Received from ${po.poNumber}`);
        }
        po.status = 'Received';
        po.stockInwarded = true;
        po.receivedDate = new Date().toISOString().substring(0, 10);
        db.set('purchaseOrders', pos);
        return po;
    }
    // Vendor Payments
    static recordVendorPayment(tenantId, data) {
        const payments = db.get('vendorPayments');
        const sup = this.getSupplierById(tenantId, data.supplierId);
        const count = payments.length + 1;
        const paymentNumber = `VPAY-2026-${String(count).padStart(3, '0')}`;
        const newPayment = {
            id: `vpay-${Date.now()}`,
            tenantId,
            paymentNumber,
            supplierId: data.supplierId,
            supplierName: sup.companyName || sup.name,
            poId: data.poId,
            date: new Date().toISOString().substring(0, 10),
            amount: data.amount,
            paymentMode: data.paymentMode,
            referenceNumber: data.referenceNumber,
            note: data.note,
            recordedBy: 'Store Staff',
            createdAt: new Date().toISOString(),
        };
        payments.unshift(newPayment);
        db.set('vendorPayments', payments);
        if (data.poId) {
            const pos = db.get('purchaseOrders');
            const po = pos.find((p) => (tenantId === 'ALL' || p.tenantId === tenantId) && p.id === data.poId);
            if (po) {
                po.paidAmount = Number(((po.paidAmount || 0) + data.amount).toFixed(2));
                po.dueAmount = Number(Math.max(0, (po.totalAmount || 0) - po.paidAmount).toFixed(2));
                po.paymentStatus = po.dueAmount === 0 ? 'Paid' : 'Partial';
                db.set('purchaseOrders', pos);
            }
        }
        return newPayment;
    }
    // Purchase Returns / Debit Notes
    static createPurchaseReturn(tenantId, data) {
        const returns = db.get('purchaseReturns');
        const sup = this.getSupplierById(tenantId, data.supplierId);
        const count = returns.length + 1;
        const returnNumber = `DN-2026-${String(count).padStart(3, '0')}`;
        const totalAmount = data.lines.reduce((sum, l) => sum + (l.totalAmount || l.qty * l.costPrice), 0);
        const newReturn = {
            id: `pret-${Date.now()}`,
            tenantId,
            returnNumber,
            supplierId: data.supplierId,
            supplierName: sup.companyName || sup.name,
            date: new Date().toISOString().substring(0, 10),
            lines: data.lines,
            totalAmount,
            status: 'Approved',
            notes: data.notes,
            refundMode: data.refundMode || 'Deduct from Due',
            createdAt: new Date().toISOString(),
        };
        // Deduct stock for returned goods
        for (const line of data.lines) {
            ItemService.adjustStock(tenantId, line.itemId, -line.qty, 'return', `Returned to vendor ${sup.name} via Debit Note ${returnNumber}`);
        }
        returns.unshift(newReturn);
        db.set('purchaseReturns', returns);
        return newReturn;
    }
    // Contra Offset
    static executeContraOffset(tenantId, data) {
        const offsets = db.get('contraOffsets');
        const sup = this.getSupplierById(tenantId, data.supplierId);
        const cust = CustomerService.getCustomerById(tenantId, data.customerId);
        const count = offsets.length + 1;
        const offsetNumber = `CONTRA-2026-${String(count).padStart(3, '0')}`;
        const newContra = {
            id: `contra-${Date.now()}`,
            tenantId,
            offsetNumber,
            date: new Date().toISOString().substring(0, 10),
            supplierId: data.supplierId,
            supplierName: sup.companyName || sup.name,
            customerId: data.customerId,
            customerName: cust.name,
            offsetAmount: data.amount,
            note: data.note || `Contra offset settling customer due against vendor payable for ${cust.name}`,
            recordedBy: 'Store Staff',
            createdAt: new Date().toISOString(),
        };
        // 1. Reduce customer due
        CustomerService.recordPayment(tenantId, data.customerId, data.amount);
        // 2. Record vendor payment with paymentMode 'Contra'
        this.recordVendorPayment(tenantId, {
            supplierId: data.supplierId,
            amount: data.amount,
            paymentMode: 'Contra',
            referenceNumber: offsetNumber,
            note: `Contra Offset against Customer Ledger #${cust.name}`,
        });
        offsets.unshift(newContra);
        db.set('contraOffsets', offsets);
        return newContra;
    }
    // Supplier Ledger Summary with Dual Entity Net Exposure
    static getSupplierLedger(tenantId, supplierId) {
        const sup = this.getSupplierById(tenantId, supplierId);
        const vendorPOs = this.getPurchaseOrders(tenantId, supplierId);
        const vendorPayments = (db.get('vendorPayments') || []).filter((vp) => (tenantId === 'ALL' || vp.tenantId === tenantId) && vp.supplierId === supplierId);
        const vendorReturns = (db.get('purchaseReturns') || []).filter((pr) => (tenantId === 'ALL' || pr.tenantId === tenantId) && pr.supplierId === supplierId);
        const totalPurchases = vendorPOs.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
        const totalPayments = vendorPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalReturns = vendorReturns.reduce((sum, r) => sum + r.totalAmount, 0);
        const currentPayableDue = Math.max(0, (sup.openingBalance || 0) + totalPurchases - totalPayments - totalReturns);
        let customerDueReceivable = 0;
        let linkedCustomer = null;
        if (sup.isAlsoCustomer && sup.linkedCustomerId) {
            try {
                linkedCustomer = CustomerService.getCustomerById(tenantId, sup.linkedCustomerId);
                customerDueReceivable = linkedCustomer.dueAmount || 0;
            }
            catch (e) {
                // Linked customer might not exist
            }
        }
        const netDifference = currentPayableDue - customerDueReceivable;
        let netExposureType = 'settled';
        if (netDifference > 0) {
            netExposureType = 'we_owe_vendor';
        }
        else if (netDifference < 0) {
            netExposureType = 'customer_owes_us';
        }
        return {
            supplier: sup,
            totalPurchases,
            totalPayments,
            totalReturns,
            currentPayableDue,
            isAlsoCustomer: Boolean(sup.isAlsoCustomer && linkedCustomer),
            linkedCustomer,
            customerDueReceivable,
            netExposure: Math.abs(netDifference),
            netExposureType,
            pos: vendorPOs,
            payments: vendorPayments,
            returns: vendorReturns,
        };
    }
    static deleteSupplier(tenantId, id) {
        const suppliers = db.get('suppliers');
        const filtered = suppliers.filter((s) => !((tenantId === 'ALL' || s.tenantId === tenantId) && s.id === id));
        if (filtered.length === suppliers.length) {
            throw new AppError(`Supplier '${id}' not found.`, 404);
        }
        db.set('suppliers', filtered);
        return { success: true, message: `Supplier ${id} deleted.` };
    }
    static deletePO(tenantId, id) {
        const pos = db.get('purchaseOrders');
        const filtered = pos.filter((p) => !((tenantId === 'ALL' || p.tenantId === tenantId) && p.id === id));
        if (filtered.length === pos.length) {
            throw new AppError(`Purchase order '${id}' not found.`, 404);
        }
        db.set('purchaseOrders', filtered);
        return { success: true, message: `Purchase order ${id} deleted.` };
    }
}
