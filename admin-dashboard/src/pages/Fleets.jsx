import { useEffect, useState, Fragment } from 'react';
import { api, apiErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import BeaconBadge from '../components/BeaconBadge';

export default function Fleets() {
  const [agencies, setAgencies] = useState([]);
  const [cities, setCities] = useState([]);
  const [partners, setPartners] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAgency, setNewAgency] = useState({ name: '', phone: '', registrationNumber: '', cityId: '' });

  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', cityId: '', status: 'ACTIVE' });
  const [saving, setSaving] = useState(false);

  const { isSuperAdmin } = useAuth();

  async function load() {
    try {
      const [a, c, p] = await Promise.all([api.get('/admin/agencies'), api.get('/catalog/cities'), api.get('/admin/partners')]);
      setAgencies(a.data.agencies);
      setCities(c.data.cities);
      setPartners(p.data.partners);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, []);

  const cityNameById = Object.fromEntries(cities.map((c) => [c.id, c.name]));

  async function createAgency(e) {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/admin/agencies', {
        name: newAgency.name.trim(),
        phone: newAgency.phone.trim(),
        registrationNumber: newAgency.registrationNumber.trim() || undefined,
        cityId: newAgency.cityId || undefined,
      });
      setNewAgency({ name: '', phone: '', registrationNumber: '', cityId: '' });
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  function openEdit(a) {
    setEditing(a);
    setEditForm({ name: a.name, cityId: a.cityId || '', status: a.status });
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await api.patch(`/admin/agencies/${editing.id}`, {
        name: editForm.name,
        cityId: editForm.cityId || null,
        status: editForm.status,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Fleets</h1>
          <p className="mt-1 text-sm text-muted">Fleet partner agencies and the partners riding under each one.</p>
        </div>
        {isSuperAdmin && (
          <button onClick={() => setShowCreate((v) => !v)} className="rounded-lg bg-beacon px-3.5 py-2 text-sm font-medium text-void">
            {showCreate ? 'Cancel' : '+ New fleet'}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {showCreate && isSuperAdmin && (
        <form onSubmit={createAgency} className="panel grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
          <input required value={newAgency.name} onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })} placeholder="Fleet / agency name" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
          <input required value={newAgency.phone} onChange={(e) => setNewAgency({ ...newAgency, phone: e.target.value })} placeholder="+919876543210" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
          <input value={newAgency.registrationNumber} onChange={(e) => setNewAgency({ ...newAgency, registrationNumber: e.target.value })} placeholder="Registration number" className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live" />
          <select value={newAgency.cityId} onChange={(e) => setNewAgency({ ...newAgency, cityId: e.target.value })} className="rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live">
            <option value="">City (optional)</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button type="submit" disabled={creating} className="rounded-lg bg-beacon px-3 py-2 text-sm font-medium text-void disabled:opacity-50">
            {creating ? 'Creating...' : 'Create fleet'}
          </button>
        </form>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-hairline text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Fleet</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Registration</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Partners</th>
              <th className="px-4 py-3">Status</th>
              {isSuperAdmin && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {agencies.map((a) => {
              const fleetPartners = partners.filter((p) => p.agencyId === a.id);
              const isOpen = expanded === a.id;
              return (
                <Fragment key={a.id}>
                  <tr className="border-b border-hairline last:border-0 hover:bg-panel-raised">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted">{a.user?.phone}</td>
                    <td className="px-4 py-3 text-muted">{a.registrationNumber || '—'}</td>
                    <td className="px-4 py-3 text-muted">{cityNameById[a.cityId] || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpanded(isOpen ? null : a.id)}
                        className="rounded-full bg-beacon/15 px-2 py-0.5 text-xs font-medium text-beacon hover:bg-beacon/25"
                      >
                        {a.partnerCount} partner{a.partnerCount === 1 ? '' : 's'} {isOpen ? '▲' : '▼'}
                      </button>
                    </td>
                    <td className="px-4 py-3"><BeaconBadge status={a.status} /></td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(a)} className="rounded-lg border border-hairline px-2.5 py-1.5 text-xs text-muted hover:text-ink">
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-hairline bg-panel-raised/40 last:border-0">
                      <td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-3">
                        {fleetPartners.length === 0 ? (
                          <p className="text-xs text-muted">No partners assigned to this fleet yet &mdash; assign one from the Partners page.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {fleetPartners.map((p) => (
                              <span key={p.id} className="rounded-full border border-hairline px-2.5 py-1 text-xs">
                                {p.user?.name || 'Unnamed'} <span className="text-muted">&middot; {p.vehicleType.replaceAll('_', ' ')}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {agencies.length === 0 && (
              <tr><td colSpan={isSuperAdmin ? 7 : 6} className="px-4 py-8 text-center text-sm text-muted">No fleet partners onboarded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-20 flex justify-end bg-black/50" onClick={() => setEditing(null)}>
          <div className="h-full w-full max-w-md overflow-y-auto bg-panel p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4">
              <p className="text-xs text-muted">Edit fleet</p>
              <h2 className="mt-1 font-display text-lg font-semibold">{editing.name}</h2>
              <p className="font-mono text-xs text-muted">{editing.user?.phone}</p>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="mb-1 block text-xs text-muted">Fleet name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">City</label>
                <select
                  value={editForm.cityId}
                  onChange={(e) => setEditForm({ ...editForm, cityId: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                >
                  <option value="">Unassigned</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border border-hairline bg-panel-raised px-2.5 py-2 text-sm outline-none focus:border-live"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="flex-1 rounded-lg bg-beacon px-3 py-2 text-sm font-medium text-void disabled:opacity-50">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button onClick={() => setEditing(null)} className="rounded-lg border border-hairline px-3 py-2 text-sm text-muted hover:text-ink">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
