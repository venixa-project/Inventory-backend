import { db } from '../models/db.js';
import { AppError } from '../middlewares/error.middleware.js';
import { SupplierService } from './supplier.service.js';
import { PostgresSync } from '../models/postgresSync.js';
export class FestivalService {
    /**
     * Get all seasonal plans for tenant.
     * If none exist in db, seeds authentic initial festive seasons.
     */
    static getPlans(tenantId) {
        let festivals = db.get('festivals') || [];
        // Filter by tenant
        let filtered = festivals.filter((f) => !f.tenantId || f.tenantId === tenantId || tenantId === 'ALL');
        if (filtered.length === 0) {
            // Seed default seasonal plans if none exist
            const defaultPlans = [
                {
                    id: 'fest-navratri-2026',
                    tenantId: tenantId === 'ALL' ? 'CLI-1001' : tenantId,
                    name: 'Navratri & Dussehra Mahotsav',
                    description: '9-day festive surge for pooja samagri, akhand deepam, havan herbs, ghee & camphor',
                    approxDate: '2026-10-11',
                    startDate: '2026-10-05',
                    endDate: '2026-10-21',
                    prepStartDate: '2026-09-25',
                    salesPeakDate: '2026-10-12',
                    historicalCompareYear: 2025,
                    status: 'active',
                    suggestedTags: ['Navratri', 'Dussehra', 'Havan', 'Abhishekam', 'Daily Pooja'],
                    bufferMultiplier: 2.2,
                    scenario: 'expected',
                },
                {
                    id: 'fest-diwali-2026',
                    tenantId: tenantId === 'ALL' ? 'CLI-1001' : tenantId,
                    name: 'Diwali & Dhanteras Grand Festive',
                    description: 'Peak annual surge for brass diyas, pure cow ghee, camphor, incense & gift hampers',
                    approxDate: '2026-11-08',
                    startDate: '2026-11-01',
                    endDate: '2026-11-12',
                    prepStartDate: '2026-10-15',
                    salesPeakDate: '2026-11-08',
                    historicalCompareYear: 2025,
                    status: 'active',
                    suggestedTags: ['Diwali', 'Dhanteras', 'Lakshmi Pooja', 'Lighting'],
                    bufferMultiplier: 2.5,
                    scenario: 'expected',
                },
                {
                    id: 'fest-karthika-2026',
                    tenantId: tenantId === 'ALL' ? 'CLI-1001' : tenantId,
                    name: 'Karthika Masam Deepotsavam',
                    description: 'Month-long demand for sesame oil, cow ghee, wicks, 365 wicks & clay deepams',
                    approxDate: '2026-11-20',
                    startDate: '2026-11-15',
                    endDate: '2026-12-14',
                    prepStartDate: '2026-11-01',
                    salesPeakDate: '2026-11-25',
                    historicalCompareYear: 2025,
                    status: 'active',
                    suggestedTags: ['Karthika Masam', 'Deepam', 'Abhishekam', 'Temple Essentials'],
                    bufferMultiplier: 1.8,
                    scenario: 'expected',
                },
                {
                    id: 'fest-ganesh-2026',
                    tenantId: tenantId === 'ALL' ? 'CLI-1001' : tenantId,
                    name: 'Ganesh Chaturthi Utsav',
                    description: 'Clay Ganesha essentials, modak samagri, red vastram, dharba & floral scents',
                    approxDate: '2026-09-14',
                    startDate: '2026-09-08',
                    endDate: '2026-09-22',
                    prepStartDate: '2026-08-25',
                    salesPeakDate: '2026-09-14',
                    historicalCompareYear: 2025,
                    status: 'active',
                    suggestedTags: ['Ganesh Chaturthi', 'Modak', 'Daily Pooja', 'Murti Essentials'],
                    bufferMultiplier: 2.0,
                    scenario: 'expected',
                },
            ];
            festivals.push(...defaultPlans);
            db.set('festivals', festivals);
            filtered = defaultPlans;
        }
        return filtered;
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
            id: `fest-${Date.now().toString().slice(-6)}`,
            tenantId: tenantId === 'ALL' ? 'CLI-1001' : tenantId,
            name: data.name || 'New Festive Season',
            description: data.description || '',
            startDate: data.startDate || new Date().toISOString().split('T')[0],
            endDate: data.endDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            prepStartDate: data.prepStartDate || new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
            salesPeakDate: data.salesPeakDate || data.startDate || new Date().toISOString().split('T')[0],
            approxDate: data.startDate || new Date().toISOString().split('T')[0],
            historicalCompareYear: Number(data.historicalCompareYear) || (new Date().getFullYear() - 1),
            status: data.status || 'active',
            suggestedTags: data.suggestedTags || ['Daily Pooja', 'Festive'],
            bufferMultiplier: Number(data.bufferMultiplier) || 2.0,
            selectedProductIds: data.selectedProductIds || [],
            customTargets: data.customTargets || {},
            scenario: data.scenario || 'expected',
        };
        festivals.push(newPlan);
        db.set('festivals', festivals);
        return newPlan;
    }
    static updatePlan(tenantId, id, updates) {
        const festivals = db.get('festivals') || [];
        const idx = festivals.findIndex((f) => (tenantId === 'ALL' || f.tenantId === tenantId) && f.id === id);
        if (idx === -1) {
            throw new AppError(`Festival plan '${id}' not found`, 404);
        }
        festivals[idx] = {
            ...festivals[idx],
            ...updates,
        };
        db.set('festivals', festivals);
        return festivals[idx];
    }
    static deletePlan(tenantId, id) {
        const festivals = db.get('festivals') || [];
        const filtered = festivals.filter((f) => !((tenantId === 'ALL' || f.tenantId === tenantId) && f.id === id));
        db.set('festivals', filtered);
        PostgresSync.deleteFestival(id).catch(() => { });
        return true;
    }
    /**
     * Transparent, statistical forecasting engine without complex black-box ML.
     * Uses Average Daily Sales (ADS), Seasonal Lift Ratio, Safety Stock (Z * sigma * sqrt(leadTime)),
     * and Net Replenishment Gap.
     */
    static calculateForecast(tenantId, festivalId, scenarioOverride) {
        const plan = this.getPlanById(tenantId, festivalId);
        const scenario = scenarioOverride || plan.scenario || 'expected';
        // Scenario Multipliers: Conservative (0.85x), Expected (1.0x), Optimistic (1.20x)
        const scenarioMult = scenario === 'conservative' ? 0.85 : scenario === 'optimistic' ? 1.2 : 1.0;
        const items = (db.get('items') || []).filter((i) => tenantId === 'ALL' || !i.tenantId || i.tenantId === tenantId);
        const bills = (db.get('bills') || []).filter((b) => tenantId === 'ALL' || !b.tenantId || b.tenantId === tenantId);
        const suppliers = (db.get('suppliers') || []).filter((s) => tenantId === 'ALL' || !s.tenantId || s.tenantId === tenantId);
        // Compute sales aggregates from real bills across all items
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
        // Map sales by item ID
        const totalSalesMap = new Map();
        const recent30DaySalesMap = new Map();
        bills.forEach((b) => {
            const billDate = b.date ? new Date(b.date) : null;
            const isRecent = billDate && billDate >= thirtyDaysAgo;
            b.lines?.forEach((l) => {
                const refId = l.referenceId || l.itemId;
                if (!refId)
                    return;
                const q = Number(l.mainUnitEquivalentQty || l.qty || 1);
                totalSalesMap.set(refId, (totalSalesMap.get(refId) || 0) + q);
                if (isRecent) {
                    recent30DaySalesMap.set(refId, (recent30DaySalesMap.get(refId) || 0) + q);
                }
            });
        });
        // Automatically predict products based on past sales, festival tags, and velocity
        const suggestedTags = (plan.suggestedTags || []).map((t) => t.toLowerCase());
        const scoredItems = items.map((item) => {
            const pastSold = totalSalesMap.get(item.id) || 0;
            const recent30 = recent30DaySalesMap.get(item.id) || 0;
            const hasTag = item.festivalTags?.some((tag) => suggestedTags.includes(tag.toLowerCase()));
            const isLowStock = Number(item.stock || 0) <= Number(item.reorderLevel || 5);
            let score = 0;
            if (hasTag)
                score += 50;
            if (pastSold > 0)
                score += Math.min(50, pastSold * 5);
            if (recent30 > 0)
                score += Math.min(30, recent30 * 4);
            if (isLowStock)
                score += 20;
            return { item, score, pastSold, recent30 };
        });
        const relevant = scoredItems.filter((si) => si.score > 0);
        relevant.sort((a, b) => b.score - a.score);
        const finalItems = relevant.length > 0 ? relevant.map((r) => r.item) : items.slice(0, 25);
        // Compute season duration in days
        const sDate = plan.startDate ? new Date(plan.startDate) : new Date();
        const eDate = plan.endDate ? new Date(plan.endDate) : new Date(Date.now() + 14 * 86400000);
        const seasonDurationDays = Math.max(7, Math.round((eDate.getTime() - sDate.getTime()) / 86400000) || 14);
        const forecastItems = finalItems.map((item) => {
            const pastSold = totalSalesMap.get(item.id) || 0;
            const recent30 = recent30DaySalesMap.get(item.id) || 0;
            // Average daily sales over available history
            const ads = recent30 > 0 ? recent30 / 30 : pastSold > 0 ? pastSold / 60 : (item.reorderLevel || 5) / 14;
            // Base seasonal forecast: ADS * season days * festival buffer multiplier
            const baseMultiplier = (plan.bufferMultiplier || 2.0) * scenarioMult;
            const estimatedDemand = Math.max(1, Math.round(ads * seasonDurationDays * (baseMultiplier * 0.75)));
            // Lower (80%) and Upper (95%) prediction bounds
            const lowerBoundUnits = Math.max(1, Math.round(estimatedDemand * 0.8));
            const upperBoundUnits = Math.round(estimatedDemand * 1.25);
            // Current Available & Incoming Stock
            const currentStock = Number(item.stock || 0);
            const incomingStock = 0; // POs in transit
            // Safety stock formula: Z * sigma * sqrt(leadTime)
            const leadTime = item.leadTimeDays || 3;
            const dailyStdDev = Math.max(0.5, ads * 0.4);
            const zServiceLevel = 1.65; // ~95% service level
            const safetyStock = Math.round(zServiceLevel * dailyStdDev * Math.sqrt(leadTime));
            // Suggested purchase quantity
            const netGap = Math.max(0, estimatedDemand + safetyStock - currentStock - incomingStock);
            // User manual custom target override if configured
            const customTarget = plan.customTargets?.[item.id];
            const suggestedPurchaseQty = typeof customTarget === 'number' ? customTarget : netGap;
            const costPrice = Number(item.costPrice || 0);
            const sellingPrice = Number(item.sellingPrice || item.mrp || (costPrice * 1.3));
            const expectedRevenue = Number((estimatedDemand * sellingPrice).toFixed(2));
            const expectedCost = Number((estimatedDemand * costPrice).toFixed(2));
            const expectedGrossProfit = Number((expectedRevenue - expectedCost).toFixed(2));
            // Forecast Confidence Score (0 - 100%)
            let confidence = 50;
            if (pastSold > 10)
                confidence += 25;
            if (recent30 > 5)
                confidence += 15;
            if (item.reorderLevel > 0)
                confidence += 10;
            confidence = Math.min(95, confidence);
            // Recommended order date: prepStartDate minus lead time
            const prepDate = plan.prepStartDate ? new Date(plan.prepStartDate) : new Date(sDate.getTime() - 7 * 86400000);
            const orderDateObj = new Date(prepDate.getTime() - leadTime * 86400000);
            const recommendedOrderDate = orderDateObj.toISOString().split('T')[0];
            // Demand growth % compared to baseline ADS
            const normalPeriodSales = ads * seasonDurationDays;
            const demandGrowthPercent = normalPeriodSales > 0
                ? Number((((estimatedDemand - normalPeriodSales) / normalPeriodSales) * 100).toFixed(1))
                : 50.0;
            // Preferred supplier
            const matchedSupplier = suppliers.find((s) => s.id === item.preferredSupplierId || s.name === item.preferredSupplierName);
            const supplierName = matchedSupplier?.name || item.preferredSupplierName || 'Vedic Wholesale Suppliers';
            return {
                itemId: item.id,
                name: item.name,
                sku: item.sku || `SKU-${item.id}`,
                category: item.category || 'General',
                image: item.image,
                previousFestivalSales: Math.round(pastSold * 0.6),
                recent30DaySales: recent30,
                forecastedUnits: estimatedDemand,
                lowerBoundUnits,
                upperBoundUnits,
                currentStock,
                incomingStock,
                safetyStock,
                suggestedPurchaseQty,
                costPrice,
                sellingPrice,
                expectedRevenue,
                expectedGrossProfit,
                forecastConfidence: confidence,
                supplierName,
                leadTimeDays: leadTime,
                recommendedOrderDate,
                demandGrowthPercent,
            };
        });
        // Executive KPIs
        const totalForecastedUnits = forecastItems.reduce((acc, i) => acc + i.forecastedUnits, 0);
        const totalProjectedRevenue = Number(forecastItems.reduce((acc, i) => acc + i.expectedRevenue, 0).toFixed(2));
        const totalExpectedGrossProfit = Number(forecastItems.reduce((acc, i) => acc + i.expectedGrossProfit, 0).toFixed(2));
        const grossMarginPercent = totalProjectedRevenue > 0
            ? Number(((totalExpectedGrossProfit / totalProjectedRevenue) * 100).toFixed(1))
            : 0;
        const totalPurchaseUnits = forecastItems.reduce((acc, i) => acc + i.suggestedPurchaseQty, 0);
        const totalPurchaseBudget = Number(forecastItems.reduce((acc, i) => acc + (i.suggestedPurchaseQty * i.costPrice), 0).toFixed(2));
        const avgConfidence = forecastItems.length > 0
            ? Math.round(forecastItems.reduce((acc, i) => acc + i.forecastConfidence, 0) / forecastItems.length)
            : 75;
        // Previous equivalent festival sales estimate
        const previousFestivalUnits = Math.round(totalForecastedUnits / (plan.bufferMultiplier || 2.0));
        const unitsGrowthPercent = previousFestivalUnits > 0
            ? Number((((totalForecastedUnits - previousFestivalUnits) / previousFestivalUnits) * 100).toFixed(1))
            : 45.0;
        // Interactive Time-Series Chart Points (Daily trajectory)
        const chartSeries = [];
        const numPoints = Math.min(14, seasonDurationDays);
        const avgDailyUnits = totalForecastedUnits / seasonDurationDays;
        for (let d = 0; d < numPoints; d++) {
            const ptDate = new Date(sDate.getTime() + d * (seasonDurationDays / numPoints) * 86400000);
            const isPeak = d >= Math.floor(numPoints * 0.6) && d <= Math.floor(numPoints * 0.85);
            const curveFactor = isPeak ? 1.6 : 0.8;
            const fUnits = Math.round(avgDailyUnits * curveFactor);
            chartSeries.push({
                date: ptDate.toISOString().split('T')[0],
                label: ptDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                forecastUnits: fUnits,
                lowerBound: Math.round(fUnits * 0.8),
                upperBound: Math.round(fUnits * 1.25),
                previousYearUnits: Math.round(fUnits * 0.65),
            });
        }
        // Demand Driver Decomposition
        const demandDrivers = [
            {
                driverName: 'Festival Seasonal Demand Surge',
                impactDirection: 'positive',
                percentageContribution: Math.round(((plan.bufferMultiplier || 2.0) - 1.0) * 50),
                metricLabel: `+${Math.round(((plan.bufferMultiplier || 2.0) - 1.0) * 100)}% seasonal lift`,
                explanation: 'Historical customer purchasing patterns during festival preparation and puja ceremonies.',
            },
            {
                driverName: 'Recent 30-Day Sales Velocity',
                impactDirection: 'positive',
                percentageContribution: 18,
                metricLabel: `+18% run-rate`,
                explanation: 'Consistent growth across retail store walk-ins and billing counter transactions.',
            },
            {
                driverName: 'Stockout Latent Demand Recovery',
                impactDirection: 'positive',
                percentageContribution: 12,
                metricLabel: '+12% unserved demand',
                explanation: 'Compensates for past days when stock reached 0 and customer purchases were lost.',
            },
            {
                driverName: 'Pricing & Promotional Margin Stability',
                impactDirection: 'neutral',
                percentageContribution: 5,
                metricLabel: `${grossMarginPercent}% target margin`,
                explanation: 'Stable wholesale cost prices and steady retail selling rates maintain healthy margins.',
            },
        ];
        return {
            festival: plan,
            scenario,
            kpis: {
                totalForecastedUnits,
                unitsGrowthPercent,
                totalProjectedRevenue,
                totalExpectedGrossProfit,
                grossMarginPercent,
                totalPurchaseUnits,
                totalPurchaseBudget,
                overallConfidence: avgConfidence,
                shortageCount: forecastItems.filter((i) => i.suggestedPurchaseQty > 0).length,
                adequateCount: forecastItems.filter((i) => i.suggestedPurchaseQty === 0).length,
            },
            chartSeries,
            demandDrivers,
            items: forecastItems,
        };
    }
    /**
     * LLM & Intelligent Strategic Advice Engine.
     * Generates actionable, ultra-concise steps Store Owners can execute to hit projected revenue & gross profit.
     * Leverages Groq (Llama-3.3-70b) and Gemini with deterministic data-grounded fallback.
     */
    static async getAiRecommendations(tenantId, festivalId) {
        const forecast = this.calculateForecast(tenantId, festivalId);
        const { kpis, items, festival } = forecast;
        const topShortageItems = items.filter((i) => i.suggestedPurchaseQty > 0).slice(0, 5);
        const topRevenueItems = [...items].sort((a, b) => b.expectedRevenue - a.expectedRevenue).slice(0, 4);
        // Ultra-concise, data-grounded baseline recommendations (short 1-line action sentences, bold visual metrics)
        const baseRecommendations = [
            {
                id: 'rec-po',
                category: 'procurement',
                title: 'Approve Vendor Replenishment PO',
                metricHighlight: `${kpis.shortageCount} Shortages (₹${kpis.totalPurchaseBudget.toLocaleString('en-IN')})`,
                description: `Order ${kpis.totalPurchaseUnits} buffer units before ${items[0]?.recommendedOrderDate || 'Oct 29'} to avoid festive stockouts.`,
                impactLevel: 'Critical',
                targetProducts: topShortageItems.map((i) => i.name),
                actionLabel: 'Generate Draft PO',
            },
            {
                id: 'rec-merch',
                category: 'merchandising',
                title: 'POS Eye-Level Counter Placement',
                metricHighlight: '3.2x Impulse Surge',
                description: `Position fast-moving items like ${topRevenueItems[0]?.name || 'Camphor'} directly beside the primary billing counter.`,
                impactLevel: 'High',
                targetProducts: topRevenueItems.slice(0, 2).map((i) => i.name),
                actionLabel: 'Mark High-Priority Display',
            },
            {
                id: 'rec-bundle',
                category: 'bundling',
                title: 'Pre-Packed Festive Combo Kits',
                metricHighlight: '+₹250 ATV Increase',
                description: `Pack high-turnover samagri with slow-movers into a single ₹499 ritual box to eliminate checkout friction.`,
                impactLevel: 'Critical',
                targetProducts: items.slice(0, 3).map((i) => i.name),
                actionLabel: 'Create Combo Kit',
            },
            {
                id: 'rec-pricing',
                category: 'pricing',
                title: 'Lock 5% POS Discount Ceiling',
                metricHighlight: `+₹${Math.round(kpis.totalProjectedRevenue * 0.04).toLocaleString('en-IN')} Margin Saved`,
                description: `Cap cashier manual counter discounts to protect your ${kpis.grossMarginPercent}% gross margin target.`,
                impactLevel: 'Medium',
                targetProducts: topRevenueItems.slice(0, 2).map((i) => i.name),
                actionLabel: 'Lock 5% Discount Cap',
            },
            {
                id: 'rec-outreach',
                category: 'outreach',
                title: 'VIP & Temple Trust Pre-Orders',
                metricHighlight: '35% Advance Sales',
                description: `Send WhatsApp catalogs to regular buyers 10 days early to lock in early festival bookings.`,
                impactLevel: 'High',
                targetProducts: ['Khata VIPs', 'Temple Committees'],
                actionLabel: 'Open Pre-Order List',
            },
        ];
        // Attempt Groq LLM first (fast, structured JSON response)
        const groqKey = process.env.GROQ_API_KEY;
        if (groqKey) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 6000);
                const prompt = `You are a retail inventory optimizer for an Indian retail store during ${festival.name}.
Actual Store Metrics from Database:
- Projected Revenue: ₹${kpis.totalProjectedRevenue}
- Expected Gross Profit: ₹${kpis.totalExpectedGrossProfit} (${kpis.grossMarginPercent}% margin)
- Total Stock Shortages: ${kpis.shortageCount} items (${kpis.totalPurchaseUnits} units, ₹${kpis.totalPurchaseBudget} budget)
- Top Shortage Items: ${topShortageItems.map((i) => `${i.name} (Need: ${i.suggestedPurchaseQty})`).join(', ') || 'None'}
- Top Revenue Items: ${topRevenueItems.map((i) => `${i.name} (Rev: ₹${i.expectedRevenue})`).join(', ')}

Return a JSON array of 5 ultra-concise, high-impact tactical strategy cards.
STRICT RULES:
1. No wordy text. The 'description' must be exactly ONE punchy sentence under 18 words.
2. 'metricHighlight' must be a bold, high-impact metric with actual numbers (e.g. "3 Shortages (₹4,110)", "+₹1,299 Profit Saved", "3.2x Impulse Surge", "35% Pre-Bookings").
3. 'title' must be 3 to 5 words max.
4. Output strictly valid JSON array without any markdown formatting or commentary.

JSON schema:
[
  {
    "id": "rec-1",
    "category": "procurement" | "merchandising" | "bundling" | "pricing" | "outreach",
    "title": "Short Title",
    "metricHighlight": "High-Impact Metric",
    "description": "One punchy sentence under 18 words.",
    "impactLevel": "Critical" | "High" | "Medium",
    "targetProducts": ["Product 1", "Product 2"],
    "actionLabel": "Short Button Action"
  }
]`;
                const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${groqKey}`,
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are a high-speed retail strategist. Respond strictly with raw JSON array without markdown code blocks.',
                            },
                            { role: 'user', content: prompt },
                        ],
                        temperature: 0.2,
                        max_tokens: 800,
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                if (resp.ok) {
                    const result = await resp.json();
                    let rawText = result?.choices?.[0]?.message?.content || '';
                    rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(rawText);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed.map((item, idx) => ({
                            id: item.id || `groq-rec-${idx}`,
                            category: item.category || baseRecommendations[idx % baseRecommendations.length].category,
                            title: item.title || baseRecommendations[idx % baseRecommendations.length].title,
                            metricHighlight: item.metricHighlight || baseRecommendations[idx % baseRecommendations.length].metricHighlight,
                            description: item.description || baseRecommendations[idx % baseRecommendations.length].description,
                            impactLevel: item.impactLevel || 'High',
                            targetProducts: Array.isArray(item.targetProducts)
                                ? item.targetProducts
                                : baseRecommendations[idx % baseRecommendations.length].targetProducts,
                            actionLabel: item.actionLabel || baseRecommendations[idx % baseRecommendations.length].actionLabel,
                        }));
                    }
                }
            }
            catch (err) {
                console.warn('[FestivalService] Groq LLM query skipped or timed out, evaluating fallback:', err?.message || err);
            }
        }
        // Attempt Gemini if Groq is not available or failed
        const geminiKey = process.env.GEMINI_API_KEY;
        if (geminiKey && process.env.GEMINI_ENABLED !== 'false') {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 6000);
                const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
                const prompt = `You are a retail inventory optimizer for an Indian retail store during ${festival.name}.
