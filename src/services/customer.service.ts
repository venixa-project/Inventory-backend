import { db } from '../models/db.js';
import { Customer } from '../types/index.js';
import { AppError } from '../middlewares/error.middleware.js';

export class CustomerService {
  public static getCustomers(
    tenantId: string,
    filters?: { search?: string; status?: 'all' | 'due' | 'clear' }
  ) {
    let customers = db.get('customers');
    if (tenantId !== 'ALL') {
      customers = customers.filter((c) => c.tenantId === tenantId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.companyName && c.companyName.toLowerCase().includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.gstin && c.gstin.toLowerCase().includes(q))
      );
    }

    if (filters?.status === 'due') {
      customers = customers.filter((c) => c.dueAmount > 0);
    } else if (filters?.status === 'clear') {
      customers = customers.filter((c) => c.dueAmount <= 0);
    }

    return customers;
  }

  public static getCustomerById(tenantId: string, id: string) {
    const customers = db.get('customers');
    const customer = customers.find(
      (c) => (tenantId === 'ALL' || c.tenantId === tenantId) && c.id === id
    );
    if (!customer) {
      throw new AppError(`Customer with ID '${id}' not found.`, 404);
    }
    return customer;
  }

  public static createCustomer(
    tenantId: string,
    data: Omit<Customer, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
    }
  ) {
    const customers = db.get('customers');
    const resolvedId = data.id || `cust-${Date.now().toString().slice(-6)}`;

    // Idempotency check
    const existing = customers.find(
      (c) => (tenantId === 'ALL' || c.tenantId === tenantId) && c.id === resolvedId
    );
    if (existing) {
      return existing;
    }

    const newCustomer: Customer = {
      ...data,
      id: resolvedId,
      tenantId,
      dueAmount: data.dueAmount || 0,
      createdAt: data.createdAt || new Date().toISOString().substring(0, 10),
      updatedAt: new Date().toISOString(),
    };

    customers.unshift(newCustomer);
    db.set('customers', customers);
    return newCustomer;
  }

  public static updateCustomer(tenantId: string, id: string, updates: Partial<Customer>) {
    const customers = db.get('customers');
    const index = customers.findIndex(
      (c) => (tenantId === 'ALL' || c.tenantId === tenantId) && c.id === id
    );
    if (index === -1) {
      throw new AppError(`Customer with ID '${id}' not found.`, 404);
    }

    const updated = {
      ...customers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    customers[index] = updated;
    db.set('customers', customers);
    return updated;
  }

  public static recordPayment(
    tenantId: string,
    id: string,
    amount: number,
    paymentMode?: string,
    notes?: string
  ) {
    const customer = this.getCustomerById(tenantId, id);
    const newDue = Number(Math.max(0, customer.dueAmount - amount).toFixed(2));

    // If customer paid via cash, reflect in the active cash register shift
    if (paymentMode === 'Cash') {
      const shifts = db.get('cashShifts');
      const activeShift = shifts.find((s) => s.tenantId === tenantId && s.status === 'Open');
      if (activeShift) {
        activeShift.cashSales = Number((activeShift.cashSales + amount).toFixed(2));
        activeShift.expectedClosingCash = Number(
          (activeShift.openingCash + activeShift.cashSales - activeShift.cashExpenses).toFixed(2)
        );
        db.set('cashShifts', shifts);
      }
    }

    return this.updateCustomer(tenantId, id, { dueAmount: newDue });
  }

  public static getCustomerLedger(tenantId: string, id: string) {
    const customer = this.getCustomerById(tenantId, id);

    const bills = db
      .get('bills')
      .filter((b) => (tenantId === 'ALL' || b.tenantId === tenantId) && b.customerId === customer.id);

    const salesOrders = db
      .get('salesOrders')
      .filter((so) => (tenantId === 'ALL' || so.tenantId === tenantId) && so.customerId === customer.id);

    const deliveryChallans = db
      .get('deliveryChallans')
      .filter((dc) => (tenantId === 'ALL' || dc.tenantId === tenantId) && dc.customerId === customer.id);

    const contraOffsets = db
      .get('contraOffsets')
      .filter((co) => (tenantId === 'ALL' || co.tenantId === tenantId) && co.customerId === customer.id);

    const totalBilled = Number(bills.reduce((sum, b) => sum + (b.total || 0), 0).toFixed(2));
    const totalPaid = Number(bills.reduce((sum, b) => sum + (b.paid || 0), 0).toFixed(2));
    const totalContraSettled = Number(contraOffsets.reduce((sum, co) => sum + (co.offsetAmount || 0), 0).toFixed(2));

    return {
      customer,
      summary: {
        currentDueAmount: customer.dueAmount,
        creditLimit: customer.creditLimit || 0,
        totalBilled,
        totalPaid,
        totalContraSettled,
        totalOrdersCount: salesOrders.length,
        totalChallansCount: deliveryChallans.length,
        totalInvoicesCount: bills.length,
      },
      bills,
      salesOrders,
      deliveryChallans,
      contraOffsets,
    };
  }

  public static deleteCustomer(tenantId: string, id: string) {
    const customers = db.get('customers');
    const filtered = customers.filter(
      (c) => !((tenantId === 'ALL' || c.tenantId === tenantId) && c.id === id)
    );
    if (filtered.length === customers.length) {
      throw new AppError(`Customer with ID '${id}' not found.`, 404);
    }
    db.set('customers', filtered);
    return { success: true, message: `Customer ${id} deleted.` };
  }
}
