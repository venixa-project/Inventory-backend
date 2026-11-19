import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { LicenseSaleService } from '../services/licenseSale.service.js';

export class LicenseSaleController {
  public static getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, plan, status } = req.query as Record<string, string>;
      const sales = LicenseSaleService.getAllSales({ startDate, endDate, plan, status });
      res.json({ success: true, count: sales.length, data: sales });
    } catch (err) {
      next(err);
    }
  }

  public static create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sale = LicenseSaleService.recordSale(req.body);
      res.status(201).json({ success: true, message: 'License sale invoice created', data: sale });
    } catch (err) {
      next(err);
    }
  }

  public static updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const updated = LicenseSaleService.updateSaleStatus(id, status);
      res.json({ success: true, message: 'License sale status updated', data: updated });
    } catch (err) {
      next(err);
    }
  }
}
