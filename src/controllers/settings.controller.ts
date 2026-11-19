import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { SettingsService } from '../services/settings.service.js';

export class SettingsController {
  public static getShopSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = SettingsService.getShopSettings(req.tenantId!);
      res.json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }

  public static updateShopSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const settings = SettingsService.updateShopSettings(req.tenantId!, req.body, req.user?.role);
      res.json({ success: true, message: 'Store settings updated', data: settings });
    } catch (err) {
      next(err);
    }
  }

  public static getPlatformIntegrations(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const integrations = SettingsService.getPlatformIntegrations();
      res.json({ success: true, data: integrations });
    } catch (err) {
      next(err);
    }
  }

  public static updatePlatformIntegrations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const integrations = SettingsService.updatePlatformIntegrations(req.body);
      res.json({ success: true, message: 'Platform integrations updated', data: integrations });
    } catch (err) {
      next(err);
    }
  }

  public static getBackup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const backup = SettingsService.getTenantBackup(req.tenantId!);
      res.json({ success: true, data: backup });
    } catch (err) {
      next(err);
    }
  }

  public static restoreBackup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = SettingsService.restoreTenantBackup(req.tenantId!, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
