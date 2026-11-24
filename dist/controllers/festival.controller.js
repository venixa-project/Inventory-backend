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
    static updatePlan(req, res, next) {
        try {
            const { id } = req.params;
            const plan = FestivalService.updatePlan(req.tenantId, id, req.body);
            res.json({ success: true, message: 'Seasonal plan updated', data: plan });
        }
        catch (err) {
            next(err);
        }
    }
    static deletePlan(req, res, next) {
        try {
            const { id } = req.params;
            FestivalService.deletePlan(req.tenantId, id);
            res.json({ success: true, message: 'Seasonal plan deleted' });
        }
        catch (err) {
            next(err);
        }
    }
    static getForecast(req, res, next) {
        try {
            const festivalId = req.params.festivalId;
            const scenario = req.query.scenario;
            const forecast = FestivalService.calculateForecast(req.tenantId, festivalId, scenario);
            res.json({ success: true, data: forecast });
        }
        catch (err) {
            next(err);
        }
    }
    static async getRecommendations(req, res, next) {
        try {
            const festivalId = req.params.festivalId;
            const recs = await FestivalService.getAiRecommendations(req.tenantId, festivalId);
            res.json({ success: true, count: recs.length, data: recs });
        }
        catch (err) {
            next(err);
        }
    }
    static generatePO(req, res, next) {
        try {
            const result = FestivalService.generatePOFromForecast(req.tenantId, req.body);
            res.status(201).json({
                success: true,
                message: `Draft PO generated successfully with ${result.orderedItemsCount} items`,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
