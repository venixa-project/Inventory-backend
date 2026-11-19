import { FestivalService } from '../services/festival.service.js';
export class FestivalController {
    static getPlans(req, res, next) {
        try {
            const plans = FestivalService.getPlans(req.tenantId);
            res.json({ success: true, count: plans.length, data: plans });
        }
        catch (err) {
            next(err);
        }
    }
    static createPlan(req, res, next) {
        try {
            const plan = FestivalService.createPlan(req.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Seasonal plan created', data: plan });
        }
        catch (err) {
            next(err);
        }
    }
    static getForecast(req, res, next) {
        try {
            const festivalId = req.params.festivalId;
            const forecast = FestivalService.calculateForecast(req.tenantId, festivalId);
            res.json({ success: true, data: forecast });
        }
        catch (err) {
            next(err);
        }
    }
    static generatePO(req, res, next) {
        try {
            const po = FestivalService.generatePOFromForecast(req.tenantId, req.body);
            res.status(201).json({
                success: true,
                message: `Draft PO ${po.poNumber} generated successfully for festival rush`,
                data: po,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
