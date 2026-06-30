const db = require('../db/store');
const { newId } = require('../utils/helpers');

function record({ partnerId, lat, lng, heading, speedKmph, requestId }) {
  return db.insert('locationPings', {
    id: newId(),
    partnerId,
    lat,
    lng,
    heading: heading ?? null,
    speedKmph: speedKmph ?? null,
    requestId: requestId || null,
    recordedAt: new Date().toISOString(),
  });
}

function recentForPartner(partnerId, limit = 50) {
  return db
    .find('locationPings', (p) => p.partnerId === partnerId)
    .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
    .slice(0, limit);
}

module.exports = { record, recentForPartner };
