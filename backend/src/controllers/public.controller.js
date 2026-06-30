// ============================================================================
// Public controller
// ----------------------------------------------------------------------------
// Endpoints here are intentionally unauthenticated -- they back the public
// marketing website (sos.ind.in), not the admin portal. Every response is
// an aggregate count only; nothing here ever returns a name, phone number,
// address, or any other record-level data. If a field can't be reduced to
// "how many", it doesn't belong in this controller.
// ============================================================================

const partnerRepo = require('../repositories/partner.repository');
const requestRepo = require('../repositories/request.repository');
const catalogRepo = require('../repositories/catalog.repository');
const { asyncHandler } = require('../utils/asyncHandler');

/** GET /api/public/stats -- live counts for the website's homepage stat strip */
const getPublicStats = asyncHandler(async (req, res) => {
  const verifiedPartners = partnerRepo.listByKycStatus('APPROVED').length;

  const ordersServed = requestRepo.listAll({ status: 'COMPLETED' }).length;

  const cities = catalogRepo.listCities();
  const citiesServing = cities.filter((c) => c.isActive).length;

  const serviceTypes = catalogRepo.listServiceTypes({ activeOnly: true });

  res.set('Cache-Control', 'public, max-age=30'); // cheap to compute, but no need to recompute on every single page load
  res.json({
    verifiedPartners,
    ordersServed,
    citiesServing,
    serviceTypesOffered: serviceTypes.length,
    generatedAt: new Date().toISOString(),
  });
});

module.exports = { getPublicStats };
