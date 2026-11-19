import { db } from '../models/db.js';
import { AppError } from '../middlewares/error.middleware.js';
export class DocumentService {
    static generateInvoiceHtml(billId, tenantId) {
        const bills = db.get('bills');
        const bill = bills.find((b) => (tenantId === 'ALL' || b.tenantId === tenantId) && b.id === billId);
        if (!bill) {
            throw new AppError(`Invoice '${billId}' not found`, 404);
        }
        const rawSettings = (db.get('shopSettings')[bill.tenantId] || {});
        const shopSettings = {
            shopName: rawSettings.shopName || 'Sri Ganesh Pooja Stores',
            tagline: rawSettings.tagline || 'Authentic Pooja Samagri & Retail Store',
            address: rawSettings.address || 'Shop #4, Temple Main Road, Gandhi Bazaar',
            city: rawSettings.city || 'Bengaluru',
            state: rawSettings.state || 'Karnataka',
            pincode: rawSettings.pincode || '560004',
            phone: rawSettings.phone || '+91 98450 12345',
            email: rawSettings.email || 'contact@sriganesh.com',
            gstin: rawSettings.gstin || '29ABCDE1234F1Z5',
            upiId: rawSettings.upiId || 'sriganesh@okhdfcbank',
            bankName: rawSettings.bankName || 'HDFC Bank Ltd',
            accountNumber: rawSettings.accountNumber || '50200012345678',
            ifsc: rawSettings.ifsc || 'HDFC0001234',
            branch: rawSettings.branch || 'Gandhi Bazaar',
            receiptFooterMessage: rawSettings.receiptFooterMessage ||
                'Thank you for shopping with us! May God bless you and your family.',
        };
        const dateFormatted = new Date(bill.date).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        const taxAmount = bill.gst || 0;
        const discountAmount = bill.discount || 0;
        const isTaxInvoice = Boolean(taxAmount > 0 || shopSettings.gstin);
        const docTitle = isTaxInvoice ? 'TAX INVOICE' : 'RETAIL INVOICE / CASH BILL';
        const itemsHtml = bill.lines
            .map((line, index) => {
            const regional = line.nameHi || line.nameTe;
            const rate = line.unitPrice || 0;
            const total = line.totalPrice || 0;
            return `
        <tr>
          <td style="text-align: center; padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${index + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 600; color: #1e293b;">${line.name}</div>
            ${regional ? `<div style="font-size: 11px; color: #64748b;">${regional}</div>` : ''}
          </td>
          <td style="text-align: center; padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${line.qty} ${line.unit || ''}</td>
          <td style="text-align: right; padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">₹${Number(rate).toFixed(2)}</td>
          <td style="text-align: center; padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${line.gstPercent || 0}%</td>
          <td style="text-align: right; font-weight: 600; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">₹${Number(total).toFixed(2)}</td>
        </tr>
      `;
        })
            .join('');
        const upiQrUrl = shopSettings.upiId
            ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`upi://pay?pa=${shopSettings.upiId}&pn=${encodeURIComponent(shopSettings.shopName)}&am=${bill.total}&cu=INR&tn=${encodeURIComponent(bill.billNumber)}`)}`
            : '';
        return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${bill.billNumber} - ${shopSettings.shopName}</title>
  <style>
    @media print {
      body { margin: 0; padding: 15px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .page-break { page-break-after: always; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 30px;
    }
    .invoice-card {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 36px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 9999px;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 820px; margin: 0 auto 20px auto; display: flex; justify-content: flex-end; gap: 12px;">
    <button onclick="window.print()" style="background: #2563eb; color: #ffffff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer;">
      Print Invoice / Save as PDF
    </button>
  </div>

  <div class="invoice-card">
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 24px;">
      <div>
        <h1 style="margin: 0 0 6px 0; font-size: 24px; color: #0f172a; font-weight: 800;">${shopSettings.shopName}</h1>
        ${shopSettings.tagline ? `<div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">${shopSettings.tagline}</div>` : ''}
        <div style="font-size: 12px; color: #475569; line-height: 1.5;">
          ${shopSettings.address}<br>
          ${shopSettings.city}, ${shopSettings.state} - ${shopSettings.pincode}<br>
          <strong>Phone:</strong> ${shopSettings.phone} | <strong>Email:</strong> ${shopSettings.email}<br>
          ${shopSettings.gstin ? `<strong>GSTIN:</strong> ${shopSettings.gstin}` : ''}
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge">${docTitle}</span>
        <div style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 10px;">${bill.billNumber}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Date: ${dateFormatted}</div>
      </div>
    </div>

    <!-- Customer & Payment Meta -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; font-size: 13px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Billed To</div>
        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${bill.customerName || 'Walk-in Customer'}</div>
        ${bill.customerPhone ? `<div style="color: #475569; margin-top: 2px;">Mobile: +91 ${bill.customerPhone}</div>` : ''}
      </div>
      <div style="text-align: right;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px;">Payment Method</div>
        <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${bill.paymentMode}</div>
        <div style="color: #10b981; font-weight: 600; margin-top: 2px;">
          ${(bill.due ?? 0) > 0 ? `Paid: ₹${Number(bill.paid || 0).toFixed(2)} | Due: ₹${Number(bill.due || 0).toFixed(2)}` : 'Fully Paid'}
        </div>
      </div>
    </div>

    <!-- Line Items Table -->
    <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
      <thead>
        <tr style="background: #f1f5f9; text-transform: uppercase; font-size: 11px; font-weight: 700; color: #475569;">
          <th style="padding: 10px; width: 40px; text-align: center;">#</th>
          <th style="padding: 10px; text-align: left;">Item Description</th>
          <th style="padding: 10px; text-align: center; width: 90px;">Qty</th>
          <th style="padding: 10px; text-align: right; width: 90px;">Rate</th>
          <th style="padding: 10px; text-align: center; width: 70px;">GST %</th>
          <th style="padding: 10px; text-align: right; width: 110px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- Totals & Payment Summary -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; padding-top: 12px; border-top: 2px solid #e2e8f0;">
      <!-- QR Code / Bank Info -->
      <div style="display: flex; gap: 16px; align-items: center;">
        ${upiQrUrl
            ? `
          <div style="text-align: center; padding: 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <img src="${upiQrUrl}" alt="UPI QR" style="width: 100px; height: 100px; display: block; margin: 0 auto;">
            <div style="font-size: 10px; color: #475569; font-weight: 600; margin-top: 4px;">Scan & Pay via UPI</div>
          </div>
        `
            : ''}
        <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
          ${shopSettings.bankName ? `<strong>Bank:</strong> ${shopSettings.bankName}<br>` : ''}
          ${shopSettings.accountNumber ? `<strong>A/C:</strong> ${shopSettings.accountNumber}<br>` : ''}
          ${shopSettings.ifsc ? `<strong>IFSC:</strong> ${shopSettings.ifsc}<br>` : ''}
          ${shopSettings.upiId ? `<strong>UPI ID:</strong> ${shopSettings.upiId}` : ''}
        </div>
      </div>

      <!-- Financial Calculation -->
      <div style="width: 280px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #64748b;">
          <span>Subtotal:</span>
          <span style="font-weight: 600; color: #1e293b;">₹${Number(bill.subtotal || 0).toFixed(2)}</span>
        </div>
        ${discountAmount > 0
            ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #ef4444;">
            <span>Discount:</span>
            <span style="font-weight: 600;">-₹${discountAmount.toFixed(2)}</span>
          </div>
        `
            : ''}
        ${taxAmount > 0
            ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #64748b;">
            <span>GST Amount:</span>
            <span style="font-weight: 600; color: #1e293b;">₹${taxAmount.toFixed(2)}</span>
          </div>
        `
            : ''}
        ${Boolean(bill.roundOff)
            ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #64748b;">
            <span>Round Off:</span>
            <span>₹${Number(bill.roundOff) > 0 ? `+${Number(bill.roundOff).toFixed(2)}` : Number(bill.roundOff).toFixed(2)}</span>
          </div>
        `
            : ''}
        <div style="display: flex; justify-content: space-between; padding-top: 10px; margin-top: 6px; border-top: 2px solid #0f172a; font-size: 17px; font-weight: 800; color: #0f172a;">
          <span>Total:</span>
          <span>₹${Number(bill.total || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; padding-top: 16px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 11px; color: #64748b;">
      <p style="margin: 0 0 4px 0; font-weight: 600;">${shopSettings.receiptFooterMessage}</p>
      <p style="margin: 0;">This is a computer generated invoice and does not require physical signature.</p>
    </div>
  </div>
</body>
</html>
    `;
    }
    static generatePOHtml(poId, tenantId) {
        const pos = db.get('purchaseOrders');
        const po = pos.find((p) => (tenantId === 'ALL' || p.tenantId === tenantId) && p.id === poId);
        if (!po) {
            throw new AppError(`Purchase order '${poId}' not found`, 404);
        }
        const suppliers = db.get('suppliers');
        const sup = suppliers.find((s) => s.id === po.supplierId);
        const items = db.get('items');
        const linesHtml = po.lines
            .map((l, index) => {
            const it = items.find((i) => i.id === l.itemId);
            const cp = l.costPrice || 0;
            const tc = l.totalCost || 0;
            return `
        <tr>
          <td style="text-align: center; padding: 8px;">${index + 1}</td>
          <td style="padding: 8px;"><strong>${it?.name || l.itemId}</strong></td>
          <td style="text-align: center; padding: 8px;">${l.qty}</td>
          <td style="text-align: right; padding: 8px;">₹${Number(cp).toFixed(2)}</td>
          <td style="text-align: right; padding: 8px; font-weight: bold;">₹${Number(tc).toFixed(2)}</td>
        </tr>
      `;
        })
            .join('');
        const totalAmount = po.totalAmount || 0;
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Purchase Order - ${po.poNumber}</title>
  <style>
    body { font-family: sans-serif; padding: 30px; background: #fff; color: #333; }
    .box { max-width: 800px; margin: auto; border: 1px solid #ddd; padding: 25px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <div class="box">
    <h2>PURCHASE ORDER</h2>
    <p><strong>PO Number:</strong> ${po.poNumber} | <strong>Date:</strong> ${po.date} | <strong>Status:</strong> ${po.status}</p>
    <hr>
    <h3>Vendor Details:</h3>
    <p><strong>${sup?.companyName || sup?.name || 'Vendor'}</strong><br>Phone: ${sup?.phone || '-'}<br>GSTIN: ${sup?.gstin || '-'}</p>
    <table>
      <thead>
        <tr><th>#</th><th>Item</th><th>Qty</th><th>Cost Price</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
    </table>
    <h3 style="text-align: right; margin-top: 20px;">Total Amount: ₹${Number(totalAmount).toFixed(2)}</h3>
    ${po.notes ? `<p><strong>Notes:</strong> ${po.notes}</p>` : ''}
  </div>
</body>
</html>
    `;
    }
    static generateChallanHtml(challanId, tenantId) {
        const challans = db.get('deliveryChallans');
        const dc = challans.find((c) => (tenantId === 'ALL' || c.tenantId === tenantId) && (c.id === challanId || c.challanNumber === challanId));
        if (!dc) {
            throw new AppError(`Delivery challan '${challanId}' not found`, 404);
        }
        const rawSettings = (db.get('shopSettings')[dc.tenantId] || {});
        const shopName = rawSettings.shopName || 'Sri Ganesh Pooja Stores';
        const address = rawSettings.address || 'Shop #4, Temple Main Road, Gandhi Bazaar';
        const phone = rawSettings.phone || '+91 98450 12345';
        const gstin = rawSettings.gstin || '29ABCDE1234F1Z5';
        const linesHtml = (dc.lines || [])
            .map((l, index) => `
        <tr>
          <td style="text-align: center; padding: 10px;">${index + 1}</td>
          <td style="padding: 10px;">
            <strong style="color: #0f172a;">${l.itemName}</strong>
            ${l.hsnCode ? `<div style="font-size: 11px; color: #64748b; font-family: monospace;">HSN: ${l.hsnCode}</div>` : ''}
          </td>
          <td style="text-align: center; padding: 10px; font-weight: bold;">${l.qty} ${l.unit || ''}</td>
          <td style="text-align: right; padding: 10px; font-family: monospace;">₹${Number(l.rate || 0).toFixed(2)}</td>
          <td style="text-align: right; padding: 10px; font-weight: bold; font-family: monospace; color: #0284c7;">₹${Number(l.amount || 0).toFixed(2)}</td>
        </tr>
      `)
            .join('');
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delivery Challan - ${dc.challanNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 15px; background: #fff; }
      .box { border: none !important; box-shadow: none !important; max-width: 100% !important; padding: 0 !important; }
      .no-print { display: none !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; background: #f8fafc; color: #1e293b; }
    .box { max-width: 840px; margin: auto; background: #fff; border: 1px solid #cbd5e1; padding: 35px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0284c7; padding-bottom: 15px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; font-size: 12px; }
    th { background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
  </style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div>
        <h1 style="margin: 0; color: #0284c7; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">DELIVERY CHALLAN</h1>
        <div style="margin-top: 5px;">
          <span class="badge">${dc.challanType || 'Dispatch of Goods'}</span>
        </div>
      </div>
      <div style="text-align: right;">
        <h3 style="margin: 0; color: #0f172a; font-size: 16px;">${shopName}</h3>
        <p style="margin: 3px 0; font-size: 12px; color: #64748b;">${address}</p>
        <p style="margin: 0; font-size: 12px; color: #64748b;">Phone: ${phone} ${gstin ? `| GSTIN: <strong>${gstin}</strong>` : ''}</p>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
      <div>
        <strong style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Consignee / Deliver To:</strong>
        <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 3px;">${dc.customerName}</div>
        ${dc.customerPhone ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;">Phone: ${dc.customerPhone}</div>` : ''}
        ${dc.customerGstin ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">GSTIN: <span style="font-family: monospace;">${dc.customerGstin}</span></div>` : ''}
        ${dc.deliveryAddress ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px; max-width: 320px;">Address: ${dc.deliveryAddress}</div>` : ''}
      </div>
      <div style="text-align: right; font-size: 12px; line-height: 1.6;">
        <div><strong>Challan No:</strong> <span style="color: #0284c7; font-weight: 800; font-family: monospace;">${dc.challanNumber}</span></div>
        <div><strong>Date:</strong> <span style="font-weight: 600;">${dc.date}</span></div>
        ${dc.referenceNumber ? `<div><strong>Ref / SO#:</strong> <span style="font-family: monospace; font-weight: 600;">${dc.referenceNumber}</span></div>` : ''}
        ${dc.transporterName ? `<div><strong>Transporter:</strong> ${dc.transporterName}</div>` : ''}
        ${dc.vehicleNumber ? `<div><strong>Vehicle No:</strong> <span style="font-family: monospace;">${dc.vehicleNumber}</span></div>` : ''}
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th style="text-align: left;">Item Description</th>
          <th style="width: 80px; text-align: center;">Quantity</th>
          <th style="width: 110px; text-align: right;">Indicative Rate</th>
          <th style="width: 120px; text-align: right;">Total Value (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: 800; font-size: 13px;">
          <td colspan="4" style="text-align: right; padding: 10px; text-transform: uppercase;">Total Consignment Value:</td>
          <td style="text-align: right; padding: 10px; font-family: monospace; color: #0284c7;">₹${Number(dc.total || 0).toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>

    ${dc.notes ? `
      <div style="margin-top: 15px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 11px;">
        <strong style="color: #475569;">Dispatch Instructions / Remarks:</strong>
        <p style="margin: 3px 0 0 0; color: #64748b;">${dc.notes}</p>
      </div>
    ` : ''}
  </div>

  <script>
    window.onload = function() {
      // Trigger native browser print / save as PDF immediately when opened
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
    `;
    }
    static generatePackingSlipHtml(packageId, tenantId) {
        const packages = db.get('packages');
        const pkg = packages.find((p) => (tenantId === 'ALL' || p.tenantId === tenantId) && (p.id === packageId || p.packageNumber === packageId));
        if (!pkg) {
            throw new AppError(`Package '${packageId}' not found`, 404);
        }
        const salesOrders = db.get('salesOrders');
        const so = salesOrders.find((s) => (tenantId === 'ALL' || s.tenantId === tenantId) && (s.id === pkg.salesOrderId || s.soNumber === pkg.soNumber));
        const customers = db.get('customers');
        const customer = customers.find((c) => (tenantId === 'ALL' || c.tenantId === tenantId) && (c.id === so?.customerId || c.name === pkg.customerName));
        const rawSettings = (db.get('shopSettings')[pkg.tenantId || tenantId] || {});
        const shopName = rawSettings.shopName || 'Sri Ganesh Pooja Stores';
        const address = rawSettings.address || 'Shop #4, Temple Main Road, Gandhi Bazaar';
        const phone = rawSettings.phone || '+91 98450 12345';
        const gstin = rawSettings.gstin || '29ABCDE1234F1Z5';
        const items = so?.lines || [];
        const linesHtml = items
            .map((l, index) => `
        <tr>
          <td style="text-align: center; padding: 10px; font-weight: 600; color: #64748b;">${index + 1}</td>
          <td style="padding: 10px;">
            <strong style="color: #0f172a; font-size: 13px;">${l.itemName}</strong>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              ${l.sku ? `<span style="font-family: monospace; background: #f1f5f9; padding: 1px 4px; border-radius: 4px;">SKU: ${l.sku}</span> ` : ''}
              ${l.hsnCode ? `<span style="font-family: monospace; color: #0284c7;">HSN: ${l.hsnCode}</span>` : ''}
            </div>
          </td>
          <td style="text-align: center; padding: 10px; font-weight: bold; font-size: 13px; color: #0f172a;">${l.qty}</td>
          <td style="text-align: center; padding: 10px; font-weight: bold; font-size: 13px; color: #16a34a;">${l.qty} ${l.unit || 'pc'}</td>
          <td style="text-align: center; padding: 10px;">
            <div style="width: 18px; height: 18px; border: 2px solid #94a3b8; border-radius: 4px; margin: auto; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #16a34a; font-weight: 900;">✓</div>
          </td>
        </tr>
      `)
            .join('');
        const totalQty = items.reduce((sum, l) => sum + (Number(l.qty) || 0), 0);
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Packing Slip - ${pkg.packageNumber}</title>
  <style>
    @media print {
      body { margin: 0; padding: 15px; background: #fff; }
      .box { border: none !important; box-shadow: none !important; max-width: 100% !important; padding: 0 !important; }
      .no-print { display: none !important; }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; background: #f8fafc; color: #1e293b; }
    .box { max-width: 840px; margin: auto; background: #fff; border: 1px solid #cbd5e1; padding: 35px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { border: 1px solid #e2e8f0; padding: 10px; font-size: 12px; }
    th { background: #f8fafc; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .status-badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div>
        <h1 style="margin: 0; color: #2563eb; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">PACKING SLIP</h1>
        <div style="margin-top: 6px; display: flex; gap: 8px; align-items: center;">
          <span class="badge">Parcel Verification & Dispatch</span>
          <span class="status-badge" style="${pkg.status === 'Delivered'
            ? 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;'
            : pkg.status === 'Shipped'
                ? 'background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe;'
                : 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;'}">${pkg.status}</span>
        </div>
      </div>
      <div style="text-align: right;">
        <h3 style="margin: 0; color: #0f172a; font-size: 16px;">${shopName}</h3>
        <p style="margin: 3px 0; font-size: 12px; color: #64748b;">${address}</p>
        <p style="margin: 0; font-size: 12px; color: #64748b;">Phone: ${phone} ${gstin ? `| GSTIN: <strong>${gstin}</strong>` : ''}</p>
      </div>
    </div>

    <!-- Package & Customer Metadata -->
    <div style="display: flex; justify-content: space-between; margin-bottom: 20px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
      <div>
        <strong style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em;">Ship To / Consignee:</strong>
        <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 3px;">${pkg.customerName}</div>
        ${customer?.phone ? `<div style="font-size: 12px; color: #475569; margin-top: 2px;">Phone: ${customer.phone}</div>` : ''}
        ${customer?.address || so?.shippingAddress ? `
          <div style="font-size: 11px; color: #64748b; margin-top: 2px; max-width: 320px;">
            Address: ${so?.shippingAddress || customer?.address}
          </div>
        ` : ''}
      </div>
      <div style="text-align: right; font-size: 12px; line-height: 1.6;">
        <div><strong>Package No:</strong> <span style="color: #db2777; font-weight: 800; font-family: monospace;">${pkg.packageNumber}</span></div>
        <div><strong>Packing Date:</strong> <span style="font-weight: 600;">${pkg.date}</span></div>
        <div><strong>Sales Order #:</strong> <span style="font-family: monospace; font-weight: 700; color: #2563eb;">${pkg.soNumber}</span></div>
        <div><strong>Carrier:</strong> <span style="font-weight: 600;">${pkg.carrier || 'Direct Courier Dispatch'}</span></div>
        ${pkg.trackingNumber ? `<div><strong>Tracking ID:</strong> <span style="font-family: monospace; font-weight: 700; color: #0f172a;">${pkg.trackingNumber}</span></div>` : ''}
      </div>
    </div>

    <!-- Items Verification Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          <th style="text-align: left;">Item Description & Details</th>
          <th style="width: 100px; text-align: center;">Ordered Qty</th>
          <th style="width: 100px; text-align: center;">Packed Qty</th>
          <th style="width: 80px; text-align: center;">Verified</th>
        </tr>
      </thead>
      <tbody>
        ${linesHtml.length > 0 ? linesHtml : `
          <tr>
            <td colspan="5" style="text-align: center; padding: 20px; color: #94a3b8;">
              Order contents packed in parcel ${pkg.packageNumber}
            </td>
          </tr>
        `}
      </tbody>
      <tfoot>
        <tr style="background: #f8fafc; font-weight: 800; font-size: 12px;">
          <td colspan="2" style="text-align: right; padding: 10px; text-transform: uppercase;">Total Items Packed:</td>
          <td colspan="3" style="text-align: left; padding: 10px; font-weight: 800; color: #2563eb;">${totalQty} Units</td>
        </tr>
      </tfoot>
    </table>

    <!-- Warehouse Verification Stamp & Sign-off -->
    <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; padding-top: 15px; border-top: 1px dashed #cbd5e1; font-size: 11px; color: #64748b;">
      <div>
        <p style="margin: 0; font-weight: 700; color: #334155;">Special Handling Instructions:</p>
        <p style="margin: 2px 0 0 0;">Inspect seal before accepting. Handle sacred pooja articles and glass items with care.</p>
      </div>
      <div style="text-align: center; min-width: 180px;">
        <div style="border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 5px;"></div>
        <p style="margin: 0; font-weight: 700; color: #334155;">Packed & Inspected By</p>
        <p style="margin: 1px 0 0 0; font-size: 10px;">Warehouse Dispatch Desk</p>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      // Trigger native browser print / save as PDF immediately when opened
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
    `;
    }
}
