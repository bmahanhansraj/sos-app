const { z } = require('zod');
const requestRepo = require('../repositories/request.repository');
const customerRepo = require('../repositories/customer.repository');
const partnerRepo = require('../repositories/partner.repository');
const userRepo = require('../repositories/user.repository');
const catalogRepo = require('../repositories/catalog.repository');
const paymentRepo = require('../repositories/payment.repository');
const ratingRepo = require('../repositories/rating.repository');
const chatRepo = require('../repositories/chat.repository');
const notificationRepo = require('../repositories/notification.repository');
const dispatchService = require('../services/dispatch.service');
const eventNotifier = require('../services/event-notifier.service');
const paymentIntegration = require('../integrations/payment');
const { estimateEtaMinutes } = require('../utils/helpers');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

function getIOSafe() {
  try {
    return require('../sockets').getIO();
  } catch {
    return null;
  }
}

function emitStatus(request) {
  const io = getIOSafe();
  if (io) {
    io.to(`request:${request.id}`).emit('request:status', { request });
    io.to('admin').emit('request:status', { request });
  }
}

// ---------------------------------------------------------------------------

const quoteSchema = z.object({
  serviceTypeId: z.string(),
  pickupLat: z.number(),
  pickupLng: z.number(),
});

/** POST /api/requests/quote -- "show estimated price + ETA per nearby partner" before booking */
const getQuote = asyncHandler(async (req, res) => {
  const { serviceTypeId, pickupLat, pickupLng } = req.body;
  const serviceType = catalogRepo.findServiceTypeById(serviceTypeId);
  if (!serviceType) throw new HttpError(404, 'Service type not found');

  const radiusKm = Number(process.env.DEFAULT_SEARCH_RADIUS_KM || 8);
  const matches = partnerRepo.findNearestAvailable({ serviceTypeId, lat: pickupLat, lng: pickupLng, radiusKm, limit: 10 });

  const quotes = matches.map(({ partner, distKm }) => {
    const user = userRepo.findById(partner.userId);
    return {
      partnerId: partner.id,
      partnerName: user?.name || 'Service Partner',
      vehicleType: partner.vehicleType,
      avgRating: partner.avgRating,
      totalRatings: partner.totalRatings,
      distanceKm: distKm,
      etaMinutes: estimateEtaMinutes(distKm),
      estimatedPrice: catalogRepo.quotePrice({ serviceTypeId, cityId: partner.cityId, distKm }),
    };
  });

  res.json({
    serviceType,
    quotes,
    overallEstimatedPrice: catalogRepo.quotePrice({ serviceTypeId, distKm: 0 }),
    searchRadiusKm: radiusKm,
    partnersFound: quotes.length,
  });
});

// ---------------------------------------------------------------------------

const createRequestSchema = z.object({
  serviceTypeId: z.string(),
  pickupLat: z.number(),
  pickupLng: z.number(),
  pickupAddress: z.string().max(300).optional(),
  destinationLat: z.number().optional(),
  destinationLng: z.number().optional(),
  destinationAddress: z.string().max(300).optional(),
  vehicleDetails: z.object({
    type: z.string().optional(),
    regNumber: z.string().optional(),
    model: z.string().optional(),
    color: z.string().optional(),
  }).optional(),
  customerNotes: z.string().max(500).optional(),
  isSos: z.boolean().optional(),
  paymentMethod: z.enum(['UPI', 'CARD', 'NETBANKING', 'WALLET']),
});

