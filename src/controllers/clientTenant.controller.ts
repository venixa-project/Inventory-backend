import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { ClientTenantService } from '../services/clientTenant.service.js';

export class ClientTenantController {
  public static getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, search, startDate, endDate } = req.query as Record<string, string>;
      const clients = ClientTenantService.getAllClients({ status, search, startDate, endDate });
      res.json({ success: true, count: clients.length, data: clients });
    } catch (err) {
      next(err);
    }
  }

  public static getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const client = ClientTenantService.getClientById(id);
      res.json({ success: true, data: client });
    } catch (err) {
      next(err);
    }
  }

  public static create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const client = ClientTenantService.createClient(req.body);
      res.status(201).json({ success: true, message: 'Client tenant onboarded successfully', data: client });
    } catch (err) {
      next(err);
    }
  }

  public static update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = ClientTenantService.updateClient(id, req.body);
      res.json({ success: true, message: 'Client details updated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = ClientTenantService.deleteClient(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static toggleStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = ClientTenantService.toggleClientStatus(id);
      res.json({ success: true, message: `Status updated to ${updated.status}`, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static approve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = ClientTenantService.approveClient(id);
      res.json({ success: true, message: 'Store tenant approved and activated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static activate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = ClientTenantService.activateClient(id);
      res.json({ success: true, message: 'Store tenant activated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static deactivate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = ClientTenantService.deactivateClient(id);
      res.json({ success: true, message: 'Store tenant deactivated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static block(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = ClientTenantService.blockClient(id);
      res.json({ success: true, message: 'Store tenant blocked', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static regeneratePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = ClientTenantService.regenerateCredentials(id);
      res.json({ success: true, message: 'Client credentials refreshed', data: result });
    } catch (err) {
      next(err);
    }
  }

  public static getMetrics(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const metrics = ClientTenantService.getPlatformMetrics();
      res.json({ success: true, data: metrics });
    } catch (err) {
      next(err);
    }
  }
}
