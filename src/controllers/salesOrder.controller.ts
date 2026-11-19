import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { SalesOrderService } from '../services/salesOrder.service.js';
import { DocumentService } from '../services/document.service.js';

export class SalesOrderController {
  public static getOrders(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, customerId, search, startDate, endDate, category } = req.query as Record<string, string>;
      const orders = SalesOrderService.getSalesOrders(req.tenantId!, {
        status,
        customerId,
        search,
        startDate,
        endDate,
        category,
      });
      res.json({ success: true, count: orders.length, data: orders });
    } catch (err) {
      next(err);
    }
  }

  public static getOrderById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const order = SalesOrderService.getOrderById(req.tenantId!, id);
      res.json({ success: true, data: order });
    } catch (err) {
      next(err);
    }
  }

  public static deleteOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = SalesOrderService.deleteOrder(req.tenantId!, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static createOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const order = SalesOrderService.createSalesOrder(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: `Sales order ${order.soNumber} created`, data: order });
    } catch (err) {
      next(err);
    }
  }

  public static updateOrder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = SalesOrderService.updateSalesOrder(req.tenantId!, id, req.body);
      res.json({ success: true, message: 'Sales order updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const updated = SalesOrderService.updateSOStatus(req.tenantId!, id, status);
      res.json({ success: true, message: 'Sales order status updated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static getPackages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, search, startDate, endDate } = req.query as Record<string, string>;
      const pkgs = SalesOrderService.getPackages(req.tenantId!, { status, search, startDate, endDate });
      res.json({ success: true, count: pkgs.length, data: pkgs });
    } catch (err) {
      next(err);
    }
  }

  public static createPackage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { soId, carrier, trackingNumber } = req.body;
      const pkg = SalesOrderService.createPackageFromSO(req.tenantId!, soId, carrier, trackingNumber);
      res.status(201).json({ success: true, message: `Package ${pkg.packageNumber} generated`, data: pkg });
    } catch (err) {
      next(err);
    }
  }

  public static updatePackageStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status, carrier, trackingNumber } = req.body;
      const updated = SalesOrderService.updatePackageStatus(req.tenantId!, id, status, carrier, trackingNumber);
      res.json({ success: true, message: `Package status updated to ${status}`, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static getPackageById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const pkg = SalesOrderService.getPackageById(req.tenantId!, id);
      res.json({ success: true, data: pkg });
    } catch (err) {
      next(err);
    }
  }

  public static deletePackage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = SalesOrderService.deletePackage(req.tenantId!, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static printPackingSlip(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const html = DocumentService.generatePackingSlipHtml(id, req.tenantId!);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  public static getChallans(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, customerId, search, startDate, endDate, category } = req.query as Record<string, string>;
      const challans = SalesOrderService.getChallans(req.tenantId!, {
        status,
        customerId,
        search,
        startDate,
        endDate,
        category,
      });
      res.json({ success: true, count: challans.length, data: challans });
    } catch (err) {
      next(err);
    }
  }

  public static getChallanById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const challan = SalesOrderService.getChallanById(req.tenantId!, id);
      res.json({ success: true, data: challan });
    } catch (err) {
      next(err);
    }
  }

  public static createChallan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dc = SalesOrderService.createDeliveryChallan(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: `Delivery challan ${dc.challanNumber} generated`, data: dc });
    } catch (err) {
      next(err);
    }
  }

  public static updateChallan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = SalesOrderService.updateChallan(req.tenantId!, id, req.body);
      res.json({ success: true, message: 'Challan updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static updateChallanStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const updated = SalesOrderService.updateChallanStatus(req.tenantId!, id, status);
      res.json({ success: true, message: `Challan status updated to ${status}`, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static deleteChallan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = SalesOrderService.deleteChallan(req.tenantId!, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static printChallan(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const html = DocumentService.generateChallanHtml(id, req.tenantId!);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }
}