/** POST /api/requests -- place a service request (payment created, dispatch starts after payment confirms) */
const createRequest = asyncHandler(async (req, res) => {
  const profile = customerRepo.findByUserId(req.user.id);
  if (!profile) throw new HttpError(404, 'Customer profile not found');

  const serviceType = catalogRepo.findServiceTypeById(req.body.serviceTypeId);
  if (!serviceType) throw new HttpError(404, 'Service type not found');

  const estimatedPrice = catalogRepo.quotePrice({ serviceTypeId: serviceType.id, distKm: 0 });

  const request = requestRepo.create({
    customerId: profile.id,
    serviceTypeId: serviceType.id,
    pickupLat: req.body.pickupLat,
    pickupLng: req.body.pickupLng,
    pickupAddress: req.body.pickupAddress,
    destinationLat: req.body.destinationLat,
    destinationLng: req.body.destinationLng,
    destinationAddress: req.body.destinationAddress,
    vehicleDetails: req.body.vehicleDetails,
    customerNotes: req.body.customerNotes,
    isSos: req.body.isSos,
    estimatedPrice,
    estimatedEtaMins: serviceType.estimatedMins,
  });
  customerRepo.incrementRequestCount(profile.id);

  const order = await paymentIntegration.createOrder({ amount: estimatedPrice, receipt: request.requestNumber });
  const payment = paymentRepo.create({
    requestId: request.id,
    customerId: profile.id,
    amount: estimatedPrice,
    method: req.body.paymentMethod,
    gatewayOrderId: order.id,
  });

  res.status(201).json({
    request,
    payment,
    razorpayOrder: order,
    mockPayment: paymentIntegration.isMock(),
  });
});

function ownsOrCanView(req, request) {
  if (req.user.role === 'ADMIN') return true;
  if (req.user.role === 'CUSTOMER') {
    const profile = customerRepo.findByUserId(req.user.id);
    return profile && request.customerId === profile.id;
  }
  if (req.user.role === 'PARTNER') {
    const profile = partnerRepo.findByUserId(req.user.id);
    return profile && request.assignedPartnerId === profile.id;
  }
  return false;
}

/** GET /api/requests/:id */
const getRequest = asyncHandler(async (req, res) => {
  const request = requestRepo.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  if (!ownsOrCanView(req, request)) throw new HttpError(403, 'You do not have access to this request');
  res.json({ request, history: requestRepo.historyFor(request.id) });
});

/** GET /api/requests/:id/partner-location -- live tracking: last known position of the assigned partner */
const getPartnerLocation = asyncHandler(async (req, res) => {
  const request = requestRepo.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  if (!ownsOrCanView(req, request)) throw new HttpError(403, 'You do not have access to this request');
  if (!request.assignedPartnerId) return res.json({ partner: null });

  const partner = partnerRepo.findById(request.assignedPartnerId);
  if (!partner) return res.json({ partner: null });
  const user = userRepo.findById(partner.userId);

  res.json({
    partner: {
      id: partner.id,
      name: user?.name || 'Service partner',
      phone: user?.phone,
      vehicleType: partner.vehicleType,
      avgRating: partner.avgRating,
      lat: partner.currentLat,
      lng: partner.currentLng,
      lastLocationAt: partner.lastLocationAt,
    },
  });
});

/** GET /api/requests -- role-scoped list (customer: own, partner: own, admin: all + filters) */
const listRequests = asyncHandler(async (req, res) => {
  if (req.user.role === 'CUSTOMER') {
    const profile = customerRepo.findByUserId(req.user.id);
    return res.json({ requests: profile ? requestRepo.listForCustomer(profile.id) : [] });
  }
  if (req.user.role === 'PARTNER') {
    const profile = partnerRepo.findByUserId(req.user.id);
    return res.json({ requests: profile ? requestRepo.listForPartner(profile.id) : [] });
  }
  // ADMIN
  const { status, customerId, partnerId, isSos } = req.query;
  res.json({
    requests: requestRepo.listAll({
      status,
      customerId,
      partnerId,
      isSos: isSos === undefined ? undefined : isSos === 'true',
    }),
  });
});

// ---------------------------------------------------------------------------

const respondSchema = z.object({ action: z.enum(['ACCEPT', 'REJECT']) });

/** POST /api/requests/:id/respond -- partner accepts or rejects a job offer */
const respondToOffer = asyncHandler(async (req, res) => {
  const profile = partnerRepo.findByUserId(req.user.id);
  if (!profile) throw new HttpError(404, 'Partner profile not found');

  if (req.body.action === 'ACCEPT') {
    const result = dispatchService.acceptOffer(req.params.id, profile.id);
    if (!result.ok) throw new HttpError(409, `Could not accept: ${result.reason}`);
    return res.json({ request: result.request });
  }
  const result = dispatchService.rejectOrExpireOffer(req.params.id, profile.id);
  res.json({ ok: result.ok, offeredToNextPartner: !!result.offeredTo });
});

