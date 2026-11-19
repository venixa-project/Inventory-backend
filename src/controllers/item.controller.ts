import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { ItemService } from '../services/item.service.js';

export class ItemController {
  public static getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { category, lowStock, search } = req.query as Record<string, string>;
      const items = ItemService.getItems(req.tenantId!, {
        category,
        lowStock: lowStock === 'true',
        search,
      });
      res.json({ success: true, count: items.length, data: items });
    } catch (err) {
      next(err);
    }
  }

  public static getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const item = ItemService.getItemById(req.tenantId!, id);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  public static getByBarcode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const barcode = req.params.barcode as string;
      const item = ItemService.getItemByBarcode(req.tenantId!, barcode);
      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  }

  public static create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = ItemService.createItem(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: 'Item created successfully', data: item });
    } catch (err) {
      next(err);
    }
  }

  public static bulkCreate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const itemsList = Array.isArray(req.body) ? req.body : req.body.items || [];
      const created = ItemService.bulkCreateItems(req.tenantId!, itemsList);
      res.status(201).json({
        success: true,
        message: `Successfully imported ${created.length} products into catalog`,
        count: created.length,
        data: created,
      });
    } catch (err) {
      next(err);
    }
  }

  public static update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = ItemService.updateItem(req.tenantId!, id, req.body);
      res.json({ success: true, message: 'Item updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = ItemService.deleteItem(req.tenantId!, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  public static adjustStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { change, reason, note } = req.body;
      const result = ItemService.adjustStock(req.tenantId!, id, Number(change), reason, note);
      res.json({ success: true, message: 'Stock adjusted successfully', data: result });
    } catch (err) {
      next(err);
    }
  }

  // Composite Kits
  public static getKits(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const kits = ItemService.getKits(req.tenantId!);
      res.json({ success: true, count: kits.length, data: kits });
    } catch (err) {
      next(err);
    }
  }

  public static getKitById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const kit = ItemService.getKitById(req.tenantId!, id);
      res.json({ success: true, data: kit });
    } catch (err) {
      next(err);
    }
  }

  public static createKit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const kit = ItemService.createKit(req.tenantId!, req.body);
      res.status(201).json({ success: true, message: 'Composite kit created', data: kit });
    } catch (err) {
      next(err);
    }
  }

  public static updateKit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const updated = ItemService.updateKit(req.tenantId!, id, req.body);
      res.json({ success: true, message: 'Composite kit updated', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static deleteKit(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = ItemService.deleteKit(req.tenantId!, id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // Stock logs
  public static getStockLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const logs = ItemService.getStockLogs(req.tenantId!);
      res.json({ success: true, count: logs.length, data: logs });
    } catch (err) {
      next(err);
    }
  }

  public static updateStockLog(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { recomputeStock = true, ...updates } = req.body;
      const updated = ItemService.updateStockLog(req.tenantId!, id, updates, recomputeStock);
      res.json({ success: true, message: 'Stock log updated successfully', data: updated });
    } catch (err) {
      next(err);
    }
  }

  public static deleteStockLog(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const revertStock = req.query.revertStock !== 'false';
      const result = ItemService.deleteStockLog(req.tenantId!, id, revertStock);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
