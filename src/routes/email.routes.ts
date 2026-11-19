import { Router, Request, Response } from 'express';

const router = Router();

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'Venixa <support@venixa.co.in>';

export interface UpiEmailRequestBody {
  to: string;
  customerName?: string;
  orderNumber: string;
  amount: number;
  vpa: string;
  payeeName?: string;
  appPayUrl?: string;
  notes?: string;
  storeName?: string;
}

router.post('/send-upi-request', async (req: Request, res: Response) => {
  try {
    const {
      to,
      customerName = 'Valued Customer',
      orderNumber,
      amount,
      vpa,
      payeeName = 'Store Merchant',
      appPayUrl = '',
      notes = '',
      storeName = 'Venixa Store',
    }: UpiEmailRequestBody = req.body;

    if (!to || !to.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'A valid recipient email address is required.',
      });
    }

    if (!orderNumber || typeof amount !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'Order number and valid payment amount are required.',
      });
    }

    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);

    // Build standard NPCI UPI URI
    const upiUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Bill ${orderNumber}`)}`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UPI Payment Request - ${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div style="max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    
    <!-- Header banner -->
    <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${storeName}</h1>
      <p style="margin: 0; font-size: 13px; color: #c7d2fe; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Secure UPI Payment Request</p>
    </div>

    <!-- Main Body -->
    <div style="padding: 32px 28px;">
      <p style="margin: 0 0 16px 0; font-size: 15px; color: #475569;">
        Hello <strong>${customerName}</strong>,
      </p>
      <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
        Here is your UPI payment request for bill / order <strong>#${orderNumber}</strong>. You can pay instantly using any UPI app (Google Pay, PhonePe, Paytm, BHIM, Cred) or open the payment link directly in your browser.
      </p>

      <!-- Amount Box -->
      <div style="background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); border: 1px solid #c7d2fe; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
        <span style="font-size: 12px; font-weight: 700; color: #4338ca; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Total Amount Payable</span>
        <div style="font-size: 32px; font-weight: 900; color: #1e1b4b; font-family: monospace;">${formattedAmount}</div>
        <div style="margin-top: 8px; font-size: 12px; color: #6366f1;">
          Bill / Reference: <strong>${orderNumber}</strong>
        </div>
      </div>

      <!-- UPI Destination Details -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b;">Payee Name:</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 600; color: #0f172a;">${payeeName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b;">UPI ID / VPA:</td>
          <td style="padding: 10px 0; text-align: right; font-family: monospace; font-weight: 700; color: #2563eb;">${vpa}</td>
        </tr>
        ${notes ? `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px 0; color: #64748b;">Notes / Memo:</td>
          <td style="padding: 10px 0; text-align: right; color: #334155;">${notes}</td>
        </tr>` : ''}
      </table>

      <!-- Payment Actions -->
      <div style="text-align: center; margin-bottom: 28px;">
        ${appPayUrl ? `
        <a href="${appPayUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25); margin-bottom: 12px;">
          View & Pay Online in Portal &rarr;
        </a>
        <br/>
        ` : ''}
        <a href="${upiUri}" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px;">
          Pay via Mobile UPI App
        </a>
      </div>

      <!-- App Badges -->
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px; padding: 16px; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Supported Payment Methods</p>
        <span style="display: inline-block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; color: #334155; margin: 2px;">Google Pay</span>
        <span style="display: inline-block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; color: #334155; margin: 2px;">PhonePe</span>
        <span style="display: inline-block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; color: #334155; margin: 2px;">Paytm</span>
        <span style="display: inline-block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; color: #334155; margin: 2px;">BHIM UPI</span>
        <span style="display: inline-block; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: 600; color: #334155; margin: 2px;">Cred</span>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 12px; color: #94a3b8;">
      <p style="margin: 0 0 6px 0;">This email was sent by <strong>${storeName}</strong> via Venixa Billing System.</p>
      <p style="margin: 0;">If you have already made this payment, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    // Send using Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject: `UPI Payment Request: ₹${amount.toFixed(2)} for Bill #${orderNumber}`,
        html: htmlContent,
      }),
    });

    const resendData = await resendResponse.json() as any;

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData);
      return res.status(resendResponse.status).json({
        success: false,
        error: resendData?.message || 'Failed to send email via Resend.',
        details: resendData,
      });
    }

    return res.json({
      success: true,
      message: `Payment request email sent successfully to ${to}`,
      id: resendData?.id,
    });
  } catch (error: any) {
    console.error('Error in send-upi-request route:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Internal server error while sending email.',
    });
  }
});

export default router;
