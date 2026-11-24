import { db } from '../models/db.js';
import { Bill, CartItem, PaymentMode, SplitPaymentDetail } from '../types/index.js';
import { AppError } from '../middlewares/error.middleware.js';
import { ItemService } from './item.service.js';

export class BillingService {
  public static getBills(
    tenantId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      customerId?: string;
      paymentMode?: string;
      search?: string;
    }
  ) {
    let bills = db.get('bills');
    if (tenantId !== 'ALL') {
      bills = bills.filter((b) => b.tenantId === tenantId);
    }

    if (filters?.customerId) {
      bills = bills.filter((b) => b.customerId === filters.customerId);
    }

    if (filters?.paymentMode && filters.paymentMode !== 'all' && filters.paymentMode !== 'All') {
      bills = bills.filter((b) => b.paymentMode === filters.paymentMode);
    }

    if (filters?.startDate) {
      bills = bills.filter((b) => b.date >= filters.startDate!);
    }

    if (filters?.endDate) {
      bills = bills.filter((b) => b.date <= filters.endDate!);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      bills = bills.filter(
        (b) =>
          b.billNumber.toLowerCase().includes(q) ||
          (b.customerName && b.customerName.toLowerCase().includes(q)) ||
          (b.customerPhone && b.customerPhone.includes(q)) ||
          (b.notes && b.notes.toLowerCase().includes(q))
      );
    }

    return bills;
  }

  public static getBillById(tenantId: string, id: string) {
    const bills = db.get('bills');
    const bill = bills.find(
      (b) => (tenantId === 'ALL' || b.tenantId === tenantId) && (b.id === id || b.billNumber === id)
    );
    if (!bill) {
      throw new AppError(`Bill invoice '${id}' not found.`, 404);
    }
    return bill;
  }

  public static checkout(
    tenantId: string,
    checkoutData: {
      id?: string;
      billNumber?: string;
      date?: string;
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
      lines: any[];
      subtotal: number;
      gst: number;
      discount?: number;
      total: number;
      roundOff: number;
      paid: number;
      paymentMode: PaymentMode;
      splitDetails?: SplitPaymentDetail;
      due: number;
      cashTendered?: number;
      changeReturned?: number;
      upiReference?: string;
      notes?: string;
    }
  ) {
    if (!checkoutData.lines || checkoutData.lines.length === 0) {
      throw new AppError('Cannot checkout with an empty cart.', 400);
    }

    if (checkoutData.due > 0 && !checkoutData.customerId) {
      throw new AppError('Customer selection is required when there is a pending credit due balance.', 400);
    }

    const bills = db.get('bills');
    const billId = checkoutData.id || `bill-${Date.now()}`;

    // Check if bill already exists (idempotency)
    const existing = bills.find((b) => (tenantId === 'ALL' || b.tenantId === tenantId) && b.id === billId);
    if (existing) {
      return existing;
    }

    const count = bills.length + 1;
    const billNumber = checkoutData.billNumber || `BILL-${String(count).padStart(4, '0')}`;

    const newBill: Bill = {
      id: billId,
      tenantId,
      billNumber,
      date: checkoutData.date || new Date().toISOString().replace('T', ' ').substring(0, 16),
      customerId: checkoutData.customerId,
      customerName: checkoutData.customerName || 'Walk-in Customer',
      customerPhone: checkoutData.customerPhone,
      lines: checkoutData.lines,
      subtotal: Number(checkoutData.subtotal.toFixed(2)),
      gst: Number((checkoutData.gst || 0).toFixed(2)),
      discount: checkoutData.discount ? Number(checkoutData.discount.toFixed(2)) : undefined,
      total: Number(checkoutData.total.toFixed(2)),
      roundOff: Number((checkoutData.roundOff || 0).toFixed(2)),
      paid: Number(checkoutData.paid.toFixed(2)),
      paymentMode: checkoutData.paymentMode,
      splitDetails: checkoutData.splitDetails,
      due: Number((checkoutData.due || 0).toFixed(2)),
      cashTendered: checkoutData.cashTendered,
      changeReturned: checkoutData.changeReturned,
      upiReference: checkoutData.upiReference,
      notes: checkoutData.notes,
      createdAt: new Date().toISOString(),
    };

    // 1. Deduct Stock for each line
    for (const line of checkoutData.lines) {
      const refId = line.referenceId || line.itemId;
      const deductionQty = line.mainUnitEquivalentQty !== undefined ? line.mainUnitEquivalentQty : line.qty;

      if (line.type === 'item' || !line.type) {
        if (refId) {
          try {
            ItemService.adjustStock(
              tenantId,
              refId,
              -deductionQty,
              'sale',
              `Sold in POS Bill ${billNumber}`
            );
          } catch (e) {
            console.warn(`[BillingService] Could not deduct stock for item ${refId}:`, e);
          }
        }
      } else if (line.type === 'kit') {
        const kits = db.get('kits');
        const kit = kits.find((k) => k.id === refId);
        if (kit) {
          for (const comp of kit.components) {
            const deduction = comp.qty * line.qty;
            try {
              ItemService.adjustStock(
                tenantId,
                comp.itemId,
                -deduction,
                'sale',
                `Sold as component of kit ${kit.name} in POS Bill ${billNumber}`
              );
            } catch (e) {
              console.warn(`[BillingService] Could not deduct stock for kit component ${comp.itemId}:`, e);
            }
          }
        }
      }
    }

    // 2. Add customer due balance if credit
    if (checkoutData.customerId && checkoutData.due > 0) {
      const customers = db.get('customers');
      const custIndex = customers.findIndex((c) => (tenantId === 'ALL' || c.tenantId === tenantId) && c.id === checkoutData.customerId);
      if (custIndex !== -1) {
        customers[custIndex].dueAmount = Number(
          (customers[custIndex].dueAmount + checkoutData.due).toFixed(2)
        );
        customers[custIndex].updatedAt = new Date().toISOString();
        db.set('customers', customers);
      }
    }

    // 3. Record cash sale in Daily Cash Register shift if cash was received
    let cashReceived = 0;
    if (checkoutData.paymentMode === 'Cash') {
      cashReceived = checkoutData.paid;
    } else if (checkoutData.paymentMode === 'Split' && checkoutData.splitDetails?.cash) {
      cashReceived = checkoutData.splitDetails.cash;
    }

    if (cashReceived > 0) {
      const shifts = db.get('cashShifts');
      const activeShift = shifts.find((s) => s.tenantId === tenantId && s.status === 'Open');
      if (activeShift) {
        activeShift.cashSales = Number((activeShift.cashSales + cashReceived).toFixed(2));
        activeShift.expectedClosingCash = Number(
          (activeShift.openingCash + activeShift.cashSales - activeShift.cashExpenses).toFixed(2)
        );
        db.set('cashShifts', shifts);
      }
    }

    bills.unshift(newBill);
    db.set('bills', bills);

    return newBill;
  }

  public static updateBill(tenantId: string, id: string, updates: Partial<Bill>) {
    const bills = db.get('bills');
    const index = bills.findIndex(
      (b) => (tenantId === 'ALL' || b.tenantId === tenantId) && (b.id === id || b.billNumber === id)
    );
    if (index === -1) {
      throw new AppError(`Bill invoice '${id}' not found.`, 404);
    }

    const updated = {
      ...bills[index],
      ...updates,
    };

    bills[index] = updated;
    db.set('bills', bills);
    return updated;
  }

  public static deleteBill(tenantId: string, id: string) {
    const bills = db.get('bills');
    const billToDelete = bills.find(
      (b) => (tenantId === 'ALL' || b.tenantId === tenantId) && (b.id === id || b.billNumber === id)
    );
    if (!billToDelete) {
      throw new AppError(`Bill invoice '${id}' not found.`, 404);
    }

    // 1. Restore Stock for each line item
    for (const line of billToDelete.lines) {
      const refId = line.referenceId || (line as any).itemId;
      const restoreQty = line.mainUnitEquivalentQty !== undefined ? line.mainUnitEquivalentQty : line.qty;

      if (line.type === 'item' || !line.type) {
        if (refId) {
          try {
            ItemService.adjustStock(
              tenantId,
              refId,
              restoreQty,
              'return',
              `Stock restored - Bill ${billToDelete.billNumber} voided`
            );
          } catch (e) {
            console.warn(`[BillingService] Could not restore stock for item ${refId}:`, e);
          }
        }
      } else if (line.type === 'kit') {
        const kits = db.get('kits');
        const kit = kits.find((k) => k.id === refId);
        if (kit) {
          for (const comp of kit.components) {
            const restoreAmount = comp.qty * line.qty;
            try {
              ItemService.adjustStock(
                tenantId,
                comp.itemId,
                restoreAmount,
                'return',
                `Stock restored for kit component ${comp.itemId} - Bill ${billToDelete.billNumber} voided`
              );
            } catch (e) {
              console.warn(`[BillingService] Could not restore kit component ${comp.itemId}:`, e);
            }
          }
        }
      }
    }

    // 2. Reverse customer due balance if credit
    if (billToDelete.customerId && billToDelete.due > 0) {
      const customers = db.get('customers');
      const custIndex = customers.findIndex((c) => c.id === billToDelete.customerId);
      if (custIndex !== -1) {
        customers[custIndex].dueAmount = Number(
          Math.max(0, customers[custIndex].dueAmount - billToDelete.due).toFixed(2)
        );
        customers[custIndex].updatedAt = new Date().toISOString();
        db.set('customers', customers);
      }
    }

    // 3. Reverse cash sales from active cash shift if cash was received
    let cashReceived = 0;
    if (billToDelete.paymentMode === 'Cash') {
      cashReceived = billToDelete.paid;
    } else if (billToDelete.paymentMode === 'Split' && billToDelete.splitDetails?.cash) {
      cashReceived = billToDelete.splitDetails.cash;
    }

    if (cashReceived > 0) {
      const shifts = db.get('cashShifts');
      const activeShift = shifts.find((s) => s.tenantId === tenantId && s.status === 'Open');
      if (activeShift) {
        activeShift.cashSales = Number(Math.max(0, activeShift.cashSales - cashReceived).toFixed(2));
        activeShift.expectedClosingCash = Number(
          (activeShift.openingCash + activeShift.cashSales - activeShift.cashExpenses).toFixed(2)
        );
        db.set('cashShifts', shifts);
      }
    }

    // 4. Remove bill
    const filtered = bills.filter((b) => b.id !== billToDelete.id);
    db.set('bills', filtered);

    return {
      success: true,
      message: `Bill ${billToDelete.billNumber} voided, stock restored and ledgers reversed successfully.`,
    };
  }

  /**
   * Record verified UPI bank settlement
   * Ensures money routing to the merchant's destination bank account is logged and reconciled
   */
  public static recordUpiSettlement(
    tenantId: string,
    data: {
      billId?: string;
      orderNumber?: string;
      utr: string;
      amount?: number;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      vpa?: string;
    }
  ) {
    if (!data.utr || data.utr.trim().length < 6) {
      throw new AppError('Valid UPI Transaction Reference (UTR) is required.', 400);
    }

    const bills = db.get('bills') || [];
    const matchId = data.billId || data.orderNumber;
    let bill = matchId
      ? bills.find((b: any) => (tenantId === 'ALL' || b.tenantId === tenantId) && (b.id === matchId || b.billNumber === matchId))
      : null;

    const settlementEntry = {
      settlementId: `SETTLE-${Date.now()}`,
      tenantId,
      billId: bill?.id || matchId || 'DIRECT_PAY',
      billNumber: bill?.billNumber || matchId || 'DIRECT_PAY',
      amount: data.amount || bill?.total || 0,
      utr: data.utr.trim(),
      destinationBank: data.bankName || 'Configured Merchant Bank',
      destinationAccount: data.accountNumber ? `••••${data.accountNumber.slice(-4)}` : undefined,
      destinationIfsc: data.ifscCode,
      destinationVpa: data.vpa || 'store@upi',
      status: 'SETTLED_TO_BANK',
      settledAt: new Date().toISOString(),
    };

    if (bill) {
      bill.paymentMode = 'UPI';
      bill.upiReference = data.utr.trim();
      bill.paid = bill.total;
      bill.due = 0;
      bill.settlementDetails = settlementEntry;
      db.set('bills', bills);
    }

    // Persist into bankSettlements ledger
    const settlements = db.get('bankSettlements') || [];
    settlements.unshift(settlementEntry);
    db.set('bankSettlements', settlements.slice(0, 100));

    return settlementEntry;
  }

  /**
   * Get all internal payment requests for tenant
   */
  public static getPaymentRequests(tenantId: string) {
    const requests = db.get('paymentRequests') || [];
    return requests
      .filter((r: any) => tenantId === 'ALL' || !r.tenantId || r.tenantId === tenantId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Create an internal payment request
   */
  public static createPaymentRequest(tenantId: string, data: any) {
    const requests = db.get('paymentRequests') || [];
    const id = data.id || `PR-${Date.now().toString().slice(-4)}`;
    const newReq = {
      id,
      tenantId,
      orderNumber: data.orderNumber,
      amount: Number(data.amount || 0),
      userId: data.userId || 'cust-1',
      userName: data.userName || 'Walk-in Customer',
      userPhone: data.userPhone,
      userEmail: data.userEmail,
      userRole: data.userRole || 'Customer',
      senderName: data.senderName || 'Store Billing Desk',
      vpa: data.vpa || 'store@upi',
      payeeName: data.payeeName || 'Store Owner',
      createdAt: new Date().toISOString(),
      status: 'Pending' as const,
      items: data.items || [],
      subtotal: Number(data.subtotal || data.amount || 0),
      tax: Number(data.tax || 0),
    };

    requests.unshift(newReq);
    db.set('paymentRequests', requests);
    return newReq;
  }

  /**
   * Mark payment request as paid with UTR
   */
  public static markPaymentRequestPaid(tenantId: string, id: string, utr: string) {
    const requests = db.get('paymentRequests') || [];
    const req = requests.find(
      (r: any) => (tenantId === 'ALL' || !r.tenantId || r.tenantId === tenantId) && (r.id === id || r.orderNumber === id)
    );
    if (!req) {
      throw new AppError(`Payment request '${id}' not found.`, 404);
    }

    req.status = 'Paid';
    req.paidAt = new Date().toISOString();
    req.utr = utr;
    db.set('paymentRequests', requests);

    // Auto record settlement
    try {
      this.recordUpiSettlement(tenantId, {
        orderNumber: req.orderNumber,
        utr,
        amount: req.amount,
        vpa: req.vpa,
      });
    } catch {}

    return req;
  }

  /**
   * Cancel payment request
   */
  public static cancelPaymentRequest(tenantId: string, id: string) {
    const requests = db.get('paymentRequests') || [];
    const req = requests.find(
      (r: any) => (tenantId === 'ALL' || !r.tenantId || r.tenantId === tenantId) && (r.id === id || r.orderNumber === id)
    );
    if (!req) {
      throw new AppError(`Payment request '${id}' not found.`, 404);
    }

    req.status = 'Cancelled';
    db.set('paymentRequests', requests);
    return req;
  }
}
