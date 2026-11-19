import { WebhookService } from '../services/webhook.service.js';
export class WebhookController {
    /**
     * POST /api/v1/webhooks/razorpay
     * Raw body must be preserved (express.raw middleware for this route)
     */
    static razorpay(req, res, next) {
        try {
            const signature = req.headers['x-razorpay-signature'];
            if (!signature) {
                res.status(400).json({ error: 'Missing x-razorpay-signature header' });
                return;
            }
            const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            const verified = WebhookService.verifyRazorpaySignature(rawBody, signature);
            if (!verified) {
                WebhookService.logWebhookEvent('razorpay', 'unknown', false, {
                    error: 'Signature verification failed',
                });
                res.status(401).json({ error: 'Invalid webhook signature' });
                return;
            }
            const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const event = payload?.event || '';
            let result;
            switch (event) {
                case 'payment.captured': {
                    const entity = payload.payload?.payment?.entity || {};
                    result = WebhookService.processPaymentCaptured({
                        invoiceNumber: entity.notes?.invoiceNumber,
                        clientId: entity.notes?.clientId,
                        amount: entity.amount / 100, // Razorpay sends paise
                        paymentId: entity.id,
                        method: entity.method,
                    });
                    break;
                }
                case 'payment.failed': {
                    const entity = payload.payload?.payment?.entity || {};
                    result = WebhookService.processPaymentFailed({
                        invoiceNumber: entity.notes?.invoiceNumber,
                        clientId: entity.notes?.clientId,
                        paymentId: entity.id,
                        reason: entity.error_description,
                    });
                    break;
                }
                default:
                    result = { skipped: true, message: `Unhandled event: ${event}` };
            }
            WebhookService.logWebhookEvent('razorpay', event, true, result);
            res.status(200).json({ ok: true });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/v1/webhooks/stripe
     * Stripe webhook handler
     */
    static stripe(req, res, next) {
        try {
            const sigHeader = req.headers['stripe-signature'];
            if (!sigHeader) {
                res.status(400).json({ error: 'Missing stripe-signature header' });
                return;
            }
            // Stripe uses a different verification format: t=timestamp,v1=signature
            const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const eventType = payload?.type || '';
            let result;
            switch (eventType) {
                case 'checkout.session.completed':
                case 'invoice.paid': {
                    const session = payload.data?.object || {};
                    result = WebhookService.processPaymentCaptured({
                        invoiceNumber: session.metadata?.invoiceNumber,
                        clientId: session.metadata?.clientId,
                        amount: (session.amount_total || session.amount_paid || 0) / 100,
                        paymentId: session.id,
                        method: 'stripe',
                    });
                    break;
                }
                case 'invoice.payment_failed': {
                    const invoice = payload.data?.object || {};
                    result = WebhookService.processPaymentFailed({
                        invoiceNumber: invoice.metadata?.invoiceNumber,
                        clientId: invoice.metadata?.clientId,
                        paymentId: invoice.id,
                        reason: 'Payment failed',
                    });
                    break;
                }
                default:
                    result = { skipped: true, message: `Unhandled event: ${eventType}` };
            }
            WebhookService.logWebhookEvent('stripe', eventType, true, result);
            res.status(200).json({ received: true });
        }
        catch (err) {
            next(err);
        }
    }
}
