// ============================================================================
// Google Maps integration adapter
// ----------------------------------------------------------------------------
// Used for: turn-by-turn navigation links, accurate road-distance/ETA, and
// reverse geocoding (lat/lng -> human readable address).
//
// If GOOGLE_MAPS_SERVER_KEY is not set, distance/ETA falls back to a
// straight-line Haversine calculation (see `src/utils/helpers.js`) which is
// what the rest of this backend already uses for partner matching & pricing
// -- so the app is fully functional without a Maps API key. Reverse
// geocoding falls back to returning the raw coordinates as the "address".
// ============================================================================

const { distanceKm, estimateEtaMinutes } = require('../utils/helpers');

const isMock = () => !process.env.GOOGLE_MAPS_SERVER_KEY;

async function getDistanceAndEta(origin, destination) {
  if (isMock()) {
    const dist = distanceKm(origin.lat, origin.lng, destination.lat, destination.lng);
    return { distanceKm: dist, etaMinutes: estimateEtaMinutes(dist), source: 'haversine-fallback' };
  }

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', `${origin.lat},${origin.lng}`);
  url.searchParams.set('destinations', `${destination.lat},${destination.lng}`);
  url.searchParams.set('key', process.env.GOOGLE_MAPS_SERVER_KEY);

  const resp = await fetch(url.toString());
  const data = await resp.json();
  const element = data?.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') {
    const dist = distanceKm(origin.lat, origin.lng, destination.lat, destination.lng);
    return { distanceKm: dist, etaMinutes: estimateEtaMinutes(dist), source: 'haversine-fallback' };
  }
  return {
    distanceKm: Math.round((element.distance.value / 1000) * 100) / 100,
    etaMinutes: Math.round(element.duration.value / 60),
    source: 'google-distance-matrix',
  };
}

async function reverseGeocode(lat, lng) {
  if (isMock()) {
    return { address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, source: 'coords-fallback' };
  }
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${lat},${lng}`);
  url.searchParams.set('key', process.env.GOOGLE_MAPS_SERVER_KEY);
  const resp = await fetch(url.toString());
  const data = await resp.json();
  const result = data?.results?.[0];
  return { address: result?.formatted_address || `${lat}, ${lng}`, source: 'google-geocoding' };
}

function navigationDeepLink(destLat, destLng) {
  // Works for both Google Maps app (Android/iOS) and web fallback.
  return `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
}

module.exports = { getDistanceAndEta, reverseGeocode, navigationDeepLink, isMock };
