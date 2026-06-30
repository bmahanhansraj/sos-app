const { v4: uuidv4 } = require('uuid');

function newId() {
  return uuidv4();
}

/** Haversine distance in km between two lat/lng points. */
function distanceKm(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v === null || v === undefined)) return null;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/** ETA in minutes given distance and an average city speed (env-configurable). */
function estimateEtaMinutes(distKm) {
  const avgSpeed = Number(process.env.AVERAGE_CITY_SPEED_KMPH || 24);
  if (distKm === null || distKm === undefined) return null;
  const hours = distKm / avgSpeed;
  return Math.max(3, Math.round(hours * 60));
}

function isNightTime(date = new Date()) {
  const hour = date.getHours();
  return hour >= 22 || hour < 6;
}

/** Compute estimated price for a service given distance + pricing rule. */
function computePrice({ basePrice, pricePerKm = 0, distKm = 0, surgeMultiplier = 1, nightMultiplier = 1, minFare = 0 }) {
  const raw = (basePrice + pricePerKm * (distKm || 0)) * surgeMultiplier * nightMultiplier;
  const final = Math.max(raw, minFare || 0);
  return Math.round(final);
}

function generateOtpCode(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min)));
}

let requestCounter = 0;
function generateRequestNumber() {
  requestCounter += 1;
  const year = new Date().getFullYear();
  const seq = String(Date.now()).slice(-6) + String(requestCounter % 100).padStart(2, '0');
  return `SOS-${year}-${seq}`;
}

module.exports = {
  newId,
  distanceKm,
  estimateEtaMinutes,
  isNightTime,
  computePrice,
  generateOtpCode,
  generateRequestNumber,
};
