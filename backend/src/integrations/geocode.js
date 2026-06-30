// ============================================================================
// Place search integration (Photon, by komoot)
// ----------------------------------------------------------------------------
// Used by the admin dashboard's "Add City / Service Area" search-as-you-type
// box. We specifically use Photon rather than Nominatim's raw /search
// endpoint here: Nominatim's usage policy explicitly forbids building
// autocomplete on top of it ("This is not yet supported by Nominatim and you
// must not implement such a service on the client side using the API" --
// https://operations.osmfoundation.org/policies/nominatim/). Photon is a
// separate, free, OSM-data-backed geocoder built by komoot specifically for
// this use case, with no API key required.
//
// The free public demo instance asks callers to keep request volume
// reasonable, so the frontend debounces keystrokes and only fires a search
// once the admin has typed at least 3 characters.
// ============================================================================

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';

/**
 * Search for a place by name. Returns a simplified list of candidates with
 * a display label and coordinates, ready for the frontend to render as
 * suggestions and to use directly once one is picked.
 */
async function searchPlaces(query, { limit = 6 } = {}) {
  if (!query || query.trim().length < 3) return [];

  const url = `${PHOTON_ENDPOINT}?q=${encodeURIComponent(query.trim())}&limit=${limit}&lang=en`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'SoS-ServicesOnSite-AdminDashboard/1.0 (city geofencing lookup)' },
  });
  if (!resp.ok) throw new Error(`Photon search failed with status ${resp.status}`);

  const geojson = await resp.json();
  return (geojson.features || []).map((f) => {
    const p = f.properties || {};
    const [lng, lat] = f.geometry?.coordinates || [null, null];
    const labelParts = [p.name, p.city, p.state, p.country].filter((part, idx, arr) => part && arr.indexOf(part) === idx);
    return {
      label: labelParts.join(', '),
      name: p.name || p.city || query,
      state: p.state || null,
      country: p.country || null,
      lat,
      lng,
    };
  }).filter((p) => p.lat !== null && p.lng !== null);
}

module.exports = { searchPlaces };
