import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { BillingService } from '../services/billing.service.js';
import { DocumentService } from '../services/document.service.js';

export class BillingController {
  public static getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate, customerId, paymentMode, search } = req.query as Record<string, string>;
      const bills = BillingService.getBills(req.tenantId!, { startDate, endDate, customerId, paymentMode, search });
      res.json({ success: true, count: bills.length, data: bills });
    } catch (err) {
      next(err);
    }
  }

  public static getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const bill = BillingService.getBillById(req.tenantId!, id);
      res.json({ success: true, data: bill });
    } catch (err) {
      next(err);
    }
  }

  public static checkout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const bill = BillingService.checkout(req.tenantId!, req.body);
      res.status(201).json({
        success: true,
        message: `Bill ${bill.billNumber} processed successfully`,
        data: bill,
      });
    } catch (err) {
      next(err);
    }
  }

  public static update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = BillingService.updateBill(req.tenantId!, id, req.body);
      res.json({ success: true, message: 'Bill updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static printInvoice(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const html = DocumentService.generateInvoiceHtml(id, req.tenantId!);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  public static delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = BillingService.deleteBill(req.tenantId!, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static settleUpiPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = BillingService.recordUpiSettlement(req.tenantId!, req.body);
      res.json({
        success: true,
        message: 'UPI payment verified and settled to destination bank account.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getPaymentRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const requests = BillingService.getPaymentRequests(req.tenantId!);
      res.json({ success: true, count: requests.length, data: requests });
    } catch (err) {
      next(err);
    }
  }

  public static createPaymentRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = BillingService.createPaymentRequest(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: 'Payment request created', data: result });
    } catch (err) {
      next(err);
    }
  }

  public static markPaymentRequestPaid(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { utr } = req.body;
      const result = BillingService.markPaymentRequestPaid(req.tenantId!, id, utr);
      res.json({ success: true, message: 'Payment marked as settled', data: result });
    } catch (err) {
      next(err);
    }
  }

  public static cancelPaymentRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = BillingService.cancelPaymentRequest(req.tenantId!, id);
      res.json({ success: true, message: 'Payment request cancelled', data: result });
    } catch (err) {
      next(err);
    }
  }
}
