import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { FestivalService } from '../services/festival.service.js';

export class FestivalController {
  public static getPlans(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const plans = FestivalService.getPlans(req.tenantId!);
      res.json({ success: true, count: plans.length, data: plans });
    } catch (err) {
      next(err);
    }
  }

  public static createPlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const plan = FestivalService.createPlan(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: 'Seasonal plan created', data: plan });
    } catch (err) {
      next(err);
    }
  }

  public static updatePlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const plan = FestivalService.updatePlan(req.tenantId!, id as string, req.body);
      res.json({ success: true, message: 'Seasonal plan updated', data: plan });
    } catch (err) {
      next(err);
    }
  }

  public static deletePlan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      FestivalService.deletePlan(req.tenantId!, id as string);
      res.json({ success: true, message: 'Seasonal plan deleted' });
    } catch (err) {
      next(err);
    }
  }

  public static getForecast(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const festivalId = req.params.festivalId as string;
      const scenario = req.query.scenario as string | undefined;
      const forecast = FestivalService.calculateForecast(req.tenantId!, festivalId, scenario);
      res.json({ success: true, data: forecast });
    } catch (err) {
      next(err);
    }
  }

  public static async getRecommendations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const festivalId = req.params.festivalId as string;
      const recs = await FestivalService.getAiRecommendations(req.tenantId!, festivalId);
      res.json({ success: true, count: recs.length, data: recs });
    } catch (err) {
      next(err);
    }
  }

  public static generatePO(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = FestivalService.generatePOFromForecast(req.tenantId!, req.body);
      res.status(201).json({
        success: true,
        message: `Draft PO generated successfully with ${result.orderedItemsCount} items`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