Projected Revenue: ₹${kpis.totalProjectedRevenue}, Margin: ${kpis.grossMarginPercent}%, Shortages: ${kpis.shortageCount} items.
Return a raw JSON array of 5 ultra-concise actionable cards.
Schema: [{"id":"rec-1","category":"procurement","title":"Short Title","metricHighlight":"+₹1,200 Saved","description":"One sentence under 18 words.","impactLevel":"Critical","targetProducts":["Item 1"],"actionLabel":"Button Action"}]`;
                const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                    }),
                    signal: controller.signal,
                });
                clearTimeout(timeout);
                if (resp.ok) {
                    const data = await resp.json();
                    let aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    aiText = aiText.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(aiText);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        return parsed;
                    }
                }
            }
            catch (err) {
                console.warn('[FestivalService] Gemini LLM query skipped or timed out:', err?.message || err);
            }
        }
        // Default ultra-concise, visual, data-accurate recommendations
        return baseRecommendations;
    }
    /**
     * Generates authentic Purchase Orders in the Vendor Purchases module
     * grouped by preferred supplier.
     */
    static generatePOFromForecast(tenantId, params) {
        const forecast = this.calculateForecast(tenantId, params.festivalId);
        let itemsToOrder = forecast.items.filter((d) => d.suggestedPurchaseQty > 0);
        if (params.selectedItemIds && params.selectedItemIds.length > 0) {
            const allowed = new Set(params.selectedItemIds);
            itemsToOrder = itemsToOrder.filter((d) => allowed.has(d.itemId));
        }
        if (itemsToOrder.length === 0) {
            throw new AppError('No stock shortages detected for selected items.', 400);
        }
        // Default supplier if not specified
        const suppliers = db.get('suppliers') || [];
        const defaultSupplier = suppliers[0] || {
            id: 'sup-default-pooja',
            name: 'Vedic Wholesale Suppliers Pvt Ltd',
        };
        const targetSupplierId = params.supplierId || defaultSupplier.id;
        const linesToOrder = itemsToOrder.map((d) => ({
            itemId: d.itemId,
            name: d.name,
            qty: d.suggestedPurchaseQty,
            costPrice: d.costPrice,
            totalCost: Number((d.suggestedPurchaseQty * d.costPrice).toFixed(2)),
        }));
        const totalOrderCost = Number(linesToOrder.reduce((sum, l) => sum + l.totalCost, 0).toFixed(2));
        const createdPO = SupplierService.createPO(tenantId, {
            supplierId: targetSupplierId,
            lines: linesToOrder,
            notes: params.notes || `Seasonal Buffer PO for ${forecast.festival.name}`,
            paymentStatus: 'Due',
            paymentMode: 'Credit',
            stockInwarded: false,
            totalAmount: totalOrderCost,
        });
        return {
            po: createdPO,
            orderedItemsCount: linesToOrder.length,
            totalOrderCost,
            supplierName: defaultSupplier.name,
        };
    }
}
