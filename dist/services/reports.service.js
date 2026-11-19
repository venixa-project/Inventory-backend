import { db } from '../models/db.js';
export class ReportsService {
    /**
     * Executive Dashboard Summary KPI Cards
     */
    static getDashboardSummary(tenantId, filters) {
        let bills = db.get('bills').filter((b) => tenantId === 'ALL' || b.tenantId === tenantId);
        let items = db.get('items').filter((i) => tenantId === 'ALL' || i.tenantId === tenantId);
        const customers = db.get('customers').filter((c) => tenantId === 'ALL' || c.tenantId === tenantId);
        const pos = db.get('purchaseOrders').filter((p) => tenantId === 'ALL' || p.tenantId === tenantId);
        const payments = db.get('vendorPayments').filter((p) => tenantId === 'ALL' || p.tenantId === tenantId);
        if (filters?.startDate) {
            bills = bills.filter((b) => b.date >= filters.startDate);
        }
        if (filters?.endDate) {
            bills = bills.filter((b) => b.date <= filters.endDate);
        }
        if (filters?.category && filters.category !== 'All') {
            items = items.filter((i) => (i.category || 'General') === filters.category);
        }
        // Sales metrics
        const totalSales = Number(bills.reduce((sum, b) => sum + (b.total || 0), 0).toFixed(2));
        const totalPaidSales = Number(bills.reduce((sum, b) => sum + (b.paid || 0), 0).toFixed(2));
        const totalBillsCount = bills.length;
        // Inventory metrics
        const totalInventoryValue = Number(items.reduce((sum, i) => sum + i.stock * i.costPrice, 0).toFixed(2));
        const totalSellingValue = Number(items.reduce((sum, i) => sum + i.stock * i.sellingPrice, 0).toFixed(2));
        const lowStockCount = items.filter((i) => i.stock <= i.reorderLevel).length;
        // Receivables & Payables
        const totalCustomerReceivables = Number(customers.reduce((sum, c) => sum + (c.dueAmount || 0), 0).toFixed(2));
        const totalPurchases = Number(pos.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toFixed(2));
        const totalPaymentsMade = Number(payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2));
        const totalVendorPayables = Math.max(0, Number((totalPurchases - totalPaymentsMade).toFixed(2)));
        // Daily sales trend aggregation for charts
        const dailyTrendMap = {};
        bills.forEach((b) => {
            const day = (b.date || '').substring(0, 10);
            if (day) {
                if (!dailyTrendMap[day]) {
                    dailyTrendMap[day] = { sales: 0, count: 0, profit: 0 };
                }
                dailyTrendMap[day].sales += b.total || 0;
                dailyTrendMap[day].count += 1;
                let billCOGS = 0;
                b.lines?.forEach((line) => {
                    const it = items.find((i) => i.id === line.referenceId);
                    const cost = it ? it.costPrice : (line.unitPrice || 0) * 0.7;
                    const qty = line.mainUnitEquivalentQty || line.qty || 1;
                    billCOGS += cost * qty;
                });
                dailyTrendMap[day].profit += Math.max(0, (b.total || 0) - billCOGS);
            }
        });
        const salesTrend = Object.entries(dailyTrendMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, stats]) => ({
            date,
            sales: Number(stats.sales.toFixed(2)),
            count: stats.count,
            profit: Number(stats.profit.toFixed(2)),
        }));
        return {
            totalSales,
            totalPaidSales,
            totalBillsCount,
            totalInventoryValue,
            totalSellingValue,
            potentialProfit: Number((totalSellingValue - totalInventoryValue).toFixed(2)),
            lowStockCount,
            totalCustomerReceivables,
            totalVendorPayables,
            netCashFlow: Number((totalPaidSales - totalPaymentsMade).toFixed(2)),
            salesTrend,
        };
    }
    /**
     * Comprehensive Sales, COGS & Profitability Report
     */
    static getSalesReport(tenantId, filters) {
        let bills = db.get('bills').filter((b) => tenantId === 'ALL' || b.tenantId === tenantId);
        const items = db.get('items').filter((i) => tenantId === 'ALL' || i.tenantId === tenantId);
        if (filters?.startDate) {
            bills = bills.filter((b) => b.date >= filters.startDate);
        }
        if (filters?.endDate) {
            bills = bills.filter((b) => b.date <= filters.endDate);
        }
        if (filters?.category && filters.category !== 'All') {
            bills = bills.filter((b) => b.lines?.some((l) => {
                const item = items.find((i) => i.id === l.referenceId || i.name === l.name);
                return (item?.category || 'General') === filters.category;
            }));
        }
        const grossSales = Number(bills.reduce((sum, b) => sum + (b.total || 0), 0).toFixed(2));
        const totalGST = Number(bills.reduce((sum, b) => sum + (b.gst || 0), 0).toFixed(2));
        let trueCOGS = 0;
        const paymentModeBreakdown = {
            Cash: 0,
            UPI: 0,
            Card: 0,
            Credit: 0,
            Split: 0,
        };
        const dailyTrendMap = {};
        bills.forEach((b) => {
            const day = (b.date || '').substring(0, 10) || 'Unknown';
            if (!dailyTrendMap[day]) {
                dailyTrendMap[day] = { sales: 0, cogs: 0, orders: 0 };
            }
            dailyTrendMap[day].sales += b.total || 0;
            dailyTrendMap[day].orders += 1;
            // Payment breakdown
            const mode = b.paymentMode || 'Cash';
            paymentModeBreakdown[mode] = (paymentModeBreakdown[mode] || 0) + (b.total || 0);
            // COGS calculation
            b.lines?.forEach((line) => {
                const it = items.find((i) => i.id === line.referenceId);
                const costPerUnit = it ? it.costPrice : (line.unitPrice || 0) * 0.7;
                const qty = line.mainUnitEquivalentQty || line.qty || 1;
                const lineCOGS = costPerUnit * qty;
                trueCOGS += lineCOGS;
                dailyTrendMap[day].cogs += lineCOGS;
            });
        });
        trueCOGS = Number(trueCOGS.toFixed(2));
        const grossProfit = Number((grossSales - trueCOGS).toFixed(2));
        const profitMargin = grossSales > 0 ? Number(((grossProfit / grossSales) * 100).toFixed(2)) : 0;
        const averageBillValue = bills.length > 0 ? Number((grossSales / bills.length).toFixed(2)) : 0;
        const dailyTrend = Object.entries(dailyTrendMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, stats]) => ({
            date,
            sales: Number(stats.sales.toFixed(2)),
            cogs: Number(stats.cogs.toFixed(2)),
            profit: Number((stats.sales - stats.cogs).toFixed(2)),
            orders: stats.orders,
        }));
        return {
            grossSales,
            totalGST,
            trueCOGS,
            grossProfit,
            profitMargin,
            totalBillsCount: bills.length,
            averageBillValue,
            paymentModeBreakdown,
            dailyTrend,
        };
    }
    /**
     * Top Performing Fast-Moving SKUs & Products
     */
    static getTopProductsReport(tenantId, filters) {
        let bills = db.get('bills').filter((b) => tenantId === 'ALL' || b.tenantId === tenantId);
        const items = db.get('items').filter((i) => tenantId === 'ALL' || i.tenantId === tenantId);
        if (filters?.startDate)
            bills = bills.filter((b) => b.date >= filters.startDate);
        if (filters?.endDate)
            bills = bills.filter((b) => b.date <= filters.endDate);
        const itemStatsMap = {};
        bills.forEach((b) => {
            b.lines?.forEach((l) => {
                const id = l.referenceId || l.id || l.name;
                const it = items.find((i) => i.id === l.referenceId);
                const name = it?.name || l.name || 'Product';
                const category = it?.category || 'General';
                const qty = l.mainUnitEquivalentQty || l.qty || 1;
                const revenue = l.totalPrice || (l.unitPrice || 0) * qty;
                const cost = it ? it.costPrice * qty : revenue * 0.7;
                const profit = revenue - cost;
                if (!itemStatsMap[id]) {
                    itemStatsMap[id] = { id, name, category, unitsSold: 0, revenue: 0, profit: 0 };
                }
                itemStatsMap[id].unitsSold += qty;
                itemStatsMap[id].revenue += revenue;
                itemStatsMap[id].profit += profit;
            });
        });
        const limit = filters?.limit || 15;
        const rankedProducts = Object.values(itemStatsMap)
            .map((p) => ({
            ...p,
            unitsSold: Number(p.unitsSold.toFixed(2)),
            revenue: Number(p.revenue.toFixed(2)),
            profit: Number(p.profit.toFixed(2)),
        }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, limit);
        return {
            topProducts: rankedProducts,
            totalProductsAnalyzed: Object.keys(itemStatsMap).length,
        };
    }
    /**
     * Warehouse Stock Health, Dead Stock, Expiry Watchlist
     */
    static getStockHealthReport(tenantId) {
        const items = db.get('items').filter((i) => tenantId === 'ALL' || i.tenantId === tenantId);
        const bills = db.get('bills').filter((b) => tenantId === 'ALL' || b.tenantId === tenantId);
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        // Collect active sold items in the past 60 days
        const activeSoldItemIds = new Set();
        bills
            .filter((b) => (b.date || '') >= sixtyDaysAgo)
            .forEach((b) => b.lines?.forEach((l) => activeSoldItemIds.add(l.referenceId)));
        const lowStockItems = items.filter((i) => i.stock <= i.reorderLevel);
        const expiringItems = items.filter((i) => {
            if (!i.expiryDate)
                return false;
            const exp = new Date(i.expiryDate);
            return exp <= thirtyDaysFromNow;
        });
        const deadStockItems = items.filter((i) => i.stock > 0 && !activeSoldItemIds.has(i.id));
        const totalStockValueCost = Number(items.reduce((sum, i) => sum + i.stock * i.costPrice, 0).toFixed(2));
        const totalStockValueRetail = Number(items.reduce((sum, i) => sum + i.stock * i.sellingPrice, 0).toFixed(2));
        return {
            totalSKUs: items.length,
            lowStockItemsCount: lowStockItems.length,
            expiringItemsCount: expiringItems.length,
            deadStockItemsCount: deadStockItems.length,
            totalStockValueCost,
            totalStockValueRetail,
            potentialProfit: Number((totalStockValueRetail - totalStockValueCost).toFixed(2)),
            lowStockList: lowStockItems.slice(0, 20),
            expiringList: expiringItems.slice(0, 20),
            deadStockList: deadStockItems.slice(0, 20),
        };
    }
    /**
     * GST Tax Summary & HSN-wise Turnover
     */
    static getTaxGSTReport(tenantId, filters) {
        let bills = db.get('bills').filter((b) => tenantId === 'ALL' || b.tenantId === tenantId);
        const items = db.get('items').filter((i) => tenantId === 'ALL' || i.tenantId === tenantId);
        if (filters?.startDate)
            bills = bills.filter((b) => b.date >= filters.startDate);
        if (filters?.endDate)
            bills = bills.filter((b) => b.date <= filters.endDate);
        let totalTaxableValue = 0;
        let totalTaxAmount = 0;
        const hsnMap = {};
        bills.forEach((b) => {
            b.lines?.forEach((l) => {
                const it = items.find((i) => i.id === l.referenceId);
                const hsn = it?.hsnCode || 'HSN-GEN';
                const taxable = l.totalPrice || 0;
                const tax = l.gstAmount || 0;
                totalTaxableValue += taxable;
                totalTaxAmount += tax;
                if (!hsnMap[hsn]) {
                    hsnMap[hsn] = { hsn, description: it?.category || 'General', taxableValue: 0, taxAmount: 0 };
                }
                hsnMap[hsn].taxableValue += taxable;
                hsnMap[hsn].taxAmount += tax;
            });
        });
        // In India intra-state GST is split 50-50 into CGST and SGST
        const cgst = Number((totalTaxAmount / 2).toFixed(2));
        const sgst = Number((totalTaxAmount / 2).toFixed(2));
        return {
            taxableAmount: Number(totalTaxableValue.toFixed(2)),
            cgst,
            sgst,
            igst: 0,
            totalTax: Number(totalTaxAmount.toFixed(2)),
            hsnBreakdown: Object.values(hsnMap).map((h) => ({
                ...h,
                taxableValue: Number(h.taxableValue.toFixed(2)),
                taxAmount: Number(h.taxAmount.toFixed(2)),
            })),
        };
    }
    /**
     * Customer Khata Receivable Aging
     */
    static getCustomerKhataAgingReport(tenantId) {
        const customers = db.get('customers').filter((c) => tenantId === 'ALL' || c.tenantId === tenantId);
        const bills = db.get('bills').filter((b) => (tenantId === 'ALL' || b.tenantId === tenantId) && (b.due || 0) > 0);
        const now = new Date();
        const aging = {
            current: 0, // 0-30 days
            overdue30: 0, // 31-60 days
            overdue60: 0, // 61-90 days
            overdue90Plus: 0, // 90+ days
        };
        bills.forEach((b) => {
            const billDate = new Date(b.date);
            const diffDays = Math.floor((now.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));
            const due = b.due || 0;
            if (diffDays <= 30)
                aging.current += due;
            else if (diffDays <= 60)
                aging.overdue30 += due;
            else if (diffDays <= 90)
                aging.overdue60 += due;
            else
                aging.overdue90Plus += due;
        });
        const totalOutstanding = Number(customers.reduce((sum, c) => sum + (c.dueAmount || 0), 0).toFixed(2));
        return {
            totalOutstanding,
            aging: {
                current: Number(aging.current.toFixed(2)),
                overdue30: Number(aging.overdue30.toFixed(2)),
                overdue60: Number(aging.overdue60.toFixed(2)),
                overdue90Plus: Number(aging.overdue90Plus.toFixed(2)),
            },
            topDebtors: customers
                .filter((c) => (c.dueAmount || 0) > 0)
                .sort((a, b) => b.dueAmount - a.dueAmount)
                .slice(0, 15),
        };
    }
    /**
     * Staff Operational Dashboard Summary (Purely Units, Counts, SKUs & Pipeline - STRICTLY ZERO REVENUE)
     */
    static getStaffDashboardSummary(tenantId, filters) {
        const timeFilter = filters?.timeFilter || 'week';
        const counterYear = filters?.counterYear || '2026';
        const pipelineYear = filters?.pipelineYear || '2026';
        const items = db.get('items').filter((i) => tenantId === 'ALL' || i.tenantId === tenantId);
        const bills = db.get('bills').filter((b) => tenantId === 'ALL' || b.tenantId === tenantId);
        const salesOrders = db.get('salesOrders').filter((so) => tenantId === 'ALL' || so.tenantId === tenantId);
        const packages = db.get('packages').filter((pkg) => tenantId === 'ALL' || pkg.tenantId === tenantId);
        const shifts = db.get('cashShifts').filter((s) => tenantId === 'ALL' || s.tenantId === tenantId);
        // 1. Shift Period Date Matching Logic
        const now = new Date();
        const todayStr = now.toISOString().substring(0, 10);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
        const monthPrefix = todayStr.substring(0, 7);
        const isDateInShiftPeriod = (dateStr) => {
            if (!dateStr)
                return false;
            const dStr = (dateStr.includes('T') ? dateStr.substring(0, 10) : dateStr.replace('/', '-')).substring(0, 10);
            if (timeFilter === 'today') {
                // Today or latest active shift date (simulated dataset closing)
                return dStr === todayStr || dStr === '2026-10-30';
            }
            if (timeFilter === 'week') {
                return dStr >= weekAgo && dStr <= todayStr;
            }
            if (timeFilter === 'month') {
                return dStr.substring(0, 7) === monthPrefix;
            }
            if (timeFilter === 'custom' && (filters?.startDate || filters?.endDate)) {
                if (filters.startDate && dStr < filters.startDate)
                    return false;
                if (filters.endDate && dStr > filters.endDate)
                    return false;
                return true;
            }
            return true; // 'all'
        };
        // 2. Terminal Shift State
        const activeShift = shifts.find((s) => s.status === 'Open');
        // 3. Stock Lists & Health Analysis
        const lowStockList = items.filter((i) => (i.stock || 0) > 0 && (i.stock || 0) <= (i.reorderLevel || 5));
        const outStockList = items.filter((i) => (i.stock || 0) <= 0);
        const inStockList = items.filter((i) => (i.stock || 0) > (i.reorderLevel || 5));
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const expiringList = items.filter((i) => {
            if (!i.expiryDate)
                return false;
            const exp = new Date(i.expiryDate);
            return !isNaN(exp.getTime()) && exp >= now && exp <= thirtyDaysFromNow;
        });
        const totalCatalogUnits = items.reduce((acc, i) => acc + Math.max(0, i.stock || 0), 0);
        const totalSKUs = items.length;
        // 4. Period-Filtered Sales Orders & Packages
        const periodFilteredSO = salesOrders.filter((so) => isDateInShiftPeriod(so.date));
        const periodFilteredPkg = packages.filter((pkg) => isDateInShiftPeriod(pkg.date));
        // Dynamic order counts per period
        const periodOrdersCount = periodFilteredSO.length;
        const periodReadyPackagesCount = periodFilteredPkg.filter((p) => p.status === 'Not Shipped').length;
        const statCards = {
            ordersToFulfill: {
                orderCount: periodOrdersCount,
                readyPackagesCount: periodReadyPackagesCount,
            },
            lowStockAlert: {
                lowSKUsCount: lowStockList.length,
            },
            outOfStockAlert: {
                outSKUsCount: outStockList.length,
            },
        };
        // 4. 12-Month Counter Order Volume Bar Chart (Month-wise Full Year)
        const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyCounterData = MONTH_NAMES.map((monthName, mIdx) => {
            const matchingBills = bills.filter((b) => {
                if (!b.date)
                    return false;
                const cleaned = b.date.includes('T') ? b.date : b.date.replace(' ', 'T');
                const d = new Date(cleaned);
                if (isNaN(d.getTime()))
                    return false;
                if (counterYear !== 'all' && d.getFullYear() !== Number(counterYear)) {
                    return false;
                }
                return d.getMonth() === mIdx;
            });
            const realOrders = matchingBills.length;
            const itemsCount = matchingBills.reduce((acc, b) => acc + (b.lines?.length || 1), 0);
            return {
                monthIndex: mIdx,
                label: monthName,
                fullName: `${monthName} ${counterYear !== 'all' ? counterYear : ''}`.trim(),
                orders: realOrders,
                itemsCount,
            };
        });
        const totalYearOrders = monthlyCounterData.reduce((acc, d) => acc + d.orders, 0);
        const avgMonthlyOrders = Number((totalYearOrders / 12).toFixed(1));
        // 5. Solid Pie Chart Data (Classification & Stock Health)
        const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ec4899', '#06b6d4', '#f43f5e'];
        const getClassificationLabel = (itemType) => {
            const t = (itemType || '').toLowerCase();
            if (t === 'assembly' || t === 'finished goods' || t === 'finished manufactured good') {
                return 'Finished Manufactured Good';
            }
            if (t === 'component' || t === 'raw material' || t === 'raw material / ingredient') {
                return 'Raw Material / Ingredient';
            }
            if (t === 'service' || t === 'service / labor / fee') {
                return 'Service / Labor / Fee';
            }
            return 'Physical Goods / Stock Item';
        };
        // By Classification
        const classMap = {};
        items.forEach((item) => {
            const cls = getClassificationLabel(item.itemType);
            if (!classMap[cls]) {
                classMap[cls] = {
                    id: cls,
                    name: cls,
                    totalUnits: 0,
                    packsCount: 0,
                    kgCount: 0,
                    skuCount: 0,
                    action: 'Optimal shelf stock',
                    actionColor: 'text-emerald-400',
                };
            }
            const stock = Math.max(0, item.stock || 0);
            const unit = (item.unit || 'pc').toLowerCase();
            classMap[cls].totalUnits += stock;
            classMap[cls].skuCount += 1;
            if (unit.includes('pack') || unit.includes('box') || unit.includes('strip')) {
                classMap[cls].packsCount += stock;
            }
            else if (unit.includes('kg') || unit.includes('g')) {
                classMap[cls].kgCount += unit.includes('g') && !unit.includes('kg') ? stock / 1000 : stock;
            }
            else {
                classMap[cls].packsCount += Math.round(stock * 0.7);
                classMap[cls].kgCount += Math.round(stock * 0.3);
            }
            if (stock <= (item.reorderLevel || 5)) {
                classMap[cls].action = 'Restock items from backroom';
                classMap[cls].actionColor = 'text-amber-400';
            }
        });
        const byClassification = Object.values(classMap);
        const byClassificationFormatted = byClassification
            .sort((a, b) => b.totalUnits - a.totalUnits)
            .map((c, idx) => ({
            ...c,
            percentage: totalCatalogUnits > 0 ? Math.round((c.totalUnits / totalCatalogUnits) * 100) : 0,
            color: PIE_COLORS[idx % PIE_COLORS.length],
        }));
        // By Stock Health
        const inUnits = inStockList.reduce((s, i) => s + (i.stock || 0), 0);
        const lowUnits = lowStockList.reduce((s, i) => s + (i.stock || 0), 0);
        const outUnits = outStockList.reduce((s, i) => s + (i.stock || 0), 0);
        const byStockHealth = [
            {
                id: 'in_stock',
                name: 'In Stock (Healthy)',
                totalUnits: inUnits,
                packsCount: Math.round(inUnits * 0.75),
                kgCount: Math.round(inUnits * 0.25),
                skuCount: inStockList.length,
                percentage: totalCatalogUnits > 0 ? Math.round((inUnits / totalCatalogUnits) * 100) : 0,
                color: '#10b981',
                action: 'Optimal shelf stock',
                actionColor: 'text-emerald-400',
            },
            {
                id: 'low_stock',
                name: 'Low Stock (Shelf Alert)',
                totalUnits: lowUnits,
                packsCount: Math.round(lowUnits * 0.75),
                kgCount: Math.round(lowUnits * 0.25),
                skuCount: lowStockList.length,
                percentage: totalCatalogUnits > 0 ? Math.round((lowUnits / totalCatalogUnits) * 100) : 0,
                color: '#f59e0b',
                action: 'Restock shelf from backroom',
                actionColor: 'text-amber-400',
            },
            {
                id: 'out_of_stock',
                name: 'Out of Stock (Zero Stock)',
                totalUnits: outUnits,
                packsCount: 0,
                kgCount: 0,
                skuCount: outStockList.length,
                percentage: totalCatalogUnits > 0 ? Math.max(0, 100 - Math.round((inUnits / totalCatalogUnits) * 100) - Math.round((lowUnits / totalCatalogUnits) * 100)) : 0,
                color: '#f43f5e',
                action: 'Unavailable - Notify manager',
                actionColor: 'text-rose-400',
            },
        ];
        // 6. Order Status Pipeline (Combined Year & Active Shift Filter)
        let newCount = 0;
        let processingCount = 0;
        let readyCount = 0;
        let dispatchedCount = 0;
        let deliveredCount = 0;
        let cancelledCount = 0;
        const filteredSO = salesOrders.filter((so) => {
            const yearMatch = !so.date || pipelineYear === 'all' || so.date.startsWith(pipelineYear);
            return yearMatch && isDateInShiftPeriod(so.date);
        });
        filteredSO.forEach((so) => {
            const st = (so.status || 'Draft').toLowerCase();
            if (st === 'draft' || st === 'new')
                newCount++;
            else if (st === 'confirmed' || st === 'invoiced')
                processingCount++;
            else if (st === 'packed')
                readyCount++;
            else if (st === 'shipped')
                dispatchedCount++;
            else if (st === 'delivered' || st === 'closed')
                deliveredCount++;
            else
                cancelledCount++;
        });
        const filteredPkg = packages.filter((pkg) => {
            const yearMatch = !pkg.date || pipelineYear === 'all' || pkg.date.startsWith(pipelineYear);
            return yearMatch && isDateInShiftPeriod(pkg.date);
        });
        filteredPkg.forEach((pkg) => {
            if (pkg.status === 'Not Shipped')
                readyCount++;
            else if (pkg.status === 'Shipped')
                dispatchedCount++;
            else if (pkg.status === 'Delivered')
                deliveredCount++;
        });
        const orderStatusPipeline = {
            selectedYear: pipelineYear,
            totalActiveQueue: newCount + processingCount + readyCount + dispatchedCount + deliveredCount + cancelledCount,
            stages: [
                { stage: 'New', count: newCount, color: '#3b82f6' },
                { stage: 'Processing', count: processingCount, color: '#6366f1' },
                { stage: 'Ready', count: readyCount, color: '#f59e0b' },
                { stage: 'Dispatched', count: dispatchedCount, color: '#10b981' },
                { stage: 'Delivered', count: deliveredCount, color: '#8b5cf6' },
                { stage: 'Cancelled', count: cancelledCount, color: '#94a3b8' },
            ],
        };
        // 7. Filtered Bills & Top-Selling Fast Moving Products (by Units Sold)
        const filteredBills = bills.filter((b) => isDateInShiftPeriod(b.date));
        const soldMap = {};
        filteredBills.forEach((b) => {
            b.lines?.forEach((line) => {
                const key = line.name || line.referenceId || 'Item';
                if (!soldMap[key]) {
                    const it = items.find((i) => i.id === line.referenceId || i.name === line.name);
                    soldMap[key] = {
                        id: it?.id || key,
                        name: key,
                        qty: 0,
                        stock: it?.stock || 0,
                        category: it?.category || 'General',
                    };
                }
                soldMap[key].qty += line.qty || 1;
            });
        });
        const topFastMovingProducts = Object.values(soldMap);
        topFastMovingProducts.sort((a, b) => b.qty - a.qty);
        const top5Products = topFastMovingProducts.slice(0, 5).map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            unitsSold: p.qty,
            shelfStock: p.stock,
            isLowStock: p.stock <= 5,
        }));
        // 8. Operational Alerts
        const operationalAlerts = {
            lowStockCount: lowStockList.length,
            outOfStockCount: outStockList.length,
            nearExpiryCount: expiringList.length,
            readyForDispatchCount: periodReadyPackagesCount,
        };
        return {
            period: {
                timeFilter,
                label: timeFilter === 'today'
                    ? 'Today'
                    : timeFilter === 'week'
                        ? 'This Week'
                        : timeFilter === 'month'
                            ? 'This Month'
                            : timeFilter === 'all'
                                ? 'All Time'
                                : 'Custom Range',
                todayStr,
            },
            terminal: {
                isShiftActive: !!activeShift,
                activeRegisterId: activeShift?.id,
                openedAt: activeShift?.openedAt,
            },
            statCards,
            counterOrderVolume: {
                selectedYear: counterYear,
                totalYearOrders,
                avgMonthlyOrders,
                months: monthlyCounterData,
            },
            inventoryPie: {
                totalCatalogUnits,
                totalSKUs,
                byClassification: byClassificationFormatted,
                byStockHealth,
            },
            orderStatusPipeline,
            topFastMovingProducts: top5Products,
            operationalAlerts,
        };
    }
}
