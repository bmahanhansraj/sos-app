const db = require('../db/store');
const { newId, isNightTime, computePrice } = require('../utils/helpers');

// ---- Service catalog --------------------------------------------------

function createServiceType(data) {
  const now = new Date().toISOString();
  return db.insert('serviceTypes', {
    id: newId(),
    code: data.code,
    name: data.name,
    description: data.description || null,
    icon: data.icon || null,
    basePrice: data.basePrice,
    pricePerKm: data.pricePerKm || 0,
    estimatedMins: data.estimatedMins || 20,
    isActive: data.isActive !== undefined ? data.isActive : true,
    isEmergencySos: !!data.isEmergencySos,
    createdAt: now,
  });
}

function listServiceTypes({ activeOnly = true } = {}) {
  const all = db.all('serviceTypes');
  return activeOnly ? all.filter((s) => s.isActive) : all;
}

function findServiceTypeById(id) {
  return db.findById('serviceTypes', id);
}

function findServiceTypeByCode(code) {
  return db.findOne('serviceTypes', (s) => s.code === code);
}

function updateServiceType(id, patch) {
  return db.update('serviceTypes', id, patch);
}

// ---- Cities -------------------------------------------------------------

function createCity(data) {
  return db.insert('cities', {
    id: newId(),
    name: data.name,
    stateName: data.stateName || null,
    code: data.code,
    centerLat: data.centerLat ?? null,
    centerLng: data.centerLng ?? null,
    radiusKm: data.radiusKm ?? null,
    isActive: data.isActive !== undefined ? data.isActive : true,
    createdAt: new Date().toISOString(),
  });
}

function updateCity(id, patch) {
  return db.update('cities', id, patch);
}

function listCities() {
  return db.all('cities');
}

function findCityById(id) {
  return db.findById('cities', id);
}

// ---- Pricing rules --------------------------------------------------------

function createPricingRule(data) {
  return db.insert('pricingRules', {
    id: newId(),
    cityId: data.cityId || null,
    serviceTypeId: data.serviceTypeId,
    basePrice: data.basePrice,
    pricePerKm: data.pricePerKm || 0,
    surgeMultiplier: data.surgeMultiplier || 1,
    nightMultiplier: data.nightMultiplier || 1,
    minFare: data.minFare || 0,
    effectiveFrom: data.effectiveFrom || new Date().toISOString(),
    isActive: data.isActive !== undefined ? data.isActive : true,
  });
}

function listPricingRules() {
  return db.all('pricingRules');
}

function updatePricingRule(id, patch) {
  return db.update('pricingRules', id, patch);
}

function findActiveRule({ serviceTypeId, cityId }) {
  const rules = db.find(
    'pricingRules',
    (r) => r.serviceTypeId === serviceTypeId && r.isActive && (r.cityId === cityId || r.cityId === null)
  );
  // Prefer a city-specific rule over a global one.
  rules.sort((a, b) => (a.cityId ? -1 : 1) - (b.cityId ? -1 : 1));
  return rules[0] || null;
}

/** Resolve the price to quote a customer for a given service + distance. */
function quotePrice({ serviceTypeId, cityId = null, distKm = 0 }) {
  const serviceType = findServiceTypeById(serviceTypeId);
  if (!serviceType) return null;
  const rule = findActiveRule({ serviceTypeId, cityId });
  const night = isNightTime();

  const params = rule
    ? {
        basePrice: rule.basePrice,
        pricePerKm: rule.pricePerKm,
        surgeMultiplier: rule.surgeMultiplier,
        nightMultiplier: night ? rule.nightMultiplier : 1,
        minFare: rule.minFare,
      }
    : {
        basePrice: serviceType.basePrice,
        pricePerKm: serviceType.pricePerKm,
        surgeMultiplier: 1,
        nightMultiplier: 1,
        minFare: serviceType.basePrice,
      };

  return computePrice({ ...params, distKm });
}

module.exports = {
  createServiceType,
  listServiceTypes,
  findServiceTypeById,
  findServiceTypeByCode,
  updateServiceType,
  createCity,
  updateCity,
  listCities,
  findCityById,
  createPricingRule,
  listPricingRules,
  updatePricingRule,
  findActiveRule,
  quotePrice,
};
