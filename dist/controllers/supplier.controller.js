import { SupplierService } from '../services/supplier.service.js';
import { DocumentService } from '../services/document.service.js';
export class SupplierController {
    static getAll(req, res, next) {
        try {
            const suppliers = SupplierService.getSuppliers(req.tenantId);
            res.json({ success: true, count: suppliers.length, data: suppliers });
        }
        catch (err) {
            next(err);
        }
    }
    static getById(req, res, next) {
        try {
            const id = req.params.id;
            const supplier = SupplierService.getSupplierById(req.tenantId, id);
            res.json({ success: true, data: supplier });
        }
        catch (err) {
            next(err);
        }
    }
    static create(req, res, next) {
        try {
            const supplier = SupplierService.createSupplier(req.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Supplier created successfully', data: supplier });
        }
        catch (err) {
            next(err);
        }
    }
    static update(req, res, next) {
        try {
            const id = req.params.id;
            const updated = SupplierService.updateSupplier(req.tenantId, id, req.body);
            res.json({ success: true, message: 'Supplier updated successfully', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static getLedger(req, res, next) {
        try {
            const id = req.params.id;
            const ledger = SupplierService.getSupplierLedger(req.tenantId, id);
            res.json({ success: true, data: ledger });
        }
        catch (err) {
            next(err);
        }
    }
    // Purchase Orders
    static getPOs(req, res, next) {
        try {
            const pos = SupplierService.getPurchaseOrders(req.tenantId, req.query.supplierId);
            res.json({ success: true, count: pos.length, data: pos });
        }
        catch (err) {
            next(err);
        }
    }
    static getPOById(req, res, next) {
        try {
            const id = req.params.id;
            const po = SupplierService.getPOById(req.tenantId, id);
            res.json({ success: true, data: po });
        }
        catch (err) {
            next(err);
        }
    }
    static createPO(req, res, next) {
        try {
            const po = SupplierService.createPO(req.tenantId, req.body);
            res.status(201).json({ success: true, message: `PO ${po.poNumber} created`, data: po });
        }
        catch (err) {
            next(err);
        }
    }
    static markPOReceived(req, res, next) {
        try {
            const id = req.params.id;
            const po = SupplierService.markPOReceived(req.tenantId, id);
            res.json({ success: true, message: `PO inwarded into inventory`, data: po });
        }
        catch (err) {
            next(err);
        }
    }
    // Payments, Debit notes, Contra offsets
    static recordPayment(req, res, next) {
        try {
            const payment = SupplierService.recordVendorPayment(req.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Vendor payment recorded', data: payment });
        }
        catch (err) {
            next(err);
        }
    }
    static createPurchaseReturn(req, res, next) {
        try {
            const debitNote = SupplierService.createPurchaseReturn(req.tenantId, req.body);
            res.status(201).json({ success: true, message: `Debit note ${debitNote.returnNumber} issued`, data: debitNote });
        }
        catch (err) {
            next(err);
        }
    }
    static executeContra(req, res, next) {
        try {
            const contra = SupplierService.executeContraOffset(req.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Contra offset executed successfully', data: contra });
        }
        catch (err) {
            next(err);
        }
    }
    static printPO(req, res, next) {
        try {
            const id = req.params.id;
            const html = DocumentService.generatePOHtml(id, req.tenantId);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    }
    static deleteSupplier(req, res, next) {
        try {
            const id = req.params.id;
            const result = SupplierService.deleteSupplier(req.tenantId, id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static deletePO(req, res, next) {
        try {
            const id = req.params.id;
            const result = SupplierService.deletePO(req.tenantId, id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
