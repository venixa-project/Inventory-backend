import { ReportsService } from '../services/reports.service.js';
export class ReportsController {
    static getDashboard(req, res, next) {
        try {
            const { startDate, endDate, category } = req.query;
            const summary = ReportsService.getDashboardSummary(req.tenantId, { startDate, endDate, category });
            res.json({ success: true, data: summary });
        }
        catch (err) {
            next(err);
        }
    }
    static getStaffDashboard(req, res, next) {
        try {
            const { timeFilter, startDate, endDate, counterYear, pipelineYear } = req.query;
            const summary = ReportsService.getStaffDashboardSummary(req.tenantId, {
                timeFilter: timeFilter,
                startDate,
                endDate,
                counterYear,
                pipelineYear,
            });
            res.json({ success: true, data: summary });
        }
        catch (err) {
            next(err);
        }
    }
    static getSalesReport(req, res, next) {
        try {
            const { startDate, endDate, category } = req.query;
            const report = ReportsService.getSalesReport(req.tenantId, { startDate, endDate, category });
            res.json({ success: true, data: report });
        }
        catch (err) {
            next(err);
        }
    }
    static getTopProducts(req, res, next) {
        try {
            const { startDate, endDate, category, limit } = req.query;
            const report = ReportsService.getTopProductsReport(req.tenantId, {
                startDate,
                endDate,
                category,
                limit: limit ? parseInt(limit, 10) : undefined,
            });
            res.json({ success: true, data: report });
        }
        catch (err) {
            next(err);
        }
    }
    static getStockHealth(req, res, next) {
        try {
            const report = ReportsService.getStockHealthReport(req.tenantId);
            res.json({ success: true, data: report });
        }
        catch (err) {
            next(err);
        }
    }
    static getTaxGST(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            const report = ReportsService.getTaxGSTReport(req.tenantId, { startDate, endDate });
            res.json({ success: true, data: report });
        }
        catch (err) {
            next(err);
        }
    }
    static getCustomerAging(req, res, next) {
        try {
            const report = ReportsService.getCustomerKhataAgingReport(req.tenantId);
            res.json({ success: true, data: report });
        }
        catch (err) {
            next(err);
        }
    }
}
