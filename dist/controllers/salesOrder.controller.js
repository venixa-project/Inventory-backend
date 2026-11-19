import { SalesOrderService } from '../services/salesOrder.service.js';
import { DocumentService } from '../services/document.service.js';
export class SalesOrderController {
    static getOrders(req, res, next) {
        try {
            const { status, customerId, search, startDate, endDate, category } = req.query;
            const orders = SalesOrderService.getSalesOrders(req.tenantId, {
                status,
                customerId,
                search,
                startDate,
                endDate,
                category,
            });
            res.json({ success: true, count: orders.length, data: orders });
        }
        catch (err) {
            next(err);
        }
    }
    static getOrderById(req, res, next) {
        try {
            const id = req.params.id;
            const order = SalesOrderService.getOrderById(req.tenantId, id);
            res.json({ success: true, data: order });
        }
        catch (err) {
            next(err);
        }
    }
    static deleteOrder(req, res, next) {
        try {
            const id = req.params.id;
            const result = SalesOrderService.deleteOrder(req.tenantId, id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static createOrder(req, res, next) {
        try {
            const order = SalesOrderService.createSalesOrder(req.tenantId, req.body);
            res.status(201).json({ success: true, message: `Sales order ${order.soNumber} created`, data: order });
        }
        catch (err) {
            next(err);
        }
    }
    static updateOrder(req, res, next) {
        try {
            const id = req.params.id;
            const updated = SalesOrderService.updateSalesOrder(req.tenantId, id, req.body);
            res.json({ success: true, message: 'Sales order updated successfully', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static updateStatus(req, res, next) {
        try {
            const id = req.params.id;
            const { status } = req.body;
            const updated = SalesOrderService.updateSOStatus(req.tenantId, id, status);
            res.json({ success: true, message: 'Sales order status updated', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static getPackages(req, res, next) {
        try {
            const { status, search, startDate, endDate } = req.query;
            const pkgs = SalesOrderService.getPackages(req.tenantId, { status, search, startDate, endDate });
            res.json({ success: true, count: pkgs.length, data: pkgs });
        }
        catch (err) {
            next(err);
        }
    }
    static createPackage(req, res, next) {
        try {
            const { soId, carrier, trackingNumber } = req.body;
            const pkg = SalesOrderService.createPackageFromSO(req.tenantId, soId, carrier, trackingNumber);
            res.status(201).json({ success: true, message: `Package ${pkg.packageNumber} generated`, data: pkg });
        }
        catch (err) {
            next(err);
        }
    }
    static updatePackageStatus(req, res, next) {
        try {
            const id = req.params.id;
            const { status, carrier, trackingNumber } = req.body;
            const updated = SalesOrderService.updatePackageStatus(req.tenantId, id, status, carrier, trackingNumber);
            res.json({ success: true, message: `Package status updated to ${status}`, data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static getPackageById(req, res, next) {
        try {
            const id = req.params.id;
            const pkg = SalesOrderService.getPackageById(req.tenantId, id);
            res.json({ success: true, data: pkg });
        }
        catch (err) {
            next(err);
        }
    }
    static deletePackage(req, res, next) {
        try {
            const id = req.params.id;
            const result = SalesOrderService.deletePackage(req.tenantId, id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static printPackingSlip(req, res, next) {
        try {
            const id = req.params.id;
            const html = DocumentService.generatePackingSlipHtml(id, req.tenantId);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    }
    static getChallans(req, res, next) {
        try {
            const { status, customerId, search, startDate, endDate, category } = req.query;
            const challans = SalesOrderService.getChallans(req.tenantId, {
                status,
                customerId,
                search,
                startDate,
                endDate,
                category,
            });
            res.json({ success: true, count: challans.length, data: challans });
        }
        catch (err) {
            next(err);
        }
    }
    static getChallanById(req, res, next) {
        try {
            const id = req.params.id;
            const challan = SalesOrderService.getChallanById(req.tenantId, id);
            res.json({ success: true, data: challan });
        }
        catch (err) {
            next(err);
        }
    }
    static createChallan(req, res, next) {
        try {
            const dc = SalesOrderService.createDeliveryChallan(req.tenantId, req.body);
            res.status(201).json({ success: true, message: `Delivery challan ${dc.challanNumber} generated`, data: dc });
        }
        catch (err) {
            next(err);
        }
    }
    static updateChallan(req, res, next) {
        try {
            const id = req.params.id;
            const updated = SalesOrderService.updateChallan(req.tenantId, id, req.body);
            res.json({ success: true, message: 'Challan updated successfully', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static updateChallanStatus(req, res, next) {
        try {
            const id = req.params.id;
            const { status } = req.body;
            const updated = SalesOrderService.updateChallanStatus(req.tenantId, id, status);
            res.json({ success: true, message: `Challan status updated to ${status}`, data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static deleteChallan(req, res, next) {
        try {
            const id = req.params.id;
            const result = SalesOrderService.deleteChallan(req.tenantId, id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static printChallan(req, res, next) {
        try {
            const id = req.params.id;
            const html = DocumentService.generateChallanHtml(id, req.tenantId);
            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        }
        catch (err) {
            next(err);
        }
    }
}
