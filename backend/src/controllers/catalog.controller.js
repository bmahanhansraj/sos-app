const { z } = require('zod');
const catalogRepo = require('../repositories/catalog.repository');
const auditRepo = require('../repositories/audit.repository');
const geocode = require('../integrations/geocode');
const { asyncHandler, HttpError } = require('../utils/asyncHandler');

const serviceTypeSchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  icon: z.string().max(40).optional(),
  basePrice: z.number().nonnegative(),
  pricePerKm: z.number().nonnegative().optional(),
  estimatedMins: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  isEmergencySos: z.boolean().optional(),
});

const serviceTypePatchSchema = serviceTypeSchema.partial();

const citySchema = z.object({
  name: z.string().min(2).max(80),
  stateName: z.string().max(80).optional(),
  code: z.string().min(2).max(10),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  radiusKm: z.number().positive().max(200).optional(),
  isActive: z.boolean().optional(),
});

const cityPatchSchema = citySchema.partial();

const pricingRuleSchema = z.object({
  cityId: z.string().optional(),
  serviceTypeId: z.string(),
  basePrice: z.number().nonnegative(),
  pricePerKm: z.number().nonnegative().optional(),
  surgeMultiplier: z.number().positive().optional(),
  nightMultiplier: z.number().positive().optional(),
  minFare: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

const pricingRulePatchSchema = pricingRuleSchema.partial();

/** GET /api/catalog/services -- public: what the customer app shows in the service-picker grid */
const listServiceTypes = asyncHandler(async (req, res) => {
  res.json({ serviceTypes: catalogRepo.listServiceTypes({ activeOnly: true }) });
});

/** GET /api/catalog/cities -- public */
const listCities = asyncHandler(async (req, res) => {
  res.json({ cities: catalogRepo.listCities().filter((c) => c.isActive) });
});

/** GET /api/admin/catalog/services -- admin sees inactive ones too */
const adminListServiceTypes = asyncHandler(async (req, res) => {
  res.json({ serviceTypes: catalogRepo.listServiceTypes({ activeOnly: false }) });
});

/** POST /api/admin/catalog/services */
const createServiceType = asyncHandler(async (req, res) => {
  if (catalogRepo.findServiceTypeByCode(req.body.code)) {
    throw new HttpError(409, `Service code "${req.body.code}" already exists`);
  }
  const serviceType = catalogRepo.createServiceType(req.body);
  auditRepo.log({ actorId: req.user.id, action: 'SERVICE_TYPE_CREATED', entityType: 'ServiceType', entityId: serviceType.id });
  res.status(201).json({ serviceType });
});

/** PATCH /api/admin/catalog/services/:id */
const updateServiceType = asyncHandler(async (req, res) => {
  const existing = catalogRepo.findServiceTypeById(req.params.id);
  if (!existing) throw new HttpError(404, 'Service type not found');
  const updated = catalogRepo.updateServiceType(req.params.id, req.body);
  auditRepo.log({ actorId: req.user.id, action: 'SERVICE_TYPE_UPDATED', entityType: 'ServiceType', entityId: req.params.id, details: req.body });
  res.json({ serviceType: updated });
});

/** GET /api/admin/catalog/place-search?q=... -- "Add City" searchable autocomplete */
const searchPlaces = asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  if (q.trim().length < 3) return res.json({ places: [] });
  try {
    const places = await geocode.searchPlaces(q);
    res.json({ places });
  } catch (err) {
    // Don't fail the page over a flaky third-party geocoder -- the admin
    // can always fall back to typing coordinates in by hand.
    res.json({ places: [], warning: 'Place search is temporarily unavailable. You can still enter coordinates manually.' });
  }
});

/** POST /api/admin/catalog/cities -- enables multi-city expansion */
const createCity = asyncHandler(async (req, res) => {
  const city = catalogRepo.createCity(req.body);
  auditRepo.log({ actorId: req.user.id, action: 'CITY_CREATED', entityType: 'City', entityId: city.id });
  res.status(201).json({ city });
});

/** PATCH /api/admin/catalog/cities/:id -- edit a city's name/geofence */
const updateCity = asyncHandler(async (req, res) => {
  const updated = catalogRepo.updateCity(req.params.id, req.body);
  if (!updated) throw new HttpError(404, 'City not found');
  auditRepo.log({ actorId: req.user.id, action: 'CITY_UPDATED', entityType: 'City', entityId: req.params.id, details: req.body });
  res.json({ city: updated });
});

/** GET /api/admin/catalog/pricing-rules */
const listPricingRules = asyncHandler(async (req, res) => {
  res.json({ pricingRules: catalogRepo.listPricingRules() });
});

/** POST /api/admin/catalog/pricing-rules */
const createPricingRule = asyncHandler(async (req, res) => {
  if (!catalogRepo.findServiceTypeById(req.body.serviceTypeId)) {
    throw new HttpError(404, 'Service type not found');
  }
  const rule = catalogRepo.createPricingRule(req.body);
  auditRepo.log({ actorId: req.user.id, action: 'PRICING_RULE_CREATED', entityType: 'PricingRule', entityId: rule.id, details: req.body });
  res.status(201).json({ pricingRule: rule });
});

/** PATCH /api/admin/catalog/pricing-rules/:id */
const updatePricingRule = asyncHandler(async (req, res) => {
  const updated = catalogRepo.updatePricingRule(req.params.id, req.body);
  if (!updated) throw new HttpError(404, 'Pricing rule not found');
  auditRepo.log({ actorId: req.user.id, action: 'PRICING_RULE_UPDATED', entityType: 'PricingRule', entityId: req.params.id, details: req.body });
  res.json({ pricingRule: updated });
});

module.exports = {
  listServiceTypes, listCities, adminListServiceTypes, createServiceType, updateServiceType,
  createCity, updateCity, searchPlaces, listPricingRules, createPricingRule, updatePricingRule,
  serviceTypeSchema, serviceTypePatchSchema, citySchema, cityPatchSchema, pricingRuleSchema, pricingRulePatchSchema,
};