// ---------------------------------------------------------------------------

const VALID_NEXT_STATUS = {
  ASSIGNED: ['EN_ROUTE'],
  EN_ROUTE: ['ARRIVED'],
  ARRIVED: ['IN_PROGRESS'],
};

const statusSchema = z.object({ status: z.enum(['EN_ROUTE', 'ARRIVED', 'IN_PROGRESS']) });

/** PATCH /api/requests/:id/status -- partner-driven lifecycle transitions */
const updateStatus = asyncHandler(async (req, res) => {
  const profile = partnerRepo.findByUserId(req.user.id);
  const request = requestRepo.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  if (!profile || request.assignedPartnerId !== profile.id) {
    throw new HttpError(403, 'You are not the assigned partner for this request');
  }
  const allowedNext = VALID_NEXT_STATUS[request.status] || [];
  if (!allowedNext.includes(req.body.status)) {
    throw new HttpError(409, `Cannot move from ${request.status} to ${req.body.status}`);
  }

  const updated = requestRepo.transitionStatus(request.id, req.body.status, profile.id);
  emitStatus(updated);

  const customerProfile = customerRepo.findById(request.customerId);
  if (customerProfile) {
    const labels = { EN_ROUTE: 'is on the way', ARRIVED: 'has arrived', IN_PROGRESS: 'has started the job' };
    notificationRepo.create({
      userId: customerProfile.userId,
      type: 'STATUS_UPDATE',
      title: `Update on ${request.requestNumber}`,
      body: `Your service partner ${labels[req.body.status] || 'updated the job status'}.`,
      data: { requestId: request.id },
    });
  }
  res.json({ request: updated });
});

// ---------------------------------------------------------------------------

const completeSchema = z.object({
  otp: z.string().min(4).max(8),
  finalPrice: z.number().nonnegative().optional(),
});

/** POST /api/requests/:id/complete -- OTP-verified job completion (partner-initiated) */
const completeRequest = asyncHandler(async (req, res) => {
  const profile = partnerRepo.findByUserId(req.user.id);
  const request = requestRepo.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  if (!profile || request.assignedPartnerId !== profile.id) {
    throw new HttpError(403, 'You are not the assigned partner for this request');
  }
  if (request.status !== 'IN_PROGRESS') {
    throw new HttpError(409, `Job must be IN_PROGRESS before completion (currently ${request.status})`);
  }

  const result = requestRepo.verifyCompletionOtp(request.id, req.body.otp);
  if (!result.ok) throw new HttpError(400, result.reason === 'INVALID_OTP' ? 'Incorrect completion OTP' : 'Could not verify OTP');

  const finalPrice = req.body.finalPrice ?? request.estimatedPrice;
  requestRepo.update(request.id, { finalPrice });
  partnerRepo.recordCompletedJob(profile.id, finalPrice);
  partnerRepo.update(profile.id, { isAvailable: profile.isOnline });

  emitStatus(result.request);

  const customerProfile = customerRepo.findById(request.customerId);
  if (customerProfile) {
    notificationRepo.create({
      userId: customerProfile.userId,
      type: 'STATUS_UPDATE',
      title: `${request.requestNumber} completed`,
      body: 'Your service is complete. Please rate your experience!',
      data: { requestId: request.id },
    });
    const customerUser = userRepo.findById(customerProfile.userId);
    const serviceType = catalogRepo.findServiceTypeById(request.serviceTypeId);
    const partner = request.assignedPartnerId ? partnerRepo.findById(request.assignedPartnerId) : null;
    const partnerUser = partner ? userRepo.findById(partner.userId) : null;
    if (customerUser) {
      eventNotifier
        .fireEvent('ORDER_COMPLETED', { user: customerUser, request: { ...request, finalPrice }, extra: { serviceName: serviceType?.name, partnerName: partnerUser?.name } })
        .catch((err) => console.error('[eventNotifier] ORDER_COMPLETED failed:', err.message));
    }
  }
  res.json({ request: { ...result.request, finalPrice } });
});

