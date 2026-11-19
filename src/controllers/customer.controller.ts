import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { CustomerService } from '../services/customer.service.js';

export class CustomerController {
  public static getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { search, status } = req.query as { search?: string; status?: 'all' | 'due' | 'clear' };
      const customers = CustomerService.getCustomers(req.tenantId!, { search, status });
      res.json({ success: true, count: customers.length, data: customers });
    } catch (err) {
      next(err);
    }
  }

  public static getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const customer = CustomerService.getCustomerById(req.tenantId!, id);
      res.json({ success: true, data: customer });
    } catch (err) {
      next(err);
    }
  }

  public static getLedger(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const ledger = CustomerService.getCustomerLedger(req.tenantId!, id);
      res.json({ success: true, data: ledger });
    } catch (err) {
      next(err);
    }
  }

  public static create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const customer = CustomerService.createCustomer(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: 'Customer created successfully', data: customer });
    } catch (err) {
      next(err);
    }
  }

  public static update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = CustomerService.updateCustomer(req.tenantId!, id, req.body);
      res.json({ success: true, message: 'Customer updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { amount, paymentMode, notes } = req.body;
      const updated = CustomerService.recordPayment(req.tenantId!, id, Number(amount), paymentMode, notes);
      res.json({ success: true, message: 'Payment recorded and due balance updated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = CustomerService.deleteCustomer(req.tenantId!, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
