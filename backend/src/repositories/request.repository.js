const db = require('../db/store');
const { newId, generateRequestNumber, generateOtpCode } = require('../utils/helpers');

const ACTIVE_STATUSES = ['REQUESTED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];

function create(data) {
  const now = new Date().toISOString();
  const request = {
    id: newId(),
    requestNumber: generateRequestNumber(),
    customerId: data.customerId,
    serviceTypeId: data.serviceTypeId,
    assignedPartnerId: null,
    status: 'REQUESTED',
    isSos: !!data.isSos,
    pickupLat: data.pickupLat,
    pickupLng: data.pickupLng,
    pickupAddress: data.pickupAddress || null,
    destinationLat: data.destinationLat || null,
    destinationLng: data.destinationLng || null,
    destinationAddress: data.destinationAddress || null,
    vehicleDetails: data.vehicleDetails ? JSON.stringify(data.vehicleDetails) : null,
    customerNotes: data.customerNotes || null,
    estimatedPrice: data.estimatedPrice,
    finalPrice: null,
    estimatedEtaMins: data.estimatedEtaMins || null,
    distanceKm: data.distanceKm || null,
    completionOtp: generateOtpCode(4),
    completionOtpVerifiedAt: null,
    cancelReason: null,
    cancelledBy: null,
    requestedAt: now,
    assignedAt: null,
    enRouteAt: null,
    arrivedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert('serviceRequests', request);
  addHistory(request.id, 'REQUESTED', 'SYSTEM', 'Customer placed the request');
  return request;
}

function findById(id) {
  return db.findById('serviceRequests', id);
}

function findByRequestNumber(requestNumber) {
  return db.findOne('serviceRequests', (r) => r.requestNumber === requestNumber);
}

function update(id, patch) {
  return db.update('serviceRequests', id, patch);
}

function addHistory(requestId, status, changedBy = 'SYSTEM', notes = null) {
  return db.insert('statusHistory', {
    id: newId(),
    requestId,
    status,
    changedAt: new Date().toISOString(),
    changedBy,
    notes,
  });
}

function historyFor(requestId) {
  return db
    .find('statusHistory', (h) => h.requestId === requestId)
    .sort((a, b) => new Date(a.changedAt) - new Date(b.changedAt));
}

function assignPartner(requestId, partnerId) {
  const now = new Date().toISOString();
  const updated = update(requestId, { assignedPartnerId: partnerId, status: 'ASSIGNED', assignedAt: now });
  addHistory(requestId, 'ASSIGNED', partnerId, 'Partner accepted the job');
  return updated;
}

function reassignPartner(requestId, partnerId, changedBy) {
  const now = new Date().toISOString();
  const updated = update(requestId, {
    assignedPartnerId: partnerId,
    status: 'ASSIGNED',
    assignedAt: now,
    enRouteAt: null,
    arrivedAt: null,
    startedAt: null,
  });
  addHistory(requestId, 'ASSIGNED', changedBy, 'Reassigned by admin');
  return updated;
}

const STATUS_TIMESTAMP_FIELD = {
  EN_ROUTE: 'enRouteAt',
  ARRIVED: 'arrivedAt',
  IN_PROGRESS: 'startedAt',
  COMPLETED: 'completedAt',
  CANCELLED: 'cancelledAt',
};

function transitionStatus(requestId, newStatus, changedBy, notes = null) {
  const patch = { status: newStatus };
  const field = STATUS_TIMESTAMP_FIELD[newStatus];
  if (field) patch[field] = new Date().toISOString();
  const updated = update(requestId, patch);
  addHistory(requestId, newStatus, changedBy, notes);
  return updated;
}

function cancel(requestId, reason, cancelledBy) {
  const updated = update(requestId, {
    status: 'CANCELLED',
    cancelReason: reason,
    cancelledBy,
    cancelledAt: new Date().toISOString(),
  });
  addHistory(requestId, 'CANCELLED', cancelledBy, reason);
  return updated;
}

function verifyCompletionOtp(requestId, otp) {
  const request = findById(requestId);
  if (!request) return { ok: false, reason: 'NOT_FOUND' };
  if (request.completionOtp !== otp) return { ok: false, reason: 'INVALID_OTP' };
  const updated = update(requestId, {
    status: 'COMPLETED',
    completedAt: new Date().toISOString(),
    completionOtpVerifiedAt: new Date().toISOString(),
  });
  addHistory(requestId, 'COMPLETED', request.assignedPartnerId, 'OTP verified by partner');
  return { ok: true, request: updated };
}

function listActive() {
  return db.find('serviceRequests', (r) => ACTIVE_STATUSES.includes(r.status));
}

function listAll({ status, customerId, partnerId, isSos } = {}) {
  return db.find('serviceRequests', (r) => {
    if (status && r.status !== status) return false;
    if (customerId && r.customerId !== customerId) return false;
    if (partnerId && r.assignedPartnerId !== partnerId) return false;
    if (isSos !== undefined && r.isSos !== isSos) return false;
    return true;
  });
}

function listForCustomer(customerId) {
  return db
    .find('serviceRequests', (r) => r.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function listForPartner(partnerId) {
  return db
    .find('serviceRequests', (r) => r.assignedPartnerId === partnerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  create,
  findById,
  findByRequestNumber,
  update,
  addHistory,
  historyFor,
  assignPartner,
  reassignPartner,
  transitionStatus,
  cancel,
  verifyCompletionOtp,
  listActive,
  listAll,
  listForCustomer,
  listForPartner,
  ACTIVE_STATUSES,
};
