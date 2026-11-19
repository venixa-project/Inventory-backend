import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { SupplierService } from '../services/supplier.service.js';
import { DocumentService } from '../services/document.service.js';

export class SupplierController {
  public static getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const suppliers = SupplierService.getSuppliers(req.tenantId!);
      res.json({ success: true, count: suppliers.length, data: suppliers });
    } catch (err) {
      next(err);
    }
  }

  public static getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const supplier = SupplierService.getSupplierById(req.tenantId!, id);
      res.json({ success: true, data: supplier });
    } catch (err) {
      next(err);
    }
  }

  public static create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const supplier = SupplierService.createSupplier(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: 'Supplier created successfully', data: supplier });
    } catch (err) {
      next(err);
    }
  }

  public static update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = SupplierService.updateSupplier(req.tenantId!, id, req.body);
      res.json({ success: true, message: 'Supplier updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static getLedger(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const ledger = SupplierService.getSupplierLedger(req.tenantId!, id);
      res.json({ success: true, data: ledger });
    } catch (err) {
      next(err);
    }
  }

  // Purchase Orders
  public static getPOs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pos = SupplierService.getPurchaseOrders(req.tenantId!, req.query.supplierId as string);
      res.json({ success: true, count: pos.length, data: pos });
    } catch (err) {
      next(err);
    }
  }

  public static getPOById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const po = SupplierService.getPOById(req.tenantId!, id);
      res.json({ success: true, data: po });
    } catch (err) {
      next(err);
    }
  }

  public static createPO(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const po = SupplierService.createPO(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: `PO ${po.poNumber} created`, data: po });
    } catch (err) {
      next(err);
    }
  }

  public static markPOReceived(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const po = SupplierService.markPOReceived(req.tenantId!, id);
      res.json({ success: true, message: `PO inwarded into inventory`, data: po });
    } catch (err) {
      next(err);
    }
  }

  // Payments, Debit notes, Contra offsets
  public static recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payment = SupplierService.recordVendorPayment(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: 'Vendor payment recorded', data: payment });
    } catch (err) {
      next(err);
    }
  }

  public static createPurchaseReturn(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const debitNote = SupplierService.createPurchaseReturn(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: `Debit note ${debitNote.returnNumber} issued`, data: debitNote });
    } catch (err) {
      next(err);
    }
  }

  public static executeContra(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const contra = SupplierService.executeContraOffset(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: 'Contra offset executed successfully', data: contra });
    } catch (err) {
      next(err);
    }
  }

  public static printPO(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const html = DocumentService.generatePOHtml(id, req.tenantId!);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }

  public static deleteSupplier(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = SupplierService.deleteSupplier(req.tenantId!, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static deletePO(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = SupplierService.deletePO(req.tenantId!, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
