const { z } = require('zod');
const paymentRepo = require('../repositories/payment.repository');
const requestRepo = require('../repositories/request.repository');
const customerRepo = require('../repositories/customer.repository');
const paymentIntegration = require('../integrations/payment');
const dispatchService = require('../services/dispatch.service');
const eventNotifier = require('../services/event-notifier.service');
const userRepo = require('../repositories/user.repository');
const catalogRepo = require('../repositories/catalog.repository');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

function requireOwnedPayment(req) {
  const payment = paymentRepo.findById(req.params.id);
  if (!payment) throw new HttpError(404, 'Payment not found');
  const profile = customerRepo.findByUserId(req.user.id);
  if (!profile || payment.customerId !== profile.id) throw new HttpError(403, 'You do not have access to this payment');
  return payment;
}

/**
 * Marks a payment successful and -- per the prepaid-only design -- this is the
 * moment partner dispatch actually begins. Real Razorpay checkout calls this
 * with the signed payment id; in mock mode (no Razorpay keys configured) the
 * client can call it directly to simulate a successful payment for demos.
 */
const confirmSchema = z.object({
  gatewayPaymentId: z.string().optional(),
  gatewaySignature: z.string().optional(),
});

/** POST /api/payments/:id/confirm */
const confirmPayment = asyncHandler(async (req, res) => {
  const payment = requireOwnedPayment(req);
  if (payment.status === 'SUCCESS') throw new HttpError(409, 'Payment already confirmed');

  if (!paymentIntegration.isMock()) {
    const valid = paymentIntegration.verifyPaymentSignature({
      orderId: payment.gatewayOrderId,
      paymentId: req.body.gatewayPaymentId,
      signature: req.body.gatewaySignature,
    });
    if (!valid) throw new HttpError(400, 'Payment signature verification failed');
  }

  const updatedPayment = paymentRepo.markSuccess(payment.id, {
    gatewayPaymentId: req.body.gatewayPaymentId || `pay_mock_${payment.id.slice(0, 8)}`,
    gatewaySignature: req.body.gatewaySignature || null,
  });

  const request = requestRepo.findById(payment.requestId);
  const dispatchResult = dispatchService.startDispatch(request);

  const customerProfile = customerRepo.findById(request.customerId);
  const customerUser = customerProfile ? userRepo.findById(customerProfile.userId) : null;
  const serviceType = catalogRepo.findServiceTypeById(request.serviceTypeId);
  if (customerUser) {
    eventNotifier
      .fireEvent('ORDER_CONFIRMED', { user: customerUser, request, extra: { serviceName: serviceType?.name } })
      .catch((err) => console.error('[eventNotifier] ORDER_CONFIRMED failed:', err.message));
  }

  res.json({ payment: updatedPayment, dispatch: dispatchResult });
});

/** POST /api/payments/:id/simulate-failure -- demo-mode escape hatch for the "failed payment" UI state */
const simulateFailure = asyncHandler(async (req, res) => {
  const payment = requireOwnedPayment(req);
  if (payment.status === 'SUCCESS') throw new HttpError(409, 'Payment already confirmed, cannot fail it');

  const updatedPayment = paymentRepo.markFailed(payment.id);
  const updatedRequest = requestRepo.cancel(payment.requestId, 'Payment failed', req.user.id);

  const customerProfile = customerRepo.findById(updatedRequest.customerId);
  const customerUser = customerProfile ? userRepo.findById(customerProfile.userId) : null;
  if (customerUser) {
    const serviceType = catalogRepo.findServiceTypeById(updatedRequest.serviceTypeId);
    eventNotifier
      .fireEvent('ORDER_CANCELLED', { user: customerUser, request: updatedRequest, extra: { serviceName: serviceType?.name } })
      .catch((err) => console.error('[eventNotifier] ORDER_CANCELLED failed:', err.message));
  }
  res.json({ payment: updatedPayment, request: updatedRequest });
});

/** POST /api/payments/webhook -- Razorpay server-to-server payment event callback (no auth) */
const webhook = asyncHandler(async (req, res) => {
  const signatureHeader = req.headers['x-razorpay-signature'];
  const valid = paymentIntegration.verifyWebhookSignature(JSON.stringify(req.body), signatureHeader);
  if (!valid) throw new HttpError(400, 'Invalid webhook signature');

  const orderId = req.body?.payload?.payment?.entity?.order_id;
  const paymentEntityId = req.body?.payload?.payment?.entity?.id;
  const event = req.body?.event;

  const payment = paymentRepo.listAll().find((p) => p.gatewayOrderId === orderId);
  if (payment && event === 'payment.captured' && payment.status !== 'SUCCESS') {
    paymentRepo.markSuccess(payment.id, { gatewayPaymentId: paymentEntityId, gatewaySignature: signatureHeader });
    const request = requestRepo.findById(payment.requestId);
    dispatchService.startDispatch(request);

    const customerProfile = customerRepo.findById(request.customerId);
    const customerUser = customerProfile ? userRepo.findById(customerProfile.userId) : null;
    const serviceType = catalogRepo.findServiceTypeById(request.serviceTypeId);
    if (customerUser) {
      eventNotifier
        .fireEvent('ORDER_CONFIRMED', { user: customerUser, request, extra: { serviceName: serviceType?.name } })
        .catch((err) => console.error('[eventNotifier] ORDER_CONFIRMED failed:', err.message));
    }
  } else if (payment && event === 'payment.failed') {
    paymentRepo.markFailed(payment.id);
  }
  res.json({ received: true });
});

module.exports = { confirmPayment, simulateFailure, webhook, confirmSchema };