// ---------------------------------------------------------------------------

const cancelSchema = z.object({ reason: z.string().max(300).optional() });

/** POST /api/requests/:id/cancel */
const cancelRequest = asyncHandler(async (req, res) => {
  const request = requestRepo.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  if (!ownsOrCanView(req, request)) throw new HttpError(403, 'You do not have access to this request');
  if (['COMPLETED', 'CANCELLED'].includes(request.status)) {
    throw new HttpError(409, `Request is already ${request.status}`);
  }

  if (request.assignedPartnerId) {
    const partner = partnerRepo.findById(request.assignedPartnerId);
    if (partner) partnerRepo.update(partner.id, { isAvailable: partner.isOnline });
  }

  const updated = requestRepo.cancel(request.id, req.body.reason || 'Cancelled by user', req.user.id);
  emitStatus(updated);

  const customerProfile = customerRepo.findById(updated.customerId);
  const customerUser = customerProfile ? userRepo.findById(customerProfile.userId) : null;
  if (customerUser) {
    const serviceType = catalogRepo.findServiceTypeById(updated.serviceTypeId);
    const partner = updated.assignedPartnerId ? partnerRepo.findById(updated.assignedPartnerId) : null;
    const partnerUser = partner ? userRepo.findById(partner.userId) : null;
    eventNotifier
      .fireEvent('ORDER_CANCELLED', { user: customerUser, request: updated, extra: { serviceName: serviceType?.name, partnerName: partnerUser?.name } })
      .catch((err) => console.error('[eventNotifier] ORDER_CANCELLED failed:', err.message));
  }
  res.json({ request: updated });
});

// ---------------------------------------------------------------------------

const rateSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(500).optional(),
});

/** POST /api/requests/:id/rate */
const rateRequest = asyncHandler(async (req, res) => {
  const request = requestRepo.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  const profile = customerRepo.findByUserId(req.user.id);
  if (!profile || request.customerId !== profile.id) throw new HttpError(403, 'You do not have access to this request');
  if (request.status !== 'COMPLETED') throw new HttpError(409, 'You can only rate a completed request');
  if (ratingRepo.findByRequestId(request.id)) throw new HttpError(409, 'This request has already been rated');

  const rating = ratingRepo.create({
    requestId: request.id,
    customerId: req.user.id,
    partnerId: request.assignedPartnerId,
    rating: req.body.rating,
    review: req.body.review,
  });
  partnerRepo.recalculateRating(request.assignedPartnerId);
  res.status(201).json({ rating });
});

// ---------------------------------------------------------------------------

const chatSchema = z.object({ message: z.string().min(1).max(1000) });

/** GET /api/requests/:id/chat */
const listChat = asyncHandler(async (req, res) => {
  const request = requestRepo.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  if (!ownsOrCanView(req, request)) throw new HttpError(403, 'You do not have access to this request');
  res.json({ messages: chatRepo.listForRequest(request.id) });
});

/** POST /api/requests/:id/chat -- in-app chat between customer & partner */
const postChat = asyncHandler(async (req, res) => {
  const request = requestRepo.findById(req.params.id);
  if (!request) throw new HttpError(404, 'Request not found');
  if (!ownsOrCanView(req, request)) throw new HttpError(403, 'You do not have access to this request');

  const message = chatRepo.create({ requestId: request.id, senderId: req.user.id, message: req.body.message });
  const io = getIOSafe();
  if (io) io.to(`request:${request.id}`).emit('chat:message', { message });
  res.status(201).json({ message });
});

module.exports = {
  getQuote, createRequest, getRequest, getPartnerLocation, listRequests, respondToOffer, updateStatus,
  completeRequest, cancelRequest, rateRequest, listChat, postChat,
  quoteSchema, createRequestSchema, respondSchema, statusSchema, completeSchema,
  cancelSchema, rateSchema, chatSchema,
};
