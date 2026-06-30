const agencyRepo = require('../repositories/agency.repository');
const partnerRepo = require('../repositories/partner.repository');
const userRepo = require('../repositories/user.repository');
const requestRepo = require('../repositories/request.repository');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

function requireProfile(req) {
  const profile = agencyRepo.findByUserId(req.user.id);
  if (!profile) throw new HttpError(404, 'Agency profile not found');
  return profile;
}

function myPartners(agencyId) {
  return partnerRepo.listAll().filter((p) => p.agencyId === agencyId);
}

/** GET /api/agency/me */
const getMyProfile = asyncHandler(async (req, res) => {
  res.json({ profile: requireProfile(req) });
});

/** GET /api/agency/partners -- the pool of partners this agency manages */
const listMyPartners = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const partners = myPartners(profile.id).map((p) => ({ ...p, user: userRepo.findById(p.userId) }));
  res.json({ partners });
});

/** GET /api/agency/requests -- jobs fulfilled by this agency's partners */
const listMyRequests = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const partnerIds = new Set(myPartners(profile.id).map((p) => p.id));
  const requests = requestRepo.listAll({}).filter((r) => partnerIds.has(r.assignedPartnerId));
  res.json({ requests });
});

/** GET /api/agency/summary -- basic dashboard stats */
const getSummary = asyncHandler(async (req, res) => {
  const profile = requireProfile(req);
  const partners = myPartners(profile.id);
  const partnerIds = new Set(partners.map((p) => p.id));
  const requests = requestRepo.listAll({}).filter((r) => partnerIds.has(r.assignedPartnerId));

  res.json({
    totalPartners: partners.length,
    onlinePartners: partners.filter((p) => p.isOnline).length,
    approvedPartners: partners.filter((p) => p.kycStatus === 'APPROVED').length,
    totalJobsCompleted: partners.reduce((sum, p) => sum + (p.totalJobs || 0), 0),
    totalEarnings: Math.round(partners.reduce((sum, p) => sum + (p.totalEarnings || 0), 0) * 100) / 100,
    activeRequests: requests.filter((r) => ['ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(r.status)).length,
  });
});

module.exports = { getMyProfile, listMyPartners, listMyRequests, getSummary };
