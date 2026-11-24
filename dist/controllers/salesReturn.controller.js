import { SalesReturnService } from '../services/salesReturn.service.js';
export class SalesReturnController {
    static getReturns(req, res, next) {
        try {
            const returns = SalesReturnService.getReturns(req.tenantId);
            res.json({ success: true, count: returns.length, data: returns });
        }
        catch (err) {
            next(err);
        }
    }
    static getReturnById(req, res, next) {
        try {
            const id = req.params.id;
            const ret = SalesReturnService.getReturnById(req.tenantId, id);
            res.json({ success: true, data: ret });
        }
        catch (err) {
            next(err);
        }
    }
    static createReturn(req, res, next) {
        try {
            const ret = SalesReturnService.createReturn(req.tenantId, req.body, req.user);
            res.status(201).json({
                success: true,
                message: `Sales return / Credit Note ${ret.returnNumber} created successfully.`,
                data: ret,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static deleteReturn(req, res, next) {
        try {
            const id = req.params.id;
            SalesReturnService.deleteReturn(req.tenantId, id);
            res.json({
                success: true,
                message: `Sales return ${id} deleted successfully.`,
            });
        }
        catch (err) {
            next(err);
        }
    }
}
