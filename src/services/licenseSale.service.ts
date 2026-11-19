import { db } from '../models/db.js';
import { SoftwareLicenseSale } from '../types/index.js';
import { AppError } from '../middlewares/error.middleware.js';

export class LicenseSaleService {
  public static getAllSales(filters?: {
    startDate?: string;
    endDate?: string;
    plan?: string;
    status?: string;
  }) {
    let sales = db.get('licenseSales');

    if (filters?.plan && filters.plan !== 'all') {
      sales = sales.filter((s) => s.plan === filters.plan);
    }

    if (filters?.status && filters.status !== 'all') {
      sales = sales.filter((s) => s.status === filters.status);
    }

    if (filters?.startDate) {
      sales = sales.filter((s) => s.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      sales = sales.filter((s) => s.date <= filters.endDate!);
    }

    return sales;
  }

  public static recordSale(data: Omit<SoftwareLicenseSale, 'id' | 'createdAt'>) {
    const sales = db.get('licenseSales');
    const newId = `LIC-INV-${Date.now().toString().slice(-6)}`;

    const newSale: SoftwareLicenseSale = {
      ...data,
      id: newId,
      createdAt: new Date().toISOString(),
    };

    sales.unshift(newSale);
    db.set('licenseSales', sales);
    return newSale;
  }

  public static updateSaleStatus(id: string, status: SoftwareLicenseSale['status']) {
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
