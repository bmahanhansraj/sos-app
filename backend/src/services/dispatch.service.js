// ============================================================================
// Dispatch service
// ----------------------------------------------------------------------------
// Implements the "Assign nearest available service partner" requirement as
// a sequential offer queue (the same pattern ride-hailing apps use):
//
//   1. Rank online + available + KYC-approved partners offering this
//      service type by straight-line distance (Haversine fallback, or the
//      Google Distance Matrix adapter when a Maps API key is configured).
//   2. Offer the job to the nearest partner first via push + socket event,
//      with a response window (default 45s, enforced client-side by the
//      partner app countdown; this service also exposes an `expireOffer`
//      helper the partner app calls on timeout).
//   3. If rejected or expired, offer to the next nearest partner.
//   4. If the queue is exhausted, mark the request NO_PARTNER_FOUND so the
//      admin dashboard can intervene (manual assignment).
//
// An admin can short-circuit this at any point via `manualAssign`.
// ============================================================================

const partnerRepo = require('../repositories/partner.repository');
const requestRepo = require('../repositories/request.repository');
const customerRepo = require('../repositories/customer.repository');
const notificationRepo = require('../repositories/notification.repository');
const userRepo = require('../repositories/user.repository');
const sms = require('../integrations/sms');
const push = require('../integrations/push');

// In-memory offer queues, keyed by requestId. (Acceptable for a single-
// process demo; in production this would live in Redis so it survives
// restarts and works across multiple API instances.)
const offerQueues = new Map();

function getIOSafe() {
  try {
    return require('../sockets').getIO();
  } catch {
    return null;
  }
}

async function notifyPartner(partner, request) {
  const user = userRepo.findById(partner.userId);
  notificationRepo.create({
    userId: partner.userId,
    type: 'JOB_OFFER',
    title: request.isSos ? '🚨 Emergency SOS request nearby' : 'New job request nearby',
    body: `Request ${request.requestNumber} — est. ₹${request.estimatedPrice}, ${request.distanceToPartnerKm ?? '?'} km away`,
    data: { requestId: request.id },
  });
  if (user) await push.sendPush(user.fcmToken, {
    title: 'New job offer',
    body: `${request.requestNumber}: ₹${request.estimatedPrice} estimated`,
    data: { requestId: request.id },
  });

  const io = getIOSafe();
  if (io) io.to(`partner:${partner.id}`).emit('job:offer', { request });
}

function notifyCustomerNoPartner(request) {
  const customerProfile = customerRepo.findById(request.customerId);
  if (customerProfile) {
    notificationRepo.create({
      userId: customerProfile.userId,
      type: 'STATUS_UPDATE',
      title: 'No partner available right now',
      body: `We couldn't find an available partner for request ${request.requestNumber}. Our team has been alerted.`,
      data: { requestId: request.id },
    });
  }
  const io = getIOSafe();
  if (io) io.to(`request:${request.id}`).emit('request:status', { request });
}

/** Kicks off (or re-kicks off) the offer queue for a paid request. */
function startDispatch(request) {
  const matches = partnerRepo.findNearestAvailable({
    serviceTypeId: request.serviceTypeId,
    lat: request.pickupLat,
    lng: request.pickupLng,
    radiusKm: Number(process.env.DEFAULT_SEARCH_RADIUS_KM || 8),
  });

  if (matches.length === 0) {
    requestRepo.update(request.id, { status: 'NO_PARTNER_FOUND' });
    notifyCustomerNoPartner(request);
    return { dispatched: false };
  }

  const queue = matches.map((m) => ({ partnerId: m.partner.id, distKm: m.distKm }));
  offerQueues.set(request.id, queue);
  offerNext(request.id);
  return { dispatched: true, candidateCount: queue.length };
}

function offerNext(requestId) {
  const queue = offerQueues.get(requestId) || [];
  if (queue.length === 0) {
    const request = requestRepo.update(requestId, { status: 'NO_PARTNER_FOUND' });
    notifyCustomerNoPartner(request);
    offerQueues.delete(requestId);
    return null;
  }
  const next = queue.shift();
  offerQueues.set(requestId, queue);

  const partner = partnerRepo.findById(next.partnerId);
  const request = requestRepo.findById(requestId);
  if (!partner || !request) return null;

  notifyPartner({ ...partner, distanceToPartnerKm: next.distKm }, { ...request, distanceToPartnerKm: next.distKm });
  return partner;
}

/** Called when a partner taps Accept on a job offer. */
function acceptOffer(requestId, partnerId) {
  const request = requestRepo.findById(requestId);
  if (!request) return { ok: false, reason: 'NOT_FOUND' };
  if (request.status !== 'REQUESTED') return { ok: false, reason: 'ALREADY_TAKEN' };

  const updated = requestRepo.assignPartner(requestId, partnerId);
  partnerRepo.update(partnerId, { isAvailable: false });
  offerQueues.delete(requestId);

  const customerProfile = customerRepo.findById(updated.customerId);
  if (customerProfile) {
    notificationRepo.create({
      userId: customerProfile.userId,
      type: 'STATUS_UPDATE',
      title: 'Partner assigned!',
      body: `A service partner has accepted request ${updated.requestNumber} and is on the way.`,
      data: { requestId },
    });
  }

  const io = getIOSafe();
  if (io) {
    io.to(`request:${requestId}`).emit('request:assigned', { request: updated });
    io.to('admin').emit('request:assigned', { request: updated });
  }
  return { ok: true, request: updated };
}

/** Called when a partner taps Reject, or their offer window times out. */
function rejectOrExpireOffer(requestId, partnerId) {
  const request = requestRepo.findById(requestId);
  if (!request || request.status !== 'REQUESTED') return { ok: false, reason: 'NOT_APPLICABLE' };
  const nextPartner = offerNext(requestId);
  return { ok: true, offeredTo: nextPartner?.id || null };
}

/** Admin override: assign or reassign a request to a specific partner. */
function manualAssign(requestId, partnerId, adminUserId) {
  offerQueues.delete(requestId);
  const request = requestRepo.findById(requestId);
  const wasAssignedBefore = !!request?.assignedPartnerId;
  const updated = wasAssignedBefore
    ? requestRepo.reassignPartner(requestId, partnerId, adminUserId)
    : requestRepo.assignPartner(requestId, partnerId);
  partnerRepo.update(partnerId, { isAvailable: false });

  const io = getIOSafe();
  if (io) {
    io.to(`request:${requestId}`).emit('request:assigned', { request: updated });
    io.to('admin').emit('request:assigned', { request: updated });
    io.to(`partner:${partnerId}`).emit('job:offer', { request: updated, manuallyAssigned: true });
  }
  return updated;
}

module.exports = { startDispatch, acceptOffer, rejectOrExpireOffer, manualAssign };
