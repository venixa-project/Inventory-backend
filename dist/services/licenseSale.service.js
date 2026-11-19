import { db } from '../models/db.js';
import { AppError } from '../middlewares/error.middleware.js';
export class LicenseSaleService {
    static getAllSales(filters) {
        let sales = db.get('licenseSales');
        if (filters?.plan && filters.plan !== 'all') {
            sales = sales.filter((s) => s.plan === filters.plan);
        }
        if (filters?.status && filters.status !== 'all') {
            sales = sales.filter((s) => s.status === filters.status);
        }
        if (filters?.startDate) {
            sales = sales.filter((s) => s.date >= filters.startDate);
        }
        if (filters?.endDate) {
            sales = sales.filter((s) => s.date <= filters.endDate);
        }
        return sales;
    }
    static recordSale(data) {
        const sales = db.get('licenseSales');
        const newId = `LIC-INV-${Date.now().toString().slice(-6)}`;
        const newSale = {
            ...data,
            id: newId,
            createdAt: new Date().toISOString(),
        };
        sales.unshift(newSale);
        db.set('licenseSales', sales);
        return newSale;
    }
    static updateSaleStatus(id, status) {
        const sales = db.get('licenseSales');
        const index = sales.findIndex((s) => s.id === id);
        if (index === -1) {
            throw new AppError(`License sale invoice '${id}' not found.`, 404);
        }
        sales[index].status = status;
        db.set('licenseSales', sales);
        return sales[index];
    }
}
