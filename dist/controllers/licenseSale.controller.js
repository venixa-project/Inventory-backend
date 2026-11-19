import { LicenseSaleService } from '../services/licenseSale.service.js';
export class LicenseSaleController {
    static getAll(req, res, next) {
        try {
            const { startDate, endDate, plan, status } = req.query;
            const sales = LicenseSaleService.getAllSales({ startDate, endDate, plan, status });
            res.json({ success: true, count: sales.length, data: sales });
        }
        catch (err) {
            next(err);
        }
    }
    static create(req, res, next) {
        try {
            const sale = LicenseSaleService.recordSale(req.body);
            res.status(201).json({ success: true, message: 'License sale invoice created', data: sale });
        }
        catch (err) {
            next(err);
        }
    }
    static updateStatus(req, res, next) {
        try {
            const id = req.params.id;
            const { status } = req.body;
            const updated = LicenseSaleService.updateSaleStatus(id, status);
            res.json({ success: true, message: 'License sale status updated', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
}
