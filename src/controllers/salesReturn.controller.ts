import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { SalesReturnService } from '../services/salesReturn.service.js';

export class SalesReturnController {
  public static getReturns(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const returns = SalesReturnService.getReturns(req.tenantId!);
      res.json({ success: true, count: returns.length, data: returns });
    } catch (err) {
      next(err);
    }
  }

  public static getReturnById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const ret = SalesReturnService.getReturnById(req.tenantId!, id);
      res.json({ success: true, data: ret });
    } catch (err) {
      next(err);
    }
  }

  public static createReturn(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ret = SalesReturnService.createReturn(req.tenantId!, req.body, req.user);
      res.status(201).json({
        success: true,
        message: `Sales return / Credit Note ${ret.returnNumber} created successfully.`,
        data: ret,
      });
    } catch (err) {
      next(err);
    }
  }

  public static deleteReturn(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      SalesReturnService.deleteReturn(req.tenantId!, id);
      res.json({
        success: true,
        message: `Sales return ${id} deleted successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }
}
