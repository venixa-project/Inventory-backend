import { db } from '../models/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { SupplierService } from './supplier.service.js';
export class FestivalService {
    static getPlans(tenantId) {
        const festivals = db.get('festivals') || [];
        return festivals.filter((f) => !f.tenantId || f.tenantId === tenantId || tenantId === 'ALL');
    }
    static getPlanById(tenantId, id) {
        const plans = this.getPlans(tenantId);
        const plan = plans.find((p) => p.id === id);
        if (!plan) {
            throw new AppError(`Festival plan '${id}' not found`, 404);
        }
        return plan;
    }
    static createPlan(tenantId, data) {
        const festivals = db.get('festivals') || [];
        const newPlan = {
            ...data,
            id: `fest-${Date.now().toString().slice(-6)}`,
            tenantId,
        };
        festivals.push(newPlan);
        db.set('festivals', festivals);
        return newPlan;
    }
    static calculateForecast(tenantId, festivalId) {
        const plan = this.getPlanById(tenantId, festivalId);
        const items = db.get('items').filter((i) => tenantId === 'ALL' || i.tenantId === tenantId);
        const bills = db.get('bills').filter((b) => tenantId === 'ALL' || b.tenantId === tenantId);
        const suggestedTags = (plan.suggestedTags || []).map((t) => t.toLowerCase());
        const festivalItems = items.filter((item) => item.festivalTags?.some((tag) => suggestedTags.includes(tag.toLowerCase())));
        const planningData = festivalItems.map((item) => {
            let pastSold = 0;
            bills.forEach((b) => {
                b.lines?.forEach((l) => {
                    if (l.referenceId === item.id) {
                        pastSold += l.mainUnitEquivalentQty || l.qty || 1;
                    }
                });
            });
            const mult = plan.bufferMultiplier || 2.0;
            const suggestedTarget = Number(Math.max(item.reorderLevel * mult, item.reorderLevel + pastSold).toFixed(2));
            const orderGap = Number(Math.max(0, suggestedTarget - item.stock).toFixed(2));
            return {
                item,
                currentStock: item.stock,
                pastSold,
                suggestedTarget,
                orderGap,
                costPrice: item.costPrice,
                estimatedOrderCost: Number((orderGap * item.costPrice).toFixed(2)),
            };
        });
        const totalOrderCost = Number(planningData.reduce((sum, d) => sum + d.estimatedOrderCost, 0).toFixed(2));
        const totalGapsCount = planningData.filter((d) => d.orderGap > 0).length;
        return {
            festival: plan,
            totalItemsTagged: festivalItems.length,
            totalGapsCount,
            totalOrderCost,
            items: planningData,
        };
    }
    static generatePOFromForecast(tenantId, params) {
        const forecast = this.calculateForecast(tenantId, params.festivalId);
        const linesToOrder = forecast.items
            .filter((d) => d.orderGap > 0)
            .map((d) => ({
            itemId: d.item.id,
            qty: d.orderGap,
            costPrice: d.costPrice,
            totalCost: d.estimatedOrderCost,
        }));
        if (linesToOrder.length === 0) {
            throw new AppError('No stock shortage gap detected for this festival buffer.', 400);
        }
        const createdPO = SupplierService.createPO(tenantId, {
            supplierId: params.supplierId,
            lines: linesToOrder,
            notes: params.notes || `Auto-generated buffer for ${forecast.festival.name}`,
            paymentStatus: 'Due',
            paymentMode: 'Credit',
            stockInwarded: false,
            totalAmount: forecast.totalOrderCost,
        });
        return createdPO;
    }
}
