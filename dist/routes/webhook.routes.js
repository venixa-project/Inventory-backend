import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller.js';
const router = Router();
// Webhooks are NOT behind auth middleware — they come from external services
// Signature verification is done inside each controller method
router.post('/razorpay', WebhookController.razorpay);
router.post('/stripe', WebhookController.stripe);
export default router;
