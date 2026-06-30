const db = require('../db/store');
const { newId, distanceKm } = require('../utils/helpers');

function createProfile(userId, { vehicleType = 'NA', vehicleRegNumber = null, agencyId = null, cityId = null } = {}) {
  const now = new Date().toISOString();
  const profile = {
    id: newId(),
    userId,
    agencyId,
    cityId,
    vehicleType,
    vehicleRegNumber,
    kycStatus: 'NOT_SUBMITTED',
    kycDocuments: JSON.stringify([]),
    cashfreeRefId: null,
    panNumber: null,
    aadhaarLast4: null,
    drivingLicenseNumber: null,
    approvedAt: null,
    approvedById: null,
    rejectionReason: null,
    isOnline: false,
    isAvailable: false,
    currentLat: null,
    currentLng: null,
    lastLocationAt: null,
    bankAccountNumber: null,
    bankIfsc: null,
    upiId: null,
    avgRating: 0,
    totalRatings: 0,
    totalJobs: 0,
    totalEarnings: 0,
    createdAt: now,
    updatedAt: now,
  };
  return db.insert('servicePartners', profile);
}

function findByUserId(userId) {
  return db.findOne('servicePartners', (p) => p.userId === userId);
}

function findById(id) {
  return db.findById('servicePartners', id);
}

function update(id, patch) {
  return db.update('servicePartners', id, patch);
}

function listByKycStatus(status) {
  return db.find('servicePartners', (p) => p.kycStatus === status);
}

function listAll() {
  return db.all('servicePartners');
}

function submitKyc(id, { documents, panNumber, aadhaarLast4, drivingLicenseNumber, cashfreeRefId }) {
  return update(id, {
    kycDocuments: JSON.stringify(documents || []),
    panNumber,
    aadhaarLast4,
    drivingLicenseNumber,
    cashfreeRefId,
    kycStatus: 'PENDING_REVIEW',
  });
}

function approveKyc(id, approvedById) {
  return update(id, {
    kycStatus: 'APPROVED',
    approvedAt: new Date().toISOString(),
    approvedById,
    rejectionReason: null,
  });
}

function rejectKyc(id, reason, approvedById) {
  return update(id, {
    kycStatus: 'REJECTED',
    rejectionReason: reason,
    approvedById,
  });
}

function setAvailability(id, { isOnline, isAvailable }) {
  const patch = {};
  if (isOnline !== undefined) patch.isOnline = isOnline;
  if (isAvailable !== undefined) patch.isAvailable = isAvailable;
  // Going offline always clears availability.
  if (isOnline === false) patch.isAvailable = false;
  return update(id, patch);
}

function updateLocation(id, { lat, lng }) {
  return update(id, { currentLat: lat, currentLng: lng, lastLocationAt: new Date().toISOString() });
}

// --- Services offered (join table) -----------------------------------------

function addService(partnerId, serviceTypeId, customBasePrice = null) {
  const existing = db.findOne(
    'partnerServices',
    (ps) => ps.partnerId === partnerId && ps.serviceTypeId === serviceTypeId
  );
  if (existing) {
    return db.update('partnerServices', existing.id, { customBasePrice, isActive: true });
  }
  return db.insert('partnerServices', {
    id: newId(),
    partnerId,
    serviceTypeId,
    customBasePrice,
    isActive: true,
  });
}

function removeService(partnerId, serviceTypeId) {
  const existing = db.findOne(
    'partnerServices',
    (ps) => ps.partnerId === partnerId && ps.serviceTypeId === serviceTypeId
  );
  if (!existing) return null;
  return db.update('partnerServices', existing.id, { isActive: false });
}

function listServicesForPartner(partnerId) {
  return db.find('partnerServices', (ps) => ps.partnerId === partnerId && ps.isActive);
}

function listPartnerIdsForService(serviceTypeId) {
  return db
    .find('partnerServices', (ps) => ps.serviceTypeId === serviceTypeId && ps.isActive)
    .map((ps) => ps.partnerId);
}

/**
 * Core matching algorithm: find partners who (a) offer this service type,
 * (b) are online + available, (c) have an approved KYC, (d) are within
 * `radiusKm` of the customer, ranked by distance (nearest first).
 *
 * In production this would call the Google Distance Matrix API for
 * real road-distance/ETA instead of straight-line Haversine -- see
 * `src/integrations/maps.js` for the swappable adapter.
 */
function findNearestAvailable({ serviceTypeId, lat, lng, radiusKm = 8, limit = 10 }) {
  const eligiblePartnerIds = new Set(listPartnerIdsForService(serviceTypeId));
  const candidates = listAll().filter(
    (p) =>
      eligiblePartnerIds.has(p.id) &&
      p.isOnline &&
      p.isAvailable &&
      p.kycStatus === 'APPROVED' &&
      p.currentLat != null &&
      p.currentLng != null
  );

  const withDistance = candidates
    .map((p) => ({ partner: p, distKm: distanceKm(lat, lng, p.currentLat, p.currentLng) }))
    .filter((c) => c.distKm !== null && c.distKm <= radiusKm)
    .sort((a, b) => a.distKm - b.distKm || b.partner.avgRating - a.partner.avgRating);

  return withDistance.slice(0, limit);
}

function recordCompletedJob(id, earningsAmount) {
  const partner = findById(id);
  if (!partner) return null;
  return update(id, {
    totalJobs: (partner.totalJobs || 0) + 1,
    totalEarnings: Math.round(((partner.totalEarnings || 0) + earningsAmount) * 100) / 100,
  });
}

function recalculateRating(id) {
  const ratings = db.find('ratings', (r) => r.partnerId === id);
  if (ratings.length === 0) return update(id, { avgRating: 0, totalRatings: 0 });
  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  return update(id, {
    avgRating: Math.round((sum / ratings.length) * 10) / 10,
    totalRatings: ratings.length,
  });
}

module.exports = {
  createProfile,
  findByUserId,
  findById,
  update,
  listByKycStatus,
  listAll,
  submitKyc,
  approveKyc,
  rejectKyc,
  setAvailability,
  updateLocation,
  addService,
  removeService,
  listServicesForPartner,
  listPartnerIdsForService,
  findNearestAvailable,
  recordCompletedJob,
  recalculateRating,
};
