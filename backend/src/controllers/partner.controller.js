const { z } = require('zod');
const partnerRepo = require('../repositories/partner.repository');
const requestRepo = require('../repositories/request.repository');
const ratingRepo = require('../repositories/rating.repository');
const catalogRepo = require('../repositories/catalog.repository');
const kyc = require('../integrations/kyc');
const locationRepo = require('../repositories/location.repository');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

function requireProfile(req) {
  const profile = partnerRepo.findByUserId(req.user.id);
  if (!profile) throw new HttpError(404, 'Partner profile not found');
  return profile;
}

function getIOSafe() {
  try {
    return require('../sockets').getIO();
  } catch {
    return null;
  }
}

const kycSchema = z.object({
  documentType: z.enum(['PAN', 'AADHAAR', 'DRIVING_LICENSE']),
  documentNumber: z.string().min(4).max(30),
  name: z.string().min(1).max(100),
  documents: z
    .array(z.object({ type: z.string(), url: z.string() }))
    .optional(), // uploaded doc image URLs (object storage would live behind these in production)
  vehicleType: z
    .enum([
      'TWO_WHEELER', 'THREE_WHEELER', 'FOUR_WHEELER_HATCH', 'FOUR_WHEELER_SEDAN',
      'FOUR_WHEELER_SUV', 'COMMERCIAL', 'TOW_TRUCK_FLATBED', 'TOW_TRUCK_CRANE', 'NA',
    ])
    .optional(),
  vehicleRegNumber: z.string().max(20).optional(),
});

const availabilitySchema = z.object({
  isOnline: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  heading: z.number().optional(),
  speedKmph: z.number().optional(),
  requestId: z.string().optional(),
});

const addServiceSchema = z.object({
  serviceTypeId: z.string(),
  customBasePrice: z.number().nonnegative().optional(),
});

const joinAgencySchema = z.object({ agencyId: z.string() });

/** GET /api/partners/me */
const getMyProfile = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const services = partnerRepo.listServicesForPartner(profile.id);
  res.json({ profile, services });
});

/** POST /api/partners/kyc -- submit a document for verification (Cashfree Secure ID) */
const submitKyc = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const { documentType, documentNumber, name, documents, vehicleType, vehicleRegNumber } = req.body;

  const verification = await kyc.verifyDocument({ documentType, documentNumber, name });

  if (vehicleType || vehicleRegNumber) {
    partnerRepo.update(profile.id, {
      ...(vehicleType ? { vehicleType } : {}),
      ...(vehicleRegNumber ? { vehicleRegNumber } : {}),
    });
  }

  const patch = { documents: documents || [] };
  if (documentType === 'PAN') patch.panNumber = documentNumber;
  if (documentType === 'AADHAAR') patch.aadhaarLast4 = documentNumber.slice(-4);
  if (documentType === 'DRIVING_LICENSE') patch.drivingLicenseNumber = documentNumber;
  patch.cashfreeRefId = verification.refId;

  const updated = partnerRepo.submitKyc(profile.id, patch);
  res.json({ profile: updated, verification });
});

/** PATCH /api/partners/me/availability */
const setAvailability = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  if (profile.kycStatus !== 'APPROVED' && req.body.isOnline) {
    throw new HttpError(403, 'Your KYC must be approved before you can go online.');
  }
  const updated = partnerRepo.setAvailability(profile.id, req.body);
  res.json({ profile: updated });
});

/** PATCH /api/partners/me/location -- also usable as a REST fallback to the socket event */
const updateLocation = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const { lat, lng, heading, speedKmph, requestId } = req.body;
  const updated = partnerRepo.updateLocation(profile.id, { lat, lng });
  locationRepo.record({ partnerId: profile.id, lat, lng, heading, speedKmph, requestId });

  const io = getIOSafe();
  if (io) {
    const payload = { partnerId: profile.id, lat, lng, heading, speedKmph };
    io.to('admin').emit('partner:location', payload);
    if (requestId) io.to(`request:${requestId}`).emit('partner:location', payload);
  }
  res.json({ profile: updated });
});

/** GET /api/partners/me/services */
const listServices = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  res.json({ services: partnerRepo.listServicesForPartner(profile.id) });
});

/** POST /api/partners/me/services */
const addService = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const serviceType = catalogRepo.findServiceTypeById(req.body.serviceTypeId);
  if (!serviceType) throw new HttpError(404, 'Service type not found');
  const link = partnerRepo.addService(profile.id, req.body.serviceTypeId, req.body.customBasePrice ?? null);
  res.status(201).json({ service: link });
});

/** DELETE /api/partners/me/services/:serviceTypeId */
const removeService = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  partnerRepo.removeService(profile.id, req.params.serviceTypeId);
  res.json({ ok: true });
});

/** GET /api/partners/me/jobs */
const listJobs = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  res.json({ jobs: requestRepo.listForPartner(profile.id) });
});

/** GET /api/partners/me/earnings */
const getEarnings = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const jobs = requestRepo.listForPartner(profile.id).filter((j) => j.status === 'COMPLETED');
  res.json({
    totalEarnings: profile.totalEarnings,
    totalJobs: profile.totalJobs,
    avgRating: profile.avgRating,
    totalRatings: profile.totalRatings,
    recentCompletedJobs: jobs.slice(0, 20),
  });
});

/** GET /api/partners/me/ratings */
const listRatings = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  res.json({ ratings: ratingRepo.listForPartner(profile.id) });
});

/** POST /api/partners/me/join-agency -- self-associate with an RSA agency (basic-dashboard role) */
const joinAgency = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const agencyRepo = require('../repositories/agency.repository');
  const agency = agencyRepo.findById(req.body.agencyId);
  if (!agency) throw new HttpError(404, 'Agency not found');
  const updated = partnerRepo.update(profile.id, { agencyId: agency.id });
  res.json({ profile: updated });
});

module.exports = {
  getMyProfile, submitKyc, setAvailability, updateLocation,
  listServices, addService, removeService, listJobs, getEarnings, listRatings, joinAgency,
  kycSchema, availabilitySchema, locationSchema, addServiceSchema, joinAgencySchema,
};
