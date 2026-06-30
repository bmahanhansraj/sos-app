// ============================================================================
// Delay monitor service
// ----------------------------------------------------------------------------
// "Order Delayed" is the one lifecycle event in the notification rules
// engine that isn't triggered directly by a single API call -- it's a
// condition that becomes true while a request just sits there. This runs a
// periodic sweep over active, assigned requests and flags the ones that
// have blown past their estimated ETA by more than a grace buffer.
//
// Each request is only flagged (and ORDER_DELAYED fired) once -- a
// `delayFlaggedAt` timestamp on the request record prevents re-firing every
// sweep for the same request. There's no separate "un-delay" transition;
// once a request finally completes or gets cancelled it leaves the active
// pool this sweep scans, so it naturally stops being checked.
// ============================================================================

const requestRepo = require('../repositories/request.repository');
const customerRepo = require('../repositories/customer.repository');
const partnerRepo = require('../repositories/partner.repository');
const userRepo = require('../repositories/user.repository');
const catalogRepo = require('../repositories/catalog.repository');
const eventNotifier = require('./event-notifier.service');

// Statuses where a partner is already assigned and en route/working --
// REQUESTED (no partner yet) is intentionally excluded; "no partner found"
// has its own distinct status and notification path, not a delay.
const DELAY_ELIGIBLE_STATUSES = ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

const GRACE_BUFFER_MINUTES = Number(process.env.DELAY_GRACE_BUFFER_MINUTES || 10);
const SWEEP_INTERVAL_MS = Number(process.env.DELAY_SWEEP_INTERVAL_MS || 2 * 60 * 1000);

async function sweepOnce() {
  const now = Date.now();
  const candidates = requestRepo.listActive().filter((r) => DELAY_ELIGIBLE_STATUSES.includes(r.status) && !r.delayFlaggedAt && r.assignedAt);

  for (const request of candidates) {
    const etaMins = request.estimatedEtaMins ?? 30;
    const deadline = new Date(request.assignedAt).getTime() + (etaMins + GRACE_BUFFER_MINUTES) * 60 * 1000;
    if (now < deadline) continue;

    requestRepo.update(request.id, { delayFlaggedAt: new Date().toISOString() });

    const customerProfile = customerRepo.findById(request.customerId);
    const customerUser = customerProfile ? userRepo.findById(customerProfile.userId) : null;
    if (!customerUser) continue;

    const serviceType = catalogRepo.findServiceTypeById(request.serviceTypeId);
    const partner = request.assignedPartnerId ? partnerRepo.findById(request.assignedPartnerId) : null;
    const partnerUser = partner ? userRepo.findById(partner.userId) : null;

    try {
      await eventNotifier.fireEvent('ORDER_DELAYED', {
        user: customerUser,
        request,
        extra: { serviceName: serviceType?.name, partnerName: partnerUser?.name },
      });
    } catch (err) {
      console.error('[delay-monitor] ORDER_DELAYED dispatch failed:', err.message);
    }
  }
}

let intervalHandle = null;

function start() {
  if (intervalHandle) return; // already running
  intervalHandle = setInterval(() => {
    sweepOnce().catch((err) => console.error('[delay-monitor] sweep failed:', err.message));
  }, SWEEP_INTERVAL_MS);
  // Unref so this timer never keeps the process alive on its own (e.g. in tests).
  if (intervalHandle.unref) intervalHandle.unref();
}

function stop() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

module.exports = { start, stop, sweepOnce, GRACE_BUFFER_MINUTES, SWEEP_INTERVAL_MS };
