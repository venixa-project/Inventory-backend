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

  public static getForecast(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const festivalId = req.params.festivalId as string;
      const forecast = FestivalService.calculateForecast(req.tenantId!, festivalId);
      res.json({ success: true, data: forecast });
    } catch (err) {
      next(err);
    }
  }

  public static generatePO(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const po = FestivalService.generatePOFromForecast(req.tenantId!, req.body);
      res.status(201).json({
        success: true,
        message: `Draft PO ${po.poNumber} generated successfully for festival rush`,
        data: po,
      });
    } catch (err) {
      next(err);
    }
  }
}
