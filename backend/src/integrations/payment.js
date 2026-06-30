// ============================================================================
// Razorpay integration adapter (prepaid only -- UPI / Card / Netbanking / Wallet)
// ----------------------------------------------------------------------------
// If RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set, the adapter runs in
// mock mode: `createOrder` returns a fake order id, and the demo payment
// screen lets you "simulate" a successful or failed payment instantly
// instead of opening the real Razorpay checkout. Webhook signature
// verification is correspondingly skipped in mock mode.
//
// To go live: create a Razorpay account, set the two keys in .env, wire the
// returned `order.id` into the Razorpay Checkout SDK on the client, and
// point Razorpay's webhook at POST /api/payments/webhook.
// ============================================================================

const crypto = require('crypto');

const isMock = () => !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;

async function createOrder({ amount, currency = 'INR', receipt }) {
  if (isMock()) {
    return {
      id: `order_mock_${crypto.randomBytes(8).toString('hex')}`,
      amount: Math.round(amount * 100),
      currency,
      receipt,
      status: 'created',
      mock: true,
    };
  }

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const resp = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({ amount: Math.round(amount * 100), currency, receipt }),
  });
  return resp.json();
}

/** Verify the signature Razorpay sends back after checkout completes. */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (isMock()) return true; // nothing to verify against in mock mode
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

/** Verify an incoming webhook payload's signature. */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (isMock()) return true;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || '')
    .update(rawBody)
    .digest('hex');
  return expected === signatureHeader;
}

module.exports = { createOrder, verifyPaymentSignature, verifyWebhookSignature, isMock };
