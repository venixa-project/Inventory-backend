import { ItemService } from '../services/item.service.js';
export class ItemController {
    static getAll(req, res, next) {
        try {
            const { category, lowStock, search } = req.query;
            const items = ItemService.getItems(req.tenantId, {
                category,
                lowStock: lowStock === 'true',
                search,
            });
            res.json({ success: true, count: items.length, data: items });
        }
        catch (err) {
            next(err);
        }
    }
    static getById(req, res, next) {
        try {
            const id = req.params.id;
            const item = ItemService.getItemById(req.tenantId, id);
            res.json({ success: true, data: item });
        }
        catch (err) {
            next(err);
        }
    }
    static getByBarcode(req, res, next) {
        try {
            const barcode = req.params.barcode;
            const item = ItemService.getItemByBarcode(req.tenantId, barcode);
            res.json({ success: true, data: item });
        }
        catch (err) {
            next(err);
        }
    }
    static create(req, res, next) {
        try {
            const item = ItemService.createItem(req.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Item created successfully', data: item });
        }
        catch (err) {
            next(err);
        }
    }
    static bulkCreate(req, res, next) {
        try {
            const itemsList = Array.isArray(req.body) ? req.body : req.body.items || [];
            const created = ItemService.bulkCreateItems(req.tenantId, itemsList);
            res.status(201).json({
                success: true,
                message: `Successfully imported ${created.length} products into catalog`,
                count: created.length,
                data: created,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static update(req, res, next) {
        try {
            const id = req.params.id;
            const updated = ItemService.updateItem(req.tenantId, id, req.body);
            res.json({ success: true, message: 'Item updated successfully', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static delete(req, res, next) {
        try {
            const id = req.params.id;
            const result = ItemService.deleteItem(req.tenantId, id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    static adjustStock(req, res, next) {
        try {
            const id = req.params.id;
            const { change, reason, note } = req.body;
            const result = ItemService.adjustStock(req.tenantId, id, Number(change), reason, note);
            res.json({ success: true, message: 'Stock adjusted successfully', data: result });
        }
        catch (err) {
            next(err);
        }
    }
    // Composite Kits
    static getKits(req, res, next) {
        try {
            const kits = ItemService.getKits(req.tenantId);
            res.json({ success: true, count: kits.length, data: kits });
        }
        catch (err) {
            next(err);
        }
    }
    static getKitById(req, res, next) {
        try {
            const id = req.params.id;
            const kit = ItemService.getKitById(req.tenantId, id);
            res.json({ success: true, data: kit });
        }
        catch (err) {
            next(err);
        }
    }
    static createKit(req, res, next) {
        try {
            const kit = ItemService.createKit(req.tenantId, req.body);
            res.status(201).json({ success: true, message: 'Composite kit created', data: kit });
        }
        catch (err) {
            next(err);
        }
    }
    static updateKit(req, res, next) {
        try {
            const id = req.params.id;
            const updated = ItemService.updateKit(req.tenantId, id, req.body);
            res.json({ success: true, message: 'Composite kit updated', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static deleteKit(req, res, next) {
        try {
            const id = req.params.id;
            const result = ItemService.deleteKit(req.tenantId, id);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
    // Stock logs
    static getStockLogs(req, res, next) {
        try {
            const logs = ItemService.getStockLogs(req.tenantId);
            res.json({ success: true, count: logs.length, data: logs });
        }
        catch (err) {
            next(err);
        }
    }
    static updateStockLog(req, res, next) {
        try {
            const id = req.params.id;
            const { recomputeStock = true, ...updates } = req.body;
            const updated = ItemService.updateStockLog(req.tenantId, id, updates, recomputeStock);
            res.json({ success: true, message: 'Stock log updated successfully', data: updated });
        }
        catch (err) {
            next(err);
        }
    }
    static deleteStockLog(req, res, next) {
        try {
            const id = req.params.id;
            const revertStock = req.query.revertStock !== 'false';
            const result = ItemService.deleteStockLog(req.tenantId, id, revertStock);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
