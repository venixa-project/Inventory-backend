import { ClientTenantService } from '../services/clientTenant.service.js';
export class ClientTenantController {
    static getAll(req, res, next) {
        try {
            const { status, search, startDate, endDate } = req.query;
            const clients = ClientTenantService.getAllClients({ status, search, startDate, endDate });
            res.json({ success: true, count: clients.length, data: clients });
        }
        catch (err) {
            next(err);
        }
    }
    static getById(req, res, next) {
        try {
            const id = req.params.id;
            const client = ClientTenantService.getClientById(id);
            res.json({ success: true, data: client });
        }
        catch (err) {
            next(err);
        }
    }
    static create(req, res, next) {
        try {
            const client = ClientTenantService.createClient(req.body);
            res.status(201).json({ success: true, message: 'Client tenant onboarded successfully', data: client });
        }
        catch (err) {
            next(err);
        }
    }
    static update(req, res, next) {
        try {
            const id = req.params.id;
            const updated = ClientTenantService.updateClient(id, req.body);
            res.json({ success: true, message: 'Client details updated', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static delete(req, res, next) {
        try {
            const id = req.params.id;
            const result = ClientTenantService.deleteClient(id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static toggleStatus(req, res, next) {
        try {
            const id = req.params.id;
            const updated = ClientTenantService.toggleClientStatus(id);
            res.json({ success: true, message: `Status updated to ${updated.status}`, data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static approve(req, res, next) {
        try {
            const id = req.params.id;
            const updated = ClientTenantService.approveClient(id);
            res.json({ success: true, message: 'Store tenant approved and activated successfully', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static activate(req, res, next) {
        try {
            const id = req.params.id;
            const updated = ClientTenantService.activateClient(id);
            res.json({ success: true, message: 'Store tenant activated', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static deactivate(req, res, next) {
        try {
            const id = req.params.id;
            const updated = ClientTenantService.deactivateClient(id);
            res.json({ success: true, message: 'Store tenant deactivated', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static block(req, res, next) {
        try {
            const id = req.params.id;
            const updated = ClientTenantService.blockClient(id);
            res.json({ success: true, message: 'Store tenant blocked', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static regeneratePassword(req, res, next) {
        try {
            const id = req.params.id;
            const result = ClientTenantService.regenerateCredentials(id);
            res.json({ success: true, message: 'Client credentials refreshed', data: result });
        }
        catch (err) {
            next(err);
        }
    }
    static getMetrics(_req, res, next) {
        try {
            const metrics = ClientTenantService.getPlatformMetrics();
            res.json({ success: true, data: metrics });
        }
        catch (err) {
            next(err);
        }
    }
}
