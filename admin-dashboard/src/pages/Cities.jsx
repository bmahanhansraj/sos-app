import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker } from 'react-leaflet';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BeaconBadge from '../components/BeaconBadge';

const EMPTY_FORM = { name: '', stateName: '', code: '', centerLat: null, centerLng: null, radiusKm: 15 };

export default function Cities() {
  const [cities, setCities] = useState([]);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(EMPTY_FORM);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editRadius, setEditRadius] = useState('');

  const { isSuperAdmin } = useAuth();

  async function load() {
    try {
      const { data } = await api.get('/catalog/cities');
      setCities(data.cities);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, []);

  // Searchable place lookup: fires only once the admin has typed at least 3
  // characters, and debounced so we send one request per pause in typing
  // rather than one per keystroke.
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/admin/catalog/place-search', { params: { q: query.trim() } });
        setResults(data.places);
        setWarning(data.warning || '');
      } catch (err) {
        setError(apiErrorMessage(err));
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  function pickPlace(p) {
    setForm({
      name: p.name,
      stateName: p.state || '',
      code: p.name.slice(0, 3).toUpperCase(),
      centerLat: p.lat,
      centerLng: p.lng,
      radiusKm: 15,
    });
    setResults([]);
    setQuery('');
  }

  async function createCity(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/catalog/cities', {
        name: form.name,
        stateName: form.stateName || undefined,
        code: form.code,
        centerLat: form.centerLat ?? undefined,
        centerLng: form.centerLng ?? undefined,
        radiusKm: form.radiusKm ? Number(form.radiusKm) : undefined,
      });
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function startEditRadius(c) {
    setEditingId(c.id);
    setEditRadius(c.radiusKm ?? '');
  }

  async function saveRadius(c) {
    setSaving(true);
    try {
      await api.patch(`/admin/catalog/cities/${c.id}`, { radiusKm: editRadius ? Number(editRadius) : undefined });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const hasPreview = form.centerLat != null && form.centerLng != null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Cities &amp; service areas</h1>
        <p className="mt-1 text-sm text-muted">
          Add a city by searching for it, then set a service-area radius &mdash; the geofence partners and
          requests are matched within.
        </p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {warning && <p className="text-sm text-muted">{warning}</p>}

      {isSuperAdmin && (
        <div className="panel grid grid-cols-1 gap-5 p-5 lg:grid-cols-2">
          <form onSubmit={createCity} className="space-y-3">
            <div className="relative">
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Search for a city or area</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type at least 3 letters..."
                className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm outline-none focus:border-live"
              />
              {query.trim().length >= 3 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-hairline bg-panel shadow-lg">
                  {searching ? (
                    <p className="px-3 py-2 text-xs text-muted">Searching...</p>
                  ) : results.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted">No matches &mdash; you can still fill the fields in below by hand.</p>
                  ) : (
                    results.map((p, i) => (
                      <button
                        type="button"
                        key={`${p.lat}-${p.lng}-${i}`}
                        onClick={() => pickPlace(p)}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-panel-raised"
                      >
                        {p.label}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">City name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm outline-none focus:border-live" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Code</label>
                <input required maxLength={10} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm font-mono outline-none focus:border-live" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">State (optional)</label>
              <input value={form.stateName} onChange={(e) => setForm({ ...form, stateName: e.target.value })} className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm outline-none focus:border-live" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Latitude</label>
                <input type="number" step="0.0001" value={form.centerLat ?? ''} onChange={(e) => setForm({ ...form, centerLat: e.target.value ? Number(e.target.value) : null })} placeholder="Pick from search" className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm outline-none focus:border-live" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Longitude</label>
                <input type="number" step="0.0001" value={form.centerLng ?? ''} onChange={(e) => setForm({ ...form, centerLng: e.target.value ? Number(e.target.value) : null })} placeholder="Pick from search" className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm outline-none focus:border-live" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-muted">Radius (km)</label>
                <input type="number" min="1" max="200" value={form.radiusKm} onChange={(e) => setForm({ ...form, radiusKm: e.target.value })} className="w-full rounded-lg border border-hairline bg-panel-raised px-3 py-2 text-sm outline-none focus:border-live" />
              </div>
            </div>

            <button type="submit" disabled={saving} className="rounded-lg bg-beacon px-4 py-2 text-sm font-medium text-void disabled:opacity-50">
              {saving ? 'Adding...' : 'Add city'}
            </button>
          </form>

          <div className="overflow-hidden rounded-xl border border-hairline" style={{ height: 320 }}>
            {hasPreview ? (
              <MapContainer key={`${form.centerLat}-${form.centerLng}`} center={[form.centerLat, form.centerLng]} zoom={10} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[form.centerLat, form.centerLng]} />
                <Circle center={[form.centerLat, form.centerLng]} radius={(Number(form.radiusKm) || 0) * 1000} pathOptions={{ color: '#FFC107', fillColor: '#FFC107', fillOpacity: 0.15 }} />
              </MapContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Search for a place to preview its service-area geofence here.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Center</th>
              <th className="px-4 py-3">Service radius</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {cities.map((c) => (
              <tr key={c.id} className="border-b border-hairline last:border-0">
                <td className="px-4 py-3">{c.name}{c.stateName && <span className="text-muted"> &middot; {c.stateName}</span>}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{c.code}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted">{c.centerLat != null ? `${c.centerLat.toFixed(3)}, ${c.centerLng.toFixed(3)}` : '—'}</td>
                <td className="px-4 py-3">
                  {isSuperAdmin && editingId === c.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" max="200" value={editRadius} onChange={(e) => setEditRadius(e.target.value)} className="w-20 rounded-lg border border-hairline bg-panel-raised px-2 py-1 text-sm outline-none focus:border-live" />
                      <button onClick={() => saveRadius(c)} disabled={saving} className="text-xs text-beacon hover:underline">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-muted hover:text-ink">Cancel</button>
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      {c.radiusKm ? `${c.radiusKm} km` : 'Not set'}
                      {isSuperAdmin && (
                        <button onClick={() => startEditRadius(c)} className="text-xs text-muted hover:text-ink">Edit</button>
                      )}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3"><BeaconBadge status={c.isActive ? 'ACTIVE' : 'SUSPENDED'} /></td>
              </tr>
            ))}
            {cities.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted">No cities yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
