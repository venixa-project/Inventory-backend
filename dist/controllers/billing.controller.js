import { BillingService } from '../services/billing.service.js';
import { DocumentService } from '../services/document.service.js';
export class BillingController {
    static getAll(req, res, next) {
        try {
            const { startDate, endDate, customerId, paymentMode, search } = req.query;
            const bills = BillingService.getBills(req.tenantId, { startDate, endDate, customerId, paymentMode, search });
            res.json({ success: true, count: bills.length, data: bills });
        }
        catch (err) {
            next(err);
        }
    }
    static getById(req, res, next) {
        try {
            const id = req.params.id;
            const bill = BillingService.getBillById(req.tenantId, id);
            res.json({ success: true, data: bill });
        }
        catch (err) {
            next(err);
        }
    }
    static checkout(req, res, next) {
        try {
            const bill = BillingService.checkout(req.tenantId, req.body);
            res.status(201).json({
                success: true,
                message: `Bill ${bill.billNumber} processed successfully`,
                data: bill,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static update(req, res, next) {
        try {
            const id = req.params.id;
            const updated = BillingService.updateBill(req.tenantId, id, req.body);
            res.json({ success: true, message: 'Bill updated successfully', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static printInvoice(req, res, next) {
        try {
            const id = req.params.id;
            const html = DocumentService.generateInvoiceHtml(id, req.tenantId);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    }
    static delete(req, res, next) {
        try {
            const id = req.params.id;
            const result = BillingService.deleteBill(req.tenantId, id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static settleUpiPayment(req, res, next) {
        try {
            const result = BillingService.recordUpiSettlement(req.tenantId, req.body);
            res.json({
                success: true,
                message: 'UPI payment verified and settled to destination bank account.',
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
