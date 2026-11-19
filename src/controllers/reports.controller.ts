import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { ReportsService } from '../services/reports.service.js';

export class ReportsController {
  public static getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, category } = req.query as Record<string, string>;
      const summary = ReportsService.getDashboardSummary(req.tenantId!, { startDate, endDate, category });
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  public static getStaffDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { timeFilter, startDate, endDate, counterYear, pipelineYear } = req.query as Record<string, string>;
      const summary = ReportsService.getStaffDashboardSummary(req.tenantId!, {
        timeFilter: timeFilter as any,
        startDate,
        endDate,
        counterYear,
        pipelineYear,
      });
      res.json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  public static getSalesReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, category } = req.query as Record<string, string>;
      const report = ReportsService.getSalesReport(req.tenantId!, { startDate, endDate, category });
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public static getTopProducts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, category, limit } = req.query as Record<string, string>;
      const report = ReportsService.getTopProductsReport(req.tenantId!, {
        startDate,
        endDate,
        category,
        limit: limit ? parseInt(limit, 10) : undefined,
      });
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public static getStockHealth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const report = ReportsService.getStockHealthReport(req.tenantId!);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public static getTaxGST(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as Record<string, string>;
      const report = ReportsService.getTaxGSTReport(req.tenantId!, { startDate, endDate });
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public static getCustomerAging(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const report = ReportsService.getCustomerKhataAgingReport(req.tenantId!);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
}
