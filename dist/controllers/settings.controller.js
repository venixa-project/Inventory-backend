import { SettingsService } from '../services/settings.service.js';
export class SettingsController {
    static getShopSettings(req, res, next) {
        try {
            const settings = SettingsService.getShopSettings(req.tenantId);
            res.json({ success: true, data: settings });
        }
        catch (err) {
            next(err);
        }
    }
    static updateShopSettings(req, res, next) {
        try {
            const settings = SettingsService.updateShopSettings(req.tenantId, req.body, req.user?.role);
            res.json({ success: true, message: 'Store settings updated', data: settings });
        }
        catch (err) {
            next(err);
        }
    }
    static getPlatformIntegrations(_req, res, next) {
        try {
            const integrations = SettingsService.getPlatformIntegrations();
            res.json({ success: true, data: integrations });
        }
        catch (err) {
            next(err);
        }
    }
    static updatePlatformIntegrations(req, res, next) {
        try {
            const integrations = SettingsService.updatePlatformIntegrations(req.body);
            res.json({ success: true, message: 'Platform integrations updated', data: integrations });
        }
        catch (err) {
            next(err);
        }
    }
    static getBackup(req, res, next) {
        try {
            const backup = SettingsService.getTenantBackup(req.tenantId);
            res.json({ success: true, data: backup });
        }
        catch (err) {
            next(err);
        }
    }
    static restoreBackup(req, res, next) {
        try {
            const result = SettingsService.restoreTenantBackup(req.tenantId, req.body);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
