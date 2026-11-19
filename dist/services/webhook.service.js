import crypto from 'crypto';
import { db } from '../models/db.js';
import { ENV } from '../config/env.js';
export class WebhookService {
    /**
     * Verify Razorpay webhook signature (HMAC-SHA256)
     */
    static verifyRazorpaySignature(body, signature) {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', ENV.WEBHOOK_SECRET)
                .update(body)
                .digest('hex');
            const sigBuf = Buffer.from(signature, 'hex');
            const expBuf = Buffer.from(expectedSignature, 'hex');
            if (sigBuf.length !== expBuf.length) {
                return false;
            }
            return crypto.timingSafeEqual(sigBuf, expBuf);
        }
        catch {
            return false;
        }
    }
    /**
     * Process a payment.captured event from Razorpay/Stripe
     * Updates the corresponding license sale status to 'paid'
     */
    static processPaymentCaptured(data) {
        const licenses = db.get('licenseSales');
        // Match by invoice number first, then by clientId + amount
        let matchIndex = -1;
        if (data.invoiceNumber) {
            matchIndex = licenses.findIndex((l) => l.invoiceNumber === data.invoiceNumber && l.status === 'pending');
        }
        if (matchIndex === -1 && data.clientId) {
            matchIndex = licenses.findIndex((l) => l.clientId === data.clientId &&
                l.amount === data.amount &&
                l.status === 'pending');
        }
        if (matchIndex === -1) {
            console.log(`[Webhook] No matching pending license found for payment ${data.paymentId}`);
            return { updated: false, message: 'No matching pending invoice found' };
        }
        licenses[matchIndex].status = 'paid';
        db.set('licenseSales', licenses);
        console.log(`[Webhook] ✅ License ${licenses[matchIndex].invoiceNumber} marked as PAID via webhook (paymentId: ${data.paymentId})`);
        return {
            updated: true,
            message: `Invoice ${licenses[matchIndex].invoiceNumber} marked as paid`,
        };
    }
    /**
     * Process a payment.failed event
     */
    static processPaymentFailed(data) {
        const licenses = db.get('licenseSales');
        let matchIndex = -1;
        if (data.invoiceNumber) {
            matchIndex = licenses.findIndex((l) => l.invoiceNumber === data.invoiceNumber && l.status === 'pending');
        }
        if (matchIndex === -1 && data.clientId) {
            matchIndex = licenses.findIndex((l) => l.clientId === data.clientId && l.status === 'pending');
        }
        if (matchIndex === -1) {
            return { updated: false, message: 'No matching pending invoice found' };
        }
        licenses[matchIndex].status = 'failed';
        db.set('licenseSales', licenses);
        console.log(`[Webhook] ❌ License ${licenses[matchIndex].invoiceNumber} marked as FAILED (reason: ${data.reason || 'unknown'})`);
        return {
            updated: true,
            message: `Invoice ${licenses[matchIndex].invoiceNumber} marked as failed`,
        };
    }
    /**
     * Log webhook event for audit
     */
    static logWebhookEvent(provider, event, verified, result) {
        const logEntry = {
            id: `whk-${Date.now()}`,
            provider,
            event,
            verified,
            result,
            receivedAt: new Date().toISOString(),
        };
        console.log('[Webhook Audit]', JSON.stringify(logEntry));
        return logEntry;
    }
}
